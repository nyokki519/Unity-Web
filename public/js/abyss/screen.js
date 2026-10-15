import {
  createAutoPanel,
  createViewPanel,
  createLabPanel,
  createDebugPanel,
  createResearchPanel,
  createTelemetry,
  createRulesPanel,
  createPersistencePanel,
  createSetupPanel,
  createMachinePanel,
  createLaunchPanel,
} from "./ui-panels.js";
import {
  el,
  button,
  field,
  labeledSelect,
  rangeField,
  download,
  clock,
  renderStatistics,
} from "./ui.js";
import { createSimulation } from "./engine.js";
import { createBoard, WIDTH, HEIGHT } from "./config.js";
// Load WebGL after the accessible screen is mounted; GPU initialization can be slow.
let rendererModule;
const loadRenderer = () =>
  (rendererModule ||= import("./renderer.js").catch((error) => {
    rendererModule = null;
    throw error;
  }));
import { createAudio } from "./audio.js";
import { summarize, toCSV } from "./analysis.js";
import {
  saveRecord,
  loadRecords,
  saveSettings,
  loadSettings,
  exportSession,
  validateImport,
} from "./storage.js";
import { createReplay } from "./replay.js";
const difficulties = [
  ["easy", "EASY / 練習"],
  ["normal", "NORMAL / 通常"],
  ["abyss", "ABYSS / 深淵"],
  ["custom", "CUSTOM / 設定台"],
];
const modes = [
  ["normal", "NORMAL / 手動"],
  ["auto", "AUTO / 自動発射"],
  ["lab", "LAB / 機構研究"],
  ["monte", "MONTE CARLO / 確率分析"],
  ["replay", "REPLAY / 軌跡再生"],
];
export function mountAbyss({ onBack }) {
  const params = new URL(location.href).searchParams,
    debug = params.get("debug") === "1";
  const abort = new AbortController(),
    audio = createAudio();
  const node = el("section", "bonus-screen abyss-screen");
  node.dataset.phase = "setup";
  const listen = (target, type, callback, opts = {}) =>
    target.addEventListener(type, callback, { ...opts, signal: abort.signal });
  let game = null,
    preview = createSimulation(),
    renderer = null,
    rendererGeneration = 0,
    replay = null,
    lastRecord = null,
    held = false,
    destroyed = false,
    raf = 0,
    last = performance.now(),
    lastUpdate = 0,
    lastEvent = 0,
    finishSaved = false;
  const volumes = { master: 0.5, effects: 0.7, ambience: 0.2 };
  let power = 35,
    angle = -90,
    timeScale = 1,
    mode = "normal",
    camera = "auto",
    quality = "auto",
    reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches,
    heatmap = false,
    heatmapMode = "density",
    trails = false;
  let worker = null,
    researchId = 0,
    researchPaused = false,
    researchRunning = false,
    researchRows = [],
    autoTarget = 100,
    autoBaseline = 0,
    autoInterval = 0.6,
    lastAutoTime = -Infinity;
  let pinAdjustments = [],
    selectedPin = -1,
    zoom = 1,
    panX = 0,
    panY = 0;
  const values = {},
    configInputs = {};
  const { heading, setup, difficulty, modeSelect, seed, start } =
    createSetupPanel({
      params,
      difficulties,
      modes,
      handlers: {
        startGame: () => startGame(),
        onBack: () => {
          stopHolding();
          onBack();
        },
        onDifficulty: () => {
          if (!game) refreshPreview();
        },
        onMode: (v) => {
          mode = v;
          applyMode();
        },
      },
    });
  const layout = el("div", "abyss-layout"),
    left = el("aside", "abyss-telemetry"),
    center = el("div", "abyss-center"),
    right = el("aside", "bonus-controls abyss-controls");
  const { machine, canvas, renderBadge } = createMachinePanel({
    WIDTH,
    HEIGHT,
    center,
  });
  const quickViews=el("div","abyss-quick-views");
  quickViews.setAttribute("aria-label","盤面の見方");
  for(const [value,label] of [["auto","自動"],["forest","釘"],["cradle1","皿1"],["cradle2","皿2"],["cradle3","皿3"],["overview","全体"]]){
    const control=button(label,()=>{camera=value;view.body.querySelector('select[aria-label="カメラ"]').value=value;for(const b of quickViews.children)b.setAttribute("aria-pressed",String(b===control));},"button secondary");
    control.setAttribute("aria-pressed",String(camera===value));quickViews.append(control);
  }
  center.append(quickViews);
  const {
    current,
    status,
    log,
    table,
    contacts,
    dwell,
    distribution,
    angleStats,
    outcomeStats,
  } = createTelemetry({ left, values });
  const { powerRange, single, hold, pause, quit, angleField, liveMode } =
    createLaunchPanel({
      power,
      angle,
      modes,
      mode,
      right,
      setPower,
      getPower: () => power,
      fire,
      togglePause,
      handlers: {
        onQuit: () => {
          stopHolding();
          if (replay) {
            replay.pause();
            replay.dispose?.();
            replay = null;
            game = null;
            setup.hidden = false;
            right.hidden = true;
            result.hidden = true;
            node.dataset.phase = "setup";
            refreshPreview();
            return;
          }
          game?.end();
          update();
        },
        onSpeed: (v) => {
          timeScale = v;
        },
        onAngle: (v) => {
          angle = v;
        },
        onMode: (v) => {
          mode = v;
          modeSelect.querySelector("select").value = v;
          autoBaseline = game?.fired || 0;
          applyMode();
        },
      },
    });
  const { autoSection } = createAutoPanel({
    handlers: {
      onCount: (v) => {
        autoTarget = v;
      },
      onInterval: (v) => {
        autoInterval = v;
      },
    },
  });
  angleField.input.disabled = true;
  angleField.input.setAttribute("aria-description", "固定レールに沿って発射します。強さで飛距離を調整します。");
  right.append(autoSection.node);
  const { view, zoomRange, motion } = createViewPanel({
    reduceMotion,
    handlers: {
      onCamera: (v) => {
        camera = v;
      },
      onZoom: (v) => {
        zoom = v;
        renderer?.setView?.({ zoom, panX, panY });
      },
      onTouch: (v) => {
        canvas.style.touchAction = v ? "none" : "pan-y";
      },
      onResetView: () => {
        zoom = 1;
        panX = panY = 0;
        zoomRange.input.value = "1";
        zoomRange.output.textContent = "1";
        renderer?.resetView?.();
      },
      onFullscreen: async () => {
        try {
          if (document.fullscreenElement) await document.exitFullscreen();
          else if (machine.requestFullscreen) await machine.requestFullscreen();
          else message("このブラウザは全画面APIに対応していません。");
        } catch {
          message("全画面にできませんでした。");
        }
      },
      onQuality: (v) => {
        quality = v;
        renderer?.resize();
      },
      onMotion: (v) => {
        reduceMotion = v;
        node.classList.toggle("abyss-reduced", v);
      },
      onHeatmap: (v) => {
        heatmap = v;
      },
      onHeatmapMode: (v) => {
        heatmapMode = v;
      },
      onTrails: (v) => {
        trails = v;
      },
      onSound: async (v) => {
        await audio.setEnabled(v);
      },
      onVolume: (group, v) => {
        volumes[group] = v;
        audio.setVolume(group, v);
      },
    },
  });
  right.append(view.node);
  const { settings, pinPreset, pinIndex, pinDX, pinDY } = createLabPanel({
    configInputs,
    handlers: {
      onPinSelect: (v) => {
        selectedPin = v;
      },
      onPinApply: () => {
        selectedPin = Number(pinIndex.input.value);
        pinAdjustments = pinAdjustments.filter((p) => p.index !== selectedPin);
        pinAdjustments.push({
          index: selectedPin,
          dx: Number(pinDX.input.value) / 1000,
          dy: Number(pinDY.input.value) / 1000,
        });
        message(
          `釘${selectedPin}の位置を設定しました。「設定を適用して開始」で反映します。`,
        );
      },
      onApply: () => {
        difficulty.querySelector("select").value = "custom";
        mode = "lab";
        modeSelect.querySelector("select").value = mode;
        liveMode.querySelector("select").value = mode;
        startGame(true);
      },
      onReset: () => {
        for (const input of Object.values(configInputs))
          input.value = input.defaultValue || input.getAttribute("value") || "";
        resetConfigFields();
        pinAdjustments = [];
        pinPreset.querySelector("select").value = "default";
        message("設定を初期値に戻しました。適用して開始すると反映されます。");
      },
    },
  });
  right.append(settings.node);
  const { debugPanel, testStage } = createDebugPanel({
    handlers: {
      onStart: () => {
        mode = "lab";
        modeSelect.querySelector("select").value = mode;
        startGame();
      },
      onDrop: (outcome) => {
        if (
          game?.debugDrop(Number(testStage.querySelector("select").value), {
            outcome,
          })
        ) {
          message("検証用の玉を投入しました。");
          update();
        } else message("LABモードで開始するか、玉の残数を確認してください。");
      },
      onEmpty: () => {
        game?.debugEmpty();
        update();
      },
    },
  });
  right.append(debugPanel.node);
  const { research, trialCount, researchMode, researchStatus, researchTable } =
    createResearchPanel({
      startResearch,
      exportResearch: () =>
        download(
          "abyss-research.csv",
          toCSV(researchRows),
          "text/csv;charset=utf-8",
        ),
      handlers: {
        onPause: () => {
          if (!worker || !researchRunning) return;
          researchPaused = !researchPaused;
          worker.postMessage({
            type: researchPaused ? "pause" : "resume",
            id: researchId,
          });
          researchStatus.textContent = researchPaused
            ? "試行を一時停止しました。再開できます。"
            : "試行を再開しました。";
        },
        onCancel: () => {
          worker?.postMessage({ type: "cancel", id: researchId });
          researchRunning = false;
          researchStatus.textContent = "試行を中止しました。途中結果です。";
        },
      },
    });
  right.append(research.node);
  const { persistence, saved, importFile, storageStatus } =
    createPersistencePanel({
      loadSelected,
      handlers: {
        onResearchLoad: async () => {
          try {
            const records = await loadRecords("research");
            const record = records.find((r) => Array.isArray(r.rows));
            if (!record) return message("保存された研究結果がありません。");
            researchRows = record.rows;
            renderStatistics(researchTable, researchRows);
            researchStatus.textContent = `保存した結果：${record.label || "実物理セッション"} / 現在の盤面の集計とは別です。`;
            research.node.hidden = false;
            research.node.open = true;
            research.node.scrollIntoView({
              block: "start",
              behavior: "instant",
            });
          } catch {
            message("研究結果を読み込めませんでした。");
          }
        },
        onSettingsSave: async () => {
          try {
            await saveSettings(currentSettings());
            message("設定を端末へ保存しました。");
          } catch {
            message(
              "保存できませんでした。ブラウザの保存設定を確認してください。",
            );
          }
        },
        onPresetSave: async () => {
          try {
            await saveRecord("presets", {
              version: 2,
              physicsVersion: "si-2",
              kind: "preset",
              difficulty: difficultyValue(),
              seed: seed.value,
              config: readConfig(),
            });
            message("盤面プリセットを保存しました。");
            await refreshSaved();
          } catch (e) {
            message(`保存できませんでした：${e.message}`);
          }
        },
        onReplayToggle: () => {
          if (!replay) {
            if (lastRecord) openReplay(lastRecord);
            else message("先にセッションを保存・読み込みしてください。");
            return;
          }
          if (replay.playing) replay.pause();
          else replay.play();
        },
        onReplayStep: () => {
          replay?.pause();
          try {
            replay?.step(1);
          } catch (e) {
            replay?.pause();
            message(`リプレイを停止しました：${e.message}`);
          }
          update();
        },
        onJSONExport: () => {
          if (!game) return message("先にプレイを開始してください。");
          try {
            lastRecord = exportSession(game);
            download("abyss-session.json", JSON.stringify(lastRecord, null, 2));
          } catch (e) {
            message(`リプレイ用には出力できません：${e.message}`);
          }
        },
        onCSVExport: () => {
          if (game)
            download(
              "abyss-statistics.csv",
              toCSV(summarize(game)),
              "text/csv;charset=utf-8",
            );
        },
      },
    });
  listen(importFile, "change", async () => {
    const file = importFile.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024)
      return message("読み込めるJSONは5MBまでです。");
    try {
      const record = validateImport(JSON.parse(await file.text()));
      if (record.kind === "preset") {
        applyPreset(record);
        message("プリセットを読み込みました。設定適用で反映します。");
      } else {
        lastRecord = record;
        openReplay(record);
      }
    } catch (e) {
      message(`読み込みを拒否しました：${e.message}`);
    } finally {
      importFile.value = "";
    }
  });
  right.append(persistence.node);
  const testMark = el(
    "p",
    "bonus-test-mark abyss-test-mark",
    "LAB / 検証用セッション：通常プレイとは別の記録です。",
  );
  testMark.id = "bonus-test-mark";
  testMark.hidden = !debug;
  const result = el("section", "bonus-result abyss-result");
  result.id = "bonus-result";
  result.hidden = true;
  const { rules } = createRulesPanel();
  layout.append(left, center, right);
  node.append(heading, setup, testMark, layout, result, rules.node);
  right.hidden = true;
  let savedRecords = [];
  function message(text) {
    status.textContent = text;
  }
  function difficultyValue() {
    return difficulty.querySelector("select").value;
  }
  function readConfig() {
    const cfg = {};
    for (const [key, input] of Object.entries(configInputs)) {
      if (!key.startsWith("rpm")) cfg[key] = Number(input.value);
    }

    cfg.pinPreset = pinPreset.querySelector("select").value;
    cfg.pinAdjustments = pinAdjustments;
    return cfg;
  }
  function resetConfigFields() {
    const defaults = { gravity: 9.80665, restitution: .68, friction: .18,
      fireInterval: .6, launchVariance: .012, gatePeriod: 3,
      gateOpenDuration: 2, holeScale: 1 };
    for (const [k, v] of Object.entries(defaults))
      configInputs[k].value = String(v);
  }
  function currentSettings() {
    return {
      physicsVersion: "si-2",
      difficulty: difficultyValue(),
      seed: seed.value,
      power,
      angle,
      quality,
      reduceMotion,
      volumes: { ...volumes },
      config: readConfig(),
    };
  }
  function applyPreset(record) {
    if (record.physicsVersion !== "si-2") throw new Error("旧版の盤面設定はSI物理へ変換できません。旧プレイ記録はREPLAYで再生できます。");
    if (record.difficulty)
      difficulty.querySelector("select").value = record.difficulty;
    if (record.seed) seed.value = record.seed;
    const cfg = record.config || {};
    for (const [key, input] of Object.entries(configInputs))
      if (Number.isFinite(cfg[key])) input.value = String(cfg[key]);
    if (Array.isArray(cfg.trayRPM))
      cfg.trayRPM.forEach((v, i) => {
        if (configInputs[`rpm${i}`]) configInputs[`rpm${i}`].value = String(v);
      });
    pinAdjustments = Array.isArray(cfg.pinAdjustments)
      ? cfg.pinAdjustments
      : [];
    if (cfg.pinPreset) pinPreset.querySelector("select").value = cfg.pinPreset;
  }
  function refreshPreview() {
    preview?.dispose?.();
    preview = createSimulation({
      difficulty: difficultyValue(),
      seed: seed.value,
      config: difficultyValue() === "custom" ? readConfig() : undefined,
    });
    setRenderer(preview.board);
  }
  async function setRenderer(board) {
    const generation = ++rendererGeneration;
    start.disabled = true;
    renderBadge.textContent = "描画を準備中…";
    try {
      const { createRenderer } = await loadRenderer();
      if (destroyed || generation !== rendererGeneration) return;
      renderer?.dispose();
      renderer = createRenderer(canvas, board);
      renderer.resize();
      renderBadge.textContent =
        renderer.mode === "webgl" ? "WEBGL / 3D" : "CANVAS / 簡易描画";
      zoom = 1;
      panX = panY = 0;
      start.disabled = false;
    } catch {
      if (destroyed || generation !== rendererGeneration) return;
      renderBadge.textContent = "描画を読み込めませんでした";
      message(
        "描画の読み込みに失敗しました。通信を確認してページを再読み込みしてください。",
      );
    }
  }
  function setPower(value) {
    power = Math.min(100, Math.max(1, Math.round(value)));
    powerRange.input.value = String(power);
    powerRange.output.textContent = String(power);
    powerRange.input.setAttribute("aria-valuetext", String(power));
  }
  function fire() {
    if (replay || !game || mode === "replay") return;
    game.fire(power, angle);
    update();
  }
  function stopHolding() {
    held = false;
    hold.setAttribute("aria-pressed", "false");
  }
  function togglePause() {
    stopHolding();
    if (replay) {
      if (replay.playing) replay.pause();
      else replay.play();
    } else if (game) {
      if (game.status === "paused") game.resume();
      else game.pause();
    }
    last = performance.now();
    update();
  }
  function startGame(custom = false) {
    stopHolding();
    replay?.dispose?.();
    game?.dispose?.();
    replay = null;
    game = createSimulation({
      difficulty: difficultyValue(),
      seed: seed.value || "abyss",
      initialBalls: 100,
      config:
        custom || difficultyValue() === "custom" ? readConfig() : undefined,
      debug: debug || mode === "lab",
    });
    setRenderer(game.board);
    lastEvent = 0;
    last = performance.now();
    finishSaved = false;
    autoBaseline = 0;
    lastAutoTime = -Infinity;
    setup.hidden = true;
    right.hidden = false;
    result.hidden = true;
    applyMode();
    requestAnimationFrame(() => {
      if (!destroyed) renderer?.resize();
    });
    message("強さを調整して、1球発射してください。");
    update();
    if (matchMedia("(max-width:760px)").matches)
      requestAnimationFrame(() => {
        machine.scrollIntoView({ block: "start", behavior: "instant" });
        if (document.activeElement instanceof HTMLElement)
          document.activeElement.blur();
      });
  }
  function applyMode() {
    if (mode === "replay" && game && !replay) {
      game.pause();
      message("REPLAY / 保存した記録またはJSONを読み込んでください。");
    }
    autoSection.node.hidden = mode !== "auto";
    settings.node.hidden = mode !== "lab";
    debugPanel.node.hidden = !(debug || mode === "lab");
    research.node.hidden = mode !== "monte";
    testMark.hidden = !(debug || mode === "lab" || game?.debugUsed);
    if (liveMode.querySelector("select").value !== mode)
      liveMode.querySelector("select").value = mode;
  }
  async function refreshSaved() {
    try {
      const [history, presets] = await Promise.all([
        loadRecords("history"),
        loadRecords("presets"),
      ]);
      if (destroyed) return;
      savedRecords = [...presets, ...history];
      const select = saved.querySelector("select");
      select.replaceChildren();
      savedRecords.forEach((record, i) => {
        const opt = el(
          "option",
          "",
          record.kind === "preset"
            ? `盤面 ${i + 1} / ${record.difficulty}`
            : `プレイ ${i + 1} / ${record.difficulty || "台"} / ${record.seed || ""}`,
        );
        opt.value = String(i);
        select.append(opt);
      });
    } catch {
      storageStatus.textContent =
        "端末保存を利用できません。JSON出力で記録を残せます。";
    }
  }
  function loadSelected() {
    const record = savedRecords[Number(saved.querySelector("select").value)];
    if (!record) return message("保存された記録がありません。");
    try {
      if (record.kind === "preset") {
        applyPreset(record);
        message("プリセットを読み込みました。LABで設定を適用してください。");
      } else openReplay(record);
    } catch (e) {
      message(`記録を開けませんでした：${e.message}`);
    }
  }
  function openReplay(record) {
    stopHolding();
    const nextReplay = createReplay(record);
    replay?.dispose?.();
    game?.dispose?.();
    replay = nextReplay;
    game = replay.game;
    lastRecord = record;
    setRenderer(game.board);
    lastEvent = 0;
    last = performance.now();
    finishSaved = true;
    setup.hidden = true;
    right.hidden = false;
    result.hidden = true;
    mode = "replay";
    modeSelect.querySelector("select").value = mode;
    liveMode.querySelector("select").value = mode;
    applyMode();
    replay.pause();
    message(
      "REPLAY / 入力とシードから再計算します。再生または1コマ進めるを押してください。",
    );
    update();
  }
  function startResearch() {
    try {
      worker?.terminate();
      worker = new Worker(new URL("./research-worker.js", import.meta.url), {
        type: "module",
      });
      const id = ++researchId;
      researchPaused = false;
      researchRunning = true;
      researchRows = [];
      researchStatus.textContent = "計算を開始しています…";
      worker.onmessage = async ({ data }) => {
        if (destroyed || data.id !== researchId) return;
        if (data.type === "error") {
          researchRunning = false;
          researchStatus.textContent = `試行エラー：${data.message || data.error}`;
          return;
        }
        researchRows = data.rows || researchRows;
        researchStatus.textContent = `${data.label || data.mode} / ${Number(data.completed || 0).toLocaleString()} / ${Number(data.total || 0).toLocaleString()} 試行${data.type === "result" ? " / 完了" : data.type === "cancelled" ? " / 中止・途中結果" : ""}${data.timeouts ? ` / 未決着 ${data.timeouts}` : ""}`;
        if (researchRows.length) renderStatistics(researchTable, researchRows);
        if (data.type === "result") {
          researchRunning = false;
          try {
            await saveRecord("research", data);
          } catch {
            researchStatus.textContent += "（端末保存は失敗）";
          }
        }
      };
      worker.onerror = () => {
        researchRunning = false;
        researchStatus.textContent =
          "Workerでエラーが発生しました。試行結果は未確定です。";
      };
      worker.postMessage({
        type: "start",
        id,
        mode: researchMode.querySelector("select").value,
        trials: Number(trialCount.querySelector("select").value),
        seed: seed.value,
        difficulty: difficultyValue(),
        config: difficultyValue() === "custom" ? readConfig() : undefined,
        power,
        angle,
      });
    } catch (e) {
      researchStatus.textContent = `計算を開始できませんでした：${e.message}`;
    }
  }
  function update() {
    if (!game) return;
    node.dataset.phase = replay ? replay.status : game.status;
    for (const [key, value] of Object.entries(values))
      value.textContent =
        key === "elapsed" ? clock(game.elapsed) : String(game[key] ?? 0);
    game.passes.forEach(
      (v, i) =>
        (node.querySelector(`#bonus-pass-${i + 1}`).textContent = String(v)),
    );
    const stage = Math.max(0, ...game.balls.map((b) => b.stage));
    current.textContent = game.balls.length
      ? `${stage ? `CRADLE ${stage}` : "FOREST / GATE"} / ${game.balls.length}球が進行中`
      : "READY / 次の一球を";
    pause.textContent = (replay ? !replay.playing : game.status === "paused")
      ? "再開する"
      : "一時停止";
    pause.disabled = replay ? replay.finished : game.status === "finished";
    single.disabled = hold.disabled =
      mode === "replay" ||
      !!replay ||
      game.status !== "running" ||
      !game.remaining;
    quit.disabled = !replay && game.status === "finished";
    quit.textContent = replay ? "再生を終了" : "ここで終了";
    testMark.hidden = !(debug || mode === "lab" || game.debugUsed);
    renderStatistics(table, summarize(game));
    const c = game.stats?.contacts || {};
    contacts.textContent = `接触：釘 ${c.pin || 0} / 壁 ${c.wall || 0} / 玉 ${c.ball || 0} / ゲート ${c.gate || 0} / 皿縁 ${c.rim || 0}`;
    const st = game.stats || {};
    dwell.textContent = `平均速度 ${st.speedSamples ? (st.speedSum / st.speedSamples).toFixed(1) : "—"} ${game.board.physicsVersion === "si-2" ? "m/s" : "旧版単位/秒"} / 平均滞留：${(
      st.dwellTotals || []
    )
      .slice(0, 4)
      .map(
        (t, i) =>
          `${i ? `${i}段` : "釘"} ${(t / Math.max(1, st.dwellCounts?.[i] || 0)).toFixed(1)}秒`,
      )
      .join("・")}`;
    distribution.textContent = `回収口の流入（左→右20区分）：${(st.outflow || []).join(" / ")}`;
    angleStats.textContent = `発射角別（5度区分・大当たり/発射）：${
      Object.entries(st.angleBins || {})
        .map(([a, v]) => `${a}度 ${v.jackpots}/${v.shots}`)
        .join("・") || "記録なし"
    }`;
    outcomeStats.textContent = game.jackpots
      ? `大当たり1回あたりの発射数（観測値）：${(game.fired / game.jackpots).toFixed(1)}球`
      : "大当たり未観測：平均待ち球数を推定できません。";
    if (game.status === "finished" && result.hidden) {
      stopHolding();
      result.hidden = false;
      try {
        lastRecord = exportSession(game);
      } catch {
        lastRecord = null;
      }
      result.replaceChildren(
        el(
          "p",
          "abyss-kicker",
          game.debugUsed || debug || mode === "lab"
            ? "LAB RESULT"
            : "SESSION COMPLETE",
        ),
        el(
          "h2",
          "",
          game.jackpots ? "深淵を、突破。" : "一球ごとの軌跡を、次へ。",
        ),
        el("p", "bonus-result-score", `${game.score.toLocaleString()} pt`),
        el(
          "p",
          "",
          `発射 ${game.fired} / 大当たり ${game.jackpots} / 回収 ${game.lost} / ${clock(game.elapsed)}`,
        ),
        button(
          "もう一度挑戦",
          () => {
            replay?.dispose?.();
            game?.dispose?.();
            game = null;
            replay = null;
            setup.hidden = false;
            right.hidden = true;
            result.hidden = true;
            node.dataset.phase = "setup";
            refreshPreview();
          },
          "button",
        ),
      );
      if (!finishSaved && lastRecord) {
        finishSaved = true;
        Promise.all([
          saveRecord("history", lastRecord),
          saveRecord("research", {
            kind: "session-statistics",
            label: "実物理セッションの統計",
            seed: game.seed,
            difficulty: game.difficulty,
            rows: summarize(game),
            stats: game.stats,
          }),
        ])
          .then(refreshSaved)
          .catch(() =>
            message(
              "終了しました。履歴保存は失敗しました。JSON出力は利用できます。",
            ),
          );
      }
    }
  }
  const pointers = new Map();
  let gesture = null;
  listen(canvas, "pointerdown", (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.setPointerCapture(e.pointerId);
    if (pointers.size === 2) {
      const a = [...pointers.values()];
      gesture = {
        distance: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y),
        zoom,
      };
    } else gesture = { x: e.clientX, y: e.clientY, panX, panY };
  });
  listen(canvas, "pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2 && gesture?.distance) {
      const a = [...pointers.values()];
      zoom = Math.min(
        2.5,
        Math.max(
          1,
          (gesture.zoom * Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y)) /
            gesture.distance,
        ),
      );
    } else if (zoom > 1) {
      panX +=
        ((e.clientX - prev.x) * WIDTH) / canvas.getBoundingClientRect().width;
      panY +=
        ((e.clientY - prev.y) * HEIGHT) / canvas.getBoundingClientRect().height;
    }
    renderer?.setView?.({ zoom, panX, panY });
  });
  for (const type of ["pointerup", "pointercancel"])
    listen(canvas, type, (e) => {
      pointers.delete(e.pointerId);
      gesture = null;
    });
  listen(
    canvas,
    "wheel",
    (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoom = Math.min(2.5, Math.max(1, zoom - e.deltaY * 0.002));
      renderer?.setView?.({ zoom, panX, panY });
    },
    { passive: false },
  );
  listen(hold, "pointerdown", (e) => {
    if (e.button !== 0 || hold.disabled) return;
    e.preventDefault();
    hold.setPointerCapture(e.pointerId);
    held = true;
    hold.setAttribute("aria-pressed", "true");
    fire();
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    listen(hold, type, stopHolding);
  listen(window, "pointerup", stopHolding);
  listen(hold, "blur", stopHolding);
  listen(hold, "keydown", (e) => {
    if (["Space", "Enter"].includes(e.code) && !e.repeat && !hold.disabled) {
      e.preventDefault();
      held = true;
      hold.setAttribute("aria-pressed", "true");
      fire();
    }
  });
  listen(window, "keyup", (e) => {
    if (["Space", "Enter"].includes(e.code)) {
      if (e.target === hold) e.preventDefault();
      stopHolding();
    }
  });
  listen(node, "keydown", (e) => {
    if (e.target.matches("input,select,textarea,button,a,summary")) return;
    if (e.code === "Space") {
      e.preventDefault();
      if (!e.repeat) fire();
    } else if (e.code === "ArrowLeft") {
      e.preventDefault();
      setPower(power - 5);
    } else if (e.code === "ArrowRight") {
      e.preventDefault();
      setPower(power + 5);
    } else if (e.code === "KeyP") {
      e.preventDefault();
      togglePause();
    }
  });
  function autoPause() {
    stopHolding();
    pointers.clear();
    replay?.pause();
    if (!replay && game?.status === "running") {
      game.pause();
      message("画面を離れたため一時停止しました。「再開する」で続けられます。");
      update();
    }
    if (researchRunning && !researchPaused) {
      researchPaused = true;
      worker?.postMessage({ type: "pause", id: researchId });
      researchStatus.textContent = "画面を離れたため試行を一時停止しました。";
    }
  }
  listen(document, "visibilitychange", () => {
    if (document.hidden) autoPause();
    last = performance.now();
  });
  listen(window, "blur", autoPause);
  listen(window, "pagehide", autoPause);
  listen(window, "resize", () => renderer?.resize());
  let frameCount = 0,
    frameSeconds = 0;
  function frame(now) {
    if (destroyed) return;
    const rawDt = Math.max(0, (now - last) / 1000),
      dt = Math.min(0.05, rawDt);
    last = now;
    if (replay) {
      try {
        replay.setSpeed(timeScale);
        replay.advance(dt);
      } catch (e) {
        replay.pause();
        message(`リプレイを停止しました：${e.message}`);
      }
    } else if (game?.status === "running") {
      if (held) game.fire(power, angle);
      else if (
        mode === "auto" &&
        game.fired - autoBaseline < autoTarget &&
        game.elapsed - lastAutoTime >= autoInterval - 1e-8
      ) {
        if (game.fire(power, angle)) lastAutoTime = game.elapsed;
      }
      game.step(dt * timeScale);
    }
    const active = game || preview;
    renderer?.render(active, {
      quality,
      reducedMotion: reduceMotion,
      camera: reduceMotion ? "overview" : camera,
      heatmap,
      heatmapMode,
      trails,
      selectedPin: mode === "lab" ? selectedPin : -1,
    });
    audio.update(active);
    if (game) {
      for (const event of game.events)
        if (event.id > lastEvent) {
          lastEvent = event.id;
          audio.play(event);
          if (
            ["gate-pass", "hole-win", "hole-miss", "jackpot", "lost", "timeout", "invalid-state"].includes(
              event.type,
            )
          ) {
            const text =
              event.type === "jackpot"
                ? "大当たり / 3段突破！"
                : event.type === "hole-win"
                  ? `${event.stage}段目を突破`
                  : event.type === "hole-miss"
                    ? `${event.stage}段目の回収口へ`
                    : event.type === "gate-pass"
                      ? "可動ゲートを通過"
                      : event.type === "timeout" ? "滞留時間上限のため保護回収" : "玉を回収";
            const li = el("li", "", `${clock(event.at)}  ${text}`);
            log.prepend(li);
            while (log.children.length > 8) log.lastChild.remove();
            if (event.type === "jackpot") {
              message("大当たり！3段突破、10,000点を獲得しました。");
              if (!reduceMotion) {
                machine.classList.remove("abyss-jackpot");
                void machine.offsetWidth;
                machine.classList.add("abyss-jackpot");
              }
            }
          }
        }
      if (now - lastUpdate > 200) {
        lastUpdate = now;
        update();
      }
    }
    frameCount++;
    frameSeconds += rawDt;
    if (frameSeconds > 2) {
      const fps = Math.round(frameCount / frameSeconds);
      renderBadge.textContent = `${renderer?.mode === "webgl" ? "3D" : "簡易描画"} / ${fps} FPS`;
      frameCount = 0;
      frameSeconds = 0;
    }
    raf = requestAnimationFrame(frame);
  }
  setRenderer(preview.board);
  requestAnimationFrame(() => {
    if (!destroyed) renderer?.resize();
  });
  applyMode();
  setPower(power);
  raf = requestAnimationFrame(frame);
  loadSettings()
    .then((value) => {
      if (!value || destroyed || game) return;
      if (value.physicsVersion !== "si-2") { message("旧版設定は保管したまま、SI物理の初期設定で開始します。旧プレイはREPLAYから再生できます。"); return; }
      applyPreset(value);
      if (Number.isFinite(value.power)) setPower(value.power);
      if (Number.isFinite(value.angle)) {
        angle = value.angle;
        angleField.input.value = String(angle);
        angleField.output.textContent = String(angle);
      }
      if (value.volumes)
        for (const [group, v] of Object.entries(value.volumes)) {
          volumes[group] = v;
          audio.setVolume(group, v);
          const label = {
            master: "全体音量",
            effects: "金属音・効果音",
            ambience: "回転音・環境音",
          }[group];
          const input = view.body.querySelector(`input[aria-label="${label}"]`);
          if (input) {
            input.value = String(v);
            input.closest(".abyss-range").querySelector("output").textContent =
              String(v);
          }
        }
      if (value.quality) {
        quality = value.quality;
        view.body.querySelector('select[aria-label="描画品質"]').value =
          quality;
      }
      if (typeof value.reduceMotion === "boolean") {
        reduceMotion = value.reduceMotion;
        motion.input.checked = reduceMotion;
        node.classList.toggle("abyss-reduced", reduceMotion);
      }
      refreshPreview();
    })
    .catch(() => {});
  refreshSaved();
  return {
    node,
    destroy() {
      destroyed = true;
      stopHolding();
      cancelAnimationFrame(raf);
      abort.abort();
      worker?.terminate();
      renderer?.dispose();
      replay?.dispose?.();
      game?.dispose?.();
      preview?.dispose?.();
      audio.destroy();
    },
  };
}
