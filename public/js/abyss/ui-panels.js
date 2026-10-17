import {
  el,
  button,
  field,
  labeledSelect,
  numberField,
  rangeField,
  checkbox,
  section,
} from "./ui.js";

export function createAutoPanel({ handlers }) {
  const autoSection = section("自動発射設定", true);
  const autoCount = numberField("追加で発射する玉数", {
    value: 100,
    min: 1,
    max: 1000,
    onChange: handlers.onCount,
  });
  const autoRate = rangeField("発射間隔（秒）", {
    value: 0.35,
    min: 0.1,
    max: 2,
    step: 0.05,
    onChange: handlers.onInterval,
  });
  autoSection.body.append(
    autoCount.node,
    autoRate.node,
    el(
      "p",
      "abyss-note",
      "自動発射中も実際の物理計算を続けます。停止は「一時停止」。発射数・残玉・同時玉数の上限を守ります。",
    ),
  );
  return { autoSection };
}

export function createViewPanel({ reduceMotion, handlers }) {
  const view = section("カメラ・表示・サウンド");
  view.body.append(
    labeledSelect(
      "カメラ",
      [
        ["auto", "クルーン進入で自動ズーム"],
        ["overview", "盤面全体"],
        ["follow", "最深部の玉を追う"],
        ["rail", "発射レール"],
        ["forest", "釘の流路"],
        ["gate", "入口ゲート"],
        ["cradle1", "1段目の皿"],
        ["cradle2", "2段目の皿"],
        ["cradle3", "3段目の皿"],
        ["free", "自由に拡大・移動"],
      ],
      "auto",
      handlers.onCamera,
    ),
  );
  const zoomRange = rangeField("ズーム", {
    value: 1,
    min: 1,
    max: 2.5,
    step: 0.1,
    onChange: handlers.onZoom,
  });
  view.body.append(
    zoomRange.node,
    checkbox("盤面を指で拡大・移動する", false, handlers.onTouch).node,
  );
  view.body.append(
    button("表示位置をリセット", handlers.onResetView, "button secondary"),
  );
  view.body.append(
    button("全画面表示", handlers.onFullscreen, "button secondary"),
  );
  view.body.append(
    labeledSelect(
      "描画品質",
      [
        ["auto", "自動（スマホは高精細）"],
        ["high", "高品質（画面密度を優先）"],
        ["low", "省電力（解像度を下げる）"],
      ],
      "auto",
      handlers.onQuality,
    ),
  );
  const motion = checkbox(
    "動き・点滅を減らす",
    reduceMotion,
    handlers.onMotion,
  );
  view.body.append(
    motion.node,
    el(
      "p",
      "abyss-note",
      "動きを減らす設定では自動ズームを止めます。皿1〜3は手動で拡大できます。",
    ),
  );
  const heat = checkbox("通過密度ヒートマップ", false, handlers.onHeatmap);
  view.body.append(
    heat.node,
    labeledSelect(
      "ヒートマップの種類",
      [
        ["density", "玉の通過密度"],
        ["stalled", "低速で滞留した領域"],
        ["pins", "釘への衝突回数"],
        ["outflow", "回収口への流入"],
      ],
      "density",
      handlers.onHeatmapMode,
    ),
    el(
      "p",
      "abyss-note",
      "色は青→黄→赤の順に少→多。選択した層の最大値を基準に表示します。",
    ),
    checkbox("軌跡・成功ルートを重ねる", false, handlers.onTrails).node,
  );
  const sound = checkbox("音を鳴らす（初期は切）", false, handlers.onSound);
  sound.input.id = "bonus-sound";
  view.body.append(sound.node);
  for (const [group, label, value] of [
    ["master", "全体音量", 0.5],
    ["effects", "金属音・効果音", 0.7],
    ["ambience", "回転音・環境音", 0.2],
  ])
    view.body.append(
      rangeField(label, {
        value,
        min: 0,
        max: 1,
        step: 0.05,
        onChange: (v) => handlers.onVolume(group, v),
      }).node,
    );
  return { view, zoomRange, motion, heat, sound };
}

export function createLabPanel({ configInputs, handlers }) {
  const settings = section("検証 / 盤面設定"),
    configGrid = el("div", "abyss-settings-grid");
  for (const [key, label, value, min, max, step] of [
    ["gravity", "重力（m/s²）", 9.80665, 1, 15, 0.01],
    ["restitution", "反発係数", 0.68, 0, 0.9, 0.01],
    ["friction", "接触摩擦", 0.18, 0.01, 1, 0.01],
    ["fireInterval", "発射間隔（秒）", 0.6, 0.1, 3, 0.05],
    ["launchVariance", "発射速度のばらつき（比率）", 0.012, 0, 0.1, 0.001],
    ["gatePeriod", "ゲート周期（秒）", 3, 0.5, 15, 0.1],
    ["gateOpenDuration", "ゲート開放（秒）", 2, 0.15, 12, 0.05],
    ["holeScale", "穴サイズ倍率", 1, 0.7, 1.3, 0.05],
    ["cradleOrientation","皿の向き（度）",0,-180,360,5],
    ["cradleTilt","皿の傾斜",.1,0,.15,.005],
    ["cradleFriction","皿の摩擦",.025,.005,.05,.001],
  ]) {
    const f = numberField(label, { value, min, max, step });
    configInputs[key] = f.input;
    configGrid.append(f.node);
  }
  const pinPreset = labeledSelect(
    "釘配置プリセット",
    [
      ["default", "標準の流路"],
      ["left", "左寄りの流路"],
      ["right", "右寄りの流路"],
    ],
    "default",
  );
  configGrid.append(pinPreset);
  const pinIndex = numberField("編集する釘番号（0〜153）", {
      value: 0,
      min: 0,
      max:153,
      onChange: handlers.onPinSelect,
    }),
    pinDX = numberField("釘の左右調整（mm）", {
      value: 0,
      min: -6,
      max: 6,
      step: 0.5,
    }),
    pinDY = numberField("釘の上下調整（mm）", {
      value: 0,
      min: -6,
      max: 6,
      step: 0.5,
    });
  configGrid.append(
    pinIndex.node,
    pinDX.node,
    pinDY.node,
    button("この釘の位置を設定へ反映", handlers.onPinApply, "button secondary"),
  );
  settings.body.append(
    el(
      "p",
      "abyss-note",
      "玉は直径11mm・質量5.5g。盤面・皿は未実測のオリジナル仮設計です。Rapierの3D接触計算で進みます。検証モードは検証用の別記録です。設定適用で新しいセッションを開始します。円形釘の角度には物理的な意味がないため、位置を調整します。回転盤の可動範囲を避けた配置です。釘の調整値は自動補正しません。",
    ),
    configGrid,
    button("設定を適用して開始", handlers.onApply, "button"),
    button("設定を初期値に戻す", handlers.onReset, "button secondary"),
  );
  return { settings, pinPreset, pinIndex, pinDX, pinDY };
}

export function createDebugPanel({ handlers }) {
  const debugPanel = section("検証 / 関門から開始する検証");
  const testStage = labeledSelect(
    "確認する段",
    [
      [0, "釘の盤面"],
      [1, "1段目"],
      [2, "2段目"],
      [3, "3段目"],
    ],
    "1",
  );
  debugPanel.body.append(
    button("検証として新規開始", handlers.onStart, "button secondary"),
    testStage,
    el(
      "p",
      "abyss-note",
      "当落を後から変更せず、指定した穴や縁に検証用の玉を置きます。通常のスコア記録と区別します。",
    ),
  );
  for (const [label, outcome] of [
    ["皿の縁から投入", "natural"],
    ["当たり穴で落下を確認", "win"],
    ["外れ穴で落下を確認", "miss"],
  ])
    debugPanel.body.append(
      button(label, () => handlers.onDrop(outcome), "button secondary"),
    );
  debugPanel.body.append(
    button("残り玉を0にする", handlers.onEmpty, "button secondary"),
  );
  return { debugPanel, testStage };
}

export function createResearchPanel({
  startResearch,
  exportResearch,
  handlers,
}) {
  const research = section("確率分析 / 大量試行", true);
  const trialCount = labeledSelect(
    "試行数",
    [
      [1000, "1,000"],
      [10000, "10,000"],
      [100000, "100,000"],
      [1000000, "1,000,000"],
    ],
    "1000",
  );
  const researchMode = labeledSelect(
    "計算方式",
    [
      ["approximate", "高速近似（仮定した確率）"],
      ["physics", "実物理（同じ盤面・計算時間大）"],
    ],
    "approximate",
  );
  const researchStatus = el(
    "p",
    "abyss-note",
    "近似：釘1/100・羽1/5・皿1/3, 1/4, 1/5を独立と仮定。実物理の実測値ではありません。",
  );
  researchStatus.setAttribute("role", "status");
  const researchTable = el("div");
  research.body.append(
    trialCount,
    researchMode,
    researchStatus,
    button("試行を開始", startResearch, "button"),
    button("試行を一時停止／再開", handlers.onPause, "button secondary"),
    button("試行を中止", handlers.onCancel, "quiet-button"),
    researchTable,
    button("研究結果をCSV出力", exportResearch, "button secondary"),
  );
  return { research, trialCount, researchMode, researchStatus, researchTable };
}

export function createTelemetry({ left, values }) {
  left.append(el("p", "abyss-kicker", "プレイの記録"));
  const stats = el("dl", "bonus-stats abyss-stats");
  for (const [key, label] of [
    ["remaining", "残り玉"],
    ["fired", "発射数"],
    ["score", "スコア"],
    ["elapsed", "経過時間"],
    ["jackpots", "大当たり"],
    ["lost", "回収数"],
  ]) {
    const cell = el("div");
    values[key] = el("dd", "", key === "remaining" ? "100" : "0");
    values[key].id = `bonus-${key}`;
    cell.append(el("dt", "", label), values[key]);
    stats.append(cell);
  }
  left.append(stats);
  const current = el("p", "bonus-current abyss-current", "STANDBY / 発射待機");
  current.id = "bonus-current";
  const passes = el("div", "abyss-passes");
  for (let i = 1; i <= 3; i++) {
    const line = el("div"),
      n = el("strong", "", "0");
    n.id = `bonus-pass-${i}`;
    line.append(el("span", "", `${i}段目`), n);
    passes.append(line);
  }
  left.append(current, passes);
  const status = el(
    "p",
    "bonus-message abyss-message",
    "「チャレンジ開始」で、盤面が動き始めます。",
  );
  status.id = "bonus-message";
  status.setAttribute("role", "status");
  left.append(status);
  const log = el("ol", "abyss-log");
  left.append(el("p", "abyss-kicker", "RECENT SIGNALS"), log);
  const table = el("div", "abyss-statistics");
  const analytics = section("突破率・接触・滞留時間");
  analytics.body.append(table);
  left.append(analytics.node);
  const contacts = el("p", "abyss-note"),
    dwell = el("p", "abyss-note"),
    distribution = el("p", "abyss-note"),
    angleStats = el("p", "abyss-note"),
    outcomeStats = el("p", "abyss-note");
  analytics.body.append(
    contacts,
    dwell,
    distribution,
    angleStats,
    outcomeStats,
  );
  return {
    stats,
    current,
    passes,
    status,
    log,
    table,
    contacts,
    dwell,
    distribution,
    angleStats,
    outcomeStats,
  };
}

export function createRulesPanel() {
  const rules = section("遊び方・物理モデルの範囲・データについて");
  rules.body.append(
    el(
      "p",
      "",
      "強さを調整し、固定レールから単発または長押しで発射します。散らし釘・道釘・こぼしの流路を抜け、開閉ゲートから固定された3段の皿の金色の穴を目指します。暗い穴は回収口です。3段突破でスコア10,000点、所持ポイント5,000を獲得。所持ポイントは初期1,000、発射成功ごとに10減ります。自動連射と35〜65のランダム威力に対応。傾き操作は警戒度が満ちると6秒休止します。",
    ),
    el(
      "p",
      "",
      "玉径11mm・質量5.5g、重力9.80665m/s²。固定刻みの3D剛体計算で釘・壁・玉・皿に接触します。皿の開口と描画は同じ形状を使い、隠れた当落抽選は行いません。盤面寸法と機構は未実測のオリジナル仮設計で、実機の完全再現ではありません。35秒以上の皿内滞留・60秒以上の進行停滞は保護回収し、結果に含めます。",
    ),
    el(
      "p",
      "",
      "スペース：発射、←→：強さ、P：停止、J/L：左右へ傾ける。画面を離れると自動停止し、戻ったら再開します。盤面は拡大とドラッグ、対応端末ではピンチで位置を調整できます。音は初期は切。動きを減らす設定で追跡・点滅を抑えられます。",
    ),
    el(
      "p",
      "",
      "現金・課金・換金・景品交換はありません。履歴・設定は端末内保存のみ。大量試行の近似結果を実機の当選率とは扱いません。実物理の率も、このモデルと入力条件に限った結果です。",
    ),
  );
  return { rules };
}

export function createPersistencePanel({ loadSelected, handlers }) {
  const persistence = section("保存・読み込み・リプレイ");
  const storageStatus = el(
    "p",
    "abyss-note",
    "記録はこのブラウザのIndexedDBへ保存します。ブラウザのデータ削除で消えます。",
  );
  persistence.body.append(
    storageStatus,
    button(
      "前回の研究・統計結果を開く",
      handlers.onResearchLoad,
      "button secondary",
    ),
    button("設定を保存", handlers.onSettingsSave, "button secondary"),
    button("盤面プリセットを保存", handlers.onPresetSave, "button secondary"),
  );
  const saved = labeledSelect("保存した記録", [], "");
  persistence.body.append(
    saved,
    button("選んだ記録を読み込む", loadSelected, "button secondary"),
  );
  const replayButtons = el("div", "abyss-inline-actions");
  replayButtons.append(
    button("リプレイ再生／停止", handlers.onReplayToggle, "button secondary"),
    button("1コマ進める", handlers.onReplayStep, "button secondary"),
  );
  persistence.body.append(replayButtons);
  persistence.body.append(
    button("セッションをJSON出力", handlers.onJSONExport, "button secondary"),
    button("統計をCSV出力", handlers.onCSVExport, "button secondary"),
  );
  const importFile = el("input");
  importFile.type = "file";
  importFile.accept = ".json,application/json";
  persistence.body.append(field("JSONを読み込む", importFile));
  return { persistence, saved, importFile, storageStatus };
}

export function createSetupPanel({ params, difficulties, modes, handlers }) {
  const heading = el("header", "abyss-heading");
  heading.append(
    button("← Unity MIXへ戻る", handlers.onBack, "quiet-button"),
    el("div", "abyss-brand", "Unity MIX  /  おまけの遊技室"),
    el("h1", "", "喫茶・銀環"),
    el("p", "abyss-tagline", "深淵へ、一球。"),
    el(
      "p",
      "abyss-intro",
      "釘の森、二つの回転搬送盤、開閉する入口、三段の皿。一玉の軌道を見守る。",
    ),
  );
  const setup = el("div", "bonus-setup abyss-setup");
  const tutorial=el("ol","cafe-tutorial");
  for(const text of ["強さを変えて、釘と回転搬送盤を抜ける道を探します。","入口が開いたら三段の皿へ。金色の穴が次の段につながります。","自動連射・ランダム威力も選べます。傾きは警戒度に注意。所持ポイントは換金できません。"]){tutorial.append(el("li","",text));}
  setup.append(tutorial);
  const difficulty = labeledSelect(
    "盤面の難易度",
    difficulties,
    "easy",
    handlers.onDifficulty,
  );
  const modeSelect = labeledSelect(
    "プレイモード",
    modes,
    "normal",
    handlers.onMode,
  );
  const seed = el("input");
  seed.value = params.get("seed") || "abyss";
  seed.maxLength = 64;
  const start = button("チャレンジ開始", handlers.startGame, "button");
  setup.append(
    difficulty,
    modeSelect,
    field("再現用シード", seed),
    start,
    el(
      "p",
      "abyss-note",
      "登録・ルーム不要 / 100玉 / ゲーム内スコアのみ。練習で機構を知り、通常・深淵で挑戦できます。",
    ),
  );
  return { heading, setup, difficulty, modeSelect, seed, start };
}

export function createMachinePanel({ WIDTH, HEIGHT, center }) {
  const machine = el("div", "bonus-machine abyss-machine"),
    canvas = el("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  canvas.tabIndex = 0;
  canvas.setAttribute("role", "img");
  canvas.setAttribute(
    "aria-label",
    "釘の道筋、開閉ゲート、3段の固定皿。金色の穴が成功、暗い穴が回収口。",
  );
  machine.append(canvas);
  const renderBadge = el("p", "abyss-render-badge", "立体描画を準備中");
  const machineTop = el("div", "abyss-machine-top");
  machineTop.append(el("span", "", "PHYSICAL CHAMBER"), renderBadge);
  center.append(machineTop, machine);
  const machineBottom = el("div", "abyss-machine-bottom");
  machineBottom.append(
    el("span", "", "釘の森"),
    el("span", "", "開閉入口"),
    el("span", "", "三段の皿"),
  );
  center.append(machineBottom);
  return { machine, canvas, renderBadge };
}

export function createLaunchPanel({
  power,
  angle,
  modes,
  mode,
  right,
  setPower,
  getPower,
  fire,
  togglePause,
  handlers,
}) {
  const dock = el("div", "abyss-dock");
  const powerRange = rangeField("発射の強さ", {
    value: power,
    min: 1,
    onChange: (v) => setPower(v),
  });
  powerRange.input.id = "abyss-power";
  const powerRow = el("div", "bonus-strength abyss-strength");
  const minus = button("−", () => setPower(getPower() - 5), "button secondary");
  minus.setAttribute("aria-label", "強さを下げる");
  const plus = button("＋", () => setPower(getPower() + 5), "button secondary");
  plus.setAttribute("aria-label", "強さを上げる");
  powerRow.append(minus, powerRange.node, plus);
  const shotActions = el("div", "bonus-shot-actions");
  const single = button("1球発射", () => fire(), "button"),
    hold = button("長押しで連続発射", () => {}, "button secondary");
  hold.className += " bonus-hold";
  hold.setAttribute("aria-label", "押している間に連続発射");
  hold.setAttribute("aria-pressed", "false");
  shotActions.append(single, hold);
  dock.append(powerRow, shotActions);
  const pause = button("一時停止", togglePause, "button secondary"),
    quit = button("ここで終了", handlers.onQuit, "quiet-button");
  const actions = el("div", "bonus-pause-actions");
  actions.append(pause, quit);
  right.append(el("p", "abyss-kicker", "発射操作"), dock, actions);
  const speed = rangeField("時間倍率", {
    value: 1,
    min: 0.25,
    max: 2,
    step: 0.25,
    onChange: handlers.onSpeed,
  });
  right.append(speed.node);
  const angleField = rangeField("発射方向（固定・度）", {
    value: angle,
    min: -100,
    max: -80,
    onChange: handlers.onAngle,
  });
  right.append(angleField.node);
  const liveMode = labeledSelect("プレイモード", modes, mode, handlers.onMode);
  right.append(liveMode);
  return {
    dock,
    powerRange,
    minus,
    plus,
    single,
    hold,
    pause,
    quit,
    speed,
    angleField,
    liveMode,
  };
}
