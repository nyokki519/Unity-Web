import {
  ESPRESSO_DENSITY,
  MAX_STEAM_TEMPERATURE,
  MIN_ESPRESSO_ML,
  MIN_MILK_TEMPERATURE,
  advanceExtraction,
  advanceSteam,
  createExtraction,
  createSteam,
  getPreparedIngredients,
} from './barista-prep-model.js';
import { createBaristaScene } from './barista-prep-scene.js';

const GRIND_NAMES = ['極細挽き', '細挽き', '中細挽き', '中挽き', '粗挽き'];
const WAND_DEPTHS = ['surface', 'air', 'roll', 'deep'];
const DEPTH_HINTS = {
  surface: 'ノズルが浅く、大きな泡ができます。',
  air: '冷たいうちに、液面のすぐ下で1〜2秒空気を含ませます。',
  roll: '少し深く入れて渦を作り、泡を細かくします。55〜65°Cで止めます。',
  deep: '深い位置では渦が弱くなり、ミルクは温まります。',
};
const SHOT_PHASES = { infusion: '蒸らし中', drops: '最初の滴', flow: '抽出中', full: '抽出上限' };

const TEMPLATE = `
  <div class="barista-prep" data-prep-stage="espresso">
    <header class="prep-header">
      <div class="prep-brand">
        <img src="./loading-mark.webp" width="71" height="112" alt="">
        <span>Unity MIX</span>
      </div>
      <button type="button" class="prep-quiet" data-prep="exit">スタジオへ戻る</button>
    </header>
    <nav class="prep-stages" aria-label="準備の手順">
      <button type="button" data-prep="espresso-step" aria-current="step"><span>エスプレッソ</span></button>
      <button type="button" data-prep="steam-step" disabled><span>ミルク</span></button>
      <span class="prep-stage-next">注ぐ</span>
    </nav>
    <div class="prep-workbench">
      <figure class="prep-view">
        <canvas data-prep="scene" aria-hidden="true"></canvas>
        <figcaption class="prep-machine-state" data-prep="machine-state"></figcaption>
        <span class="prep-wand-hint" aria-hidden="true">上下にドラッグでノズルを調整</span>
      </figure>
      <section class="prep-control-card" aria-labelledby="prepStageTitle">
        <div class="prep-section-intro">
          <h1 id="prepStageTitle" tabindex="-1" data-prep="title">エスプレッソを抽出</h1>
          <p data-prep="instruction"></p>
        </div>
        <div data-prep="espresso-panel">
          <dl class="prep-readouts" aria-label="抽出のメーター">
            <div><dt>抽出量</dt><dd data-prep="shot-volume">0.0 mL</dd></div>
            <div><dt>抽出時間</dt><dd data-prep="shot-time">0.0 s</dd></div>
            <div><dt>温度</dt><dd data-prep="shot-temperature">22 °C</dd></div>
          </dl>
          <fieldset class="prep-fields" data-prep="shot-settings" aria-label="抽出の設定">
            <label class="prep-grind" for="prepGrind">挽き目 <output data-prep="grind-value" for="prepGrind">中細挽き</output></label>
            <input type="range" id="prepGrind" data-prep="grind" min="0" max="4" step="1" value="2" aria-valuetext="中細挽き">
            <div class="prep-secondary-fields">
              <label class="prep-dose" for="prepDose">豆の量
                <select id="prepDose" data-prep="dose">
                  <option value="16">16 g</option>
                  <option value="18" selected>18 g</option>
                  <option value="20">20 g</option>
                </select>
              </label>
              <label class="prep-preheat"><input type="checkbox" data-prep="preheat" checked> カップを温める</label>
            </div>
          </fieldset>
          <div class="prep-actions">
            <button type="button" class="prep-primary" data-prep="shot-toggle">抽出を始める</button>
            <button type="button" class="prep-primary" data-prep="to-steam" hidden>ミルクへ進む <span aria-hidden="true">→</span></button>
            <button type="button" class="prep-outline" data-prep="shot-reset" hidden>淹れ直す</button>
          </div>
        </div>
        <div data-prep="steam-panel" hidden>
          <dl class="prep-readouts" aria-label="ミルクのメーター">
            <div><dt>温度</dt><dd data-prep="milk-temperature">5 °C</dd></div>
            <div><dt>泡の割合</dt><dd data-prep="milk-foam">0 %</dd></div>
            <div><dt>泡のきめ</dt><dd data-prep="milk-texture">—</dd></div>
          </dl>
          <fieldset class="prep-fields prep-depth" aria-describedby="prepDepthHint">
            <legend>ノズルの深さ</legend>
            <div class="prep-depth-options">
              <label><input type="radio" name="prep-depth" value="surface"><span>液面</span></label>
              <label><input type="radio" name="prep-depth" value="air" checked><span>空気を入れる</span></label>
              <label><input type="radio" name="prep-depth" value="roll"><span>渦を作る</span></label>
              <label><input type="radio" name="prep-depth" value="deep"><span>深め</span></label>
            </div>
            <p id="prepDepthHint" class="prep-depth-hint" data-prep="depth-hint"></p>
          </fieldset>
          <div class="prep-actions">
            <button type="button" class="prep-primary" data-prep="steam-toggle">スチームを始める</button>
            <button type="button" class="prep-primary" data-prep="ready" hidden>ミルクを注ぐ <span aria-hidden="true">→</span></button>
            <button type="button" class="prep-outline" data-prep="milk-reset" hidden>ミルクを替える</button>
          </div>
        </div>
        <p class="prep-announcement" role="status" data-prep="announcement"></p>
      </section>
    </div>
  </div>`;

function setText(node, value) {
  if (node.textContent !== value) node.textContent = value;
}

function textureLabel(milk) {
  if (milk.foam < 0.018) return '泡なし';
  if (milk.fineness > 0.76 && milk.separation < 0.22) return 'なめらか';
  if (milk.fineness > 0.55 && milk.separation < 0.39) return '細かい';
  return '粗い';
}

export function mountBaristaPrep(host, { onReady, onExit, onSound = () => {} }) {
  const view = host.ownerDocument.defaultView;
  const listeners = new AbortController();
  const { signal } = listeners;
  host.innerHTML = TEMPLATE;
  const layout = host.firstElementChild;
  const ui = Object.fromEntries(Array.from(layout.querySelectorAll('[data-prep]'), element => [element.dataset.prep, element]));
  const paint = createBaristaScene(ui.scene);
  const motion = view.matchMedia('(prefers-reduced-motion: reduce)');
  let stage = 'espresso';
  let shot = createExtraction();
  let milk = createSteam();
  let depth = 'air';
  let running = false;
  let shotStopped = false;
  let milkStopped = false;
  let frame;
  let lastTime;
  let lastReadout = 0;
  let lastPaint = 0;
  let clock = 0;
  let wandGesture;

  function announce(message) {
    setText(ui.announcement, message);
  }

  function draw() {
    paint({ stage, shot, milk, depth, clock, extracting: running && stage === 'espresso', steaming: running && stage === 'steam', reduced: motion.matches });
  }

  function sound(extractionFlow = 0) {
    if (!running) onSound({ kind: 'off' });
    else if (stage === 'espresso') onSound({ kind: 'extract', flow: extractionFlow });
    else onSound({ kind: 'steam', depth, flow: 1, temperature: milk.temperature });
  }

  function updateReadouts() {
    if (stage === 'espresso') {
      setText(ui['shot-volume'], `${shot.volume.toFixed(1)} mL`);
      setText(ui['shot-time'], `${shot.time.toFixed(1)} s`);
      setText(ui['shot-temperature'], `${Math.round(shot.temperature)} °C`);
      const label = running ? SHOT_PHASES[shot.phase] : shotStopped ? '抽出完了' : '抽出待ち';
      setText(ui['machine-state'], label);
    } else {
      setText(ui['milk-temperature'], `${Math.round(milk.temperature)} °C`);
      setText(ui['milk-foam'], `${Math.round(milk.foam * 100)} %`);
      setText(ui['milk-texture'], milk.temperature === 5 ? '—' : textureLabel(milk));
      const label = running ? 'スチーム中' : milkStopped ? 'スチーム停止' : 'スチーム待ち';
      setText(ui['machine-state'], label);
    }
  }

  function updateControls() {
    const espresso = stage === 'espresso';
    const usableShot = shotStopped && shot.volume >= MIN_ESPRESSO_ML;
    const usableMilk = milkStopped && milk.temperature >= MIN_MILK_TEMPERATURE;
    layout.dataset.prepStage = stage;
    layout.dataset.active = String(running);
    ui['espresso-panel'].hidden = !espresso;
    ui['steam-panel'].hidden = espresso;
    ui['espresso-step'].disabled = running;
    ui['steam-step'].disabled = running || !usableShot;
    ui['espresso-step'].toggleAttribute('data-complete', usableShot);
    ui['steam-step'].toggleAttribute('data-complete', usableMilk);
    ui['espresso-step'].setAttribute('aria-current', espresso ? 'step' : 'false');
    ui['steam-step'].setAttribute('aria-current', espresso ? 'false' : 'step');
    ui['shot-settings'].disabled = espresso && (running || shotStopped);
    ui['shot-toggle'].hidden = shotStopped;
    ui['shot-reset'].hidden = !shotStopped;
    ui['to-steam'].hidden = !usableShot;
    ui['steam-toggle'].hidden = milkStopped && (usableMilk || milk.temperature >= MAX_STEAM_TEMPERATURE);
    ui['milk-reset'].hidden = !milkStopped;
    ui.ready.hidden = !usableMilk || !usableShot;
    setText(ui.title, espresso ? 'エスプレッソを抽出' : 'ミルクをスチーム');
    setText(ui['shot-toggle'], running && espresso ? '抽出を止める' : '抽出を始める');
    setText(ui['steam-toggle'], running && !espresso ? 'スチームを止める' : milkStopped ? 'スチームを再開' : 'スチームを始める');
    setText(ui['depth-hint'], DEPTH_HINTS[depth]);
    updateInstruction();
    updateReadouts();
  }

  function updateInstruction() {
    if (stage === 'espresso') {
      const targetMl = Math.round(Number(ui.dose.value) * 2 / ESPRESSO_DENSITY);
      if (!shotStopped) setText(ui.instruction, `抽出量が ${targetMl} mL 前後になったら止めます。`);
      else if (shot.volume < MIN_ESPRESSO_ML) setText(ui.instruction, '量が足りません。淹れ直して、もう少し長く抽出します。');
      else if (shot.quality >= 0.79) setText(ui.instruction, '抽出量が豆の量と釣り合い、クレマが残りました。');
      else if (shot.volume > targetMl * 1.12) setText(ui.instruction, '抽出が長めです。クレマの色が薄くなりました。');
      else if (shot.volume < targetMl * 0.88) setText(ui.instruction, '短めの抽出です。好みの濃さで次へ進めます。');
      else setText(ui.instruction, '抽出量は目安に近づきました。挽き目やカップの温度でもクレマの状態が変わります。');
    } else if (milkStopped && milk.temperature < MIN_MILK_TEMPERATURE) {
      setText(ui.instruction, 'まだ冷たいので、スチームを再開します。');
    } else if (milkStopped && milk.temperature > 65) {
      setText(ui.instruction, '温度が高く、泡とミルクが分かれやすくなりました。');
    } else if (milkStopped) {
      setText(ui.instruction, `ミルクは ${Math.round(milk.milkMl)} mL。温度と泡の状態を引き継いで注ぎます。`);
    } else {
      setText(ui.instruction, '少し空気を入れたあと、渦を作って泡を整えます。');
    }
  }

  function stop() {
    const toggle = stage === 'espresso' ? ui['shot-toggle'] : ui['steam-toggle'];
    const moveFocus = host.ownerDocument.activeElement === toggle;
    running = false;
    sound();
    lastTime = undefined;
    if (frame !== undefined) view.cancelAnimationFrame(frame);
    frame = undefined;
    if (stage === 'espresso') {
      shotStopped = true;
      updateControls();
      announce(`抽出を終了しました。${shot.volume.toFixed(1)} mL。${ui.instruction.textContent}`);
      if (moveFocus) (ui['to-steam'].hidden ? ui['shot-reset'] : ui['to-steam']).focus({ preventScroll: true });
    } else {
      milkStopped = true;
      updateControls();
      announce(`スチームを終了しました。${Math.round(milk.temperature)} 度。${ui.instruction.textContent}`);
      if (moveFocus) (ui.ready.hidden ? ui['steam-toggle'] : ui.ready).focus({ preventScroll: true });
    }
    draw();
  }

  function advanceTo(now) {
    const start = lastTime ?? now;
    now = Math.max(now, start);
    const elapsed = (now - start) / 1000;
    lastTime = now;
    clock += elapsed;
    const previousVolume = shot.volume;
    if (stage === 'espresso') shot = advanceExtraction(shot, elapsed);
    else milk = advanceSteam(milk, elapsed, depth);
    return Math.min(1, (shot.volume - previousVolume) / Math.max(elapsed, .001) / 9);
  }

  function tick(now) {
    frame = undefined;
    const extractionFlow = advanceTo(now);
    if ((stage === 'espresso' && shot.phase === 'full') || (stage === 'steam' && milk.temperature >= MAX_STEAM_TEMPERATURE)) {
      stop();
      return;
    }
    if (now - lastReadout >= 80) {
      lastReadout = now;
      updateReadouts();
      sound(extractionFlow);
    }
    if (now - lastPaint >= 30) {
      lastPaint = now;
      draw();
    }
    frame = view.requestAnimationFrame(tick);
  }

  function start() {
    running = true;
    sound();
    lastReadout = 0;
    lastPaint = 0;
    lastTime = view.performance.now();
    updateControls();
    announce(stage === 'espresso' ? '抽出を始めました。' : 'スチームを始めました。');
    frame = view.requestAnimationFrame(tick);
  }

  function showStage(next) {
    if (stage === next || running || (next === 'steam' && ui['steam-step'].disabled)) return;
    wandGesture = null;
    stage = next;
    announce('');
    updateControls();
    draw();
    ui.title.focus({ preventScroll: true });
  }

  function click(name, callback) {
    ui[name].addEventListener('click', callback, { signal });
  }

  click('exit', onExit);
  click('espresso-step', () => showStage('espresso'));
  click('steam-step', () => showStage('steam'));
  click('to-steam', () => showStage('steam'));
  click('shot-toggle', () => {
    if (running) {
      advanceTo(view.performance.now());
      stop();
      return;
    }
    shot = createExtraction({ grind: Number(ui.grind.value), dose: Number(ui.dose.value), preheat: ui.preheat.checked });
    start();
  });
  click('shot-reset', () => {
    shot = createExtraction();
    shotStopped = false;
    updateControls();
    draw();
    announce('抽出をやり直せます。');
    ui['shot-toggle'].focus({ preventScroll: true });
  });
  click('steam-toggle', () => {
    if (running) {
      advanceTo(view.performance.now());
      stop();
      return;
    }
    milkStopped = false;
    start();
  });
  click('milk-reset', () => {
    milk = createSteam();
    milkStopped = false;
    setDepth('air');
    updateControls();
    draw();
    announce('冷たいミルクに替えました。');
    ui['steam-toggle'].focus({ preventScroll: true });
  });
  click('ready', () => {
    const ingredients = getPreparedIngredients(shot, milk);
    if (!running && shotStopped && milkStopped && ingredients) onReady(ingredients);
  });
  ui.grind.addEventListener('input', () => {
    const label = GRIND_NAMES[Number(ui.grind.value)];
    setText(ui['grind-value'], label);
    ui.grind.setAttribute('aria-valuetext', label);
  }, { signal });
  ui.dose.addEventListener('change', updateInstruction, { signal });
  function setDepth(next) {
    if (depth === next) return;
    if (running) advanceTo(view.performance.now());
    depth = next;
    layout.querySelector(`input[name="prep-depth"][value="${depth}"]`).checked = true;
    setText(ui['depth-hint'], DEPTH_HINTS[depth]);
    if (running) sound();
    draw();
  }
  ui['steam-panel'].addEventListener('change', event => {
    if (event.target.name === 'prep-depth') setDepth(event.target.value);
  }, { signal });
  ui.scene.addEventListener('pointerdown', event => {
    if (stage !== 'steam' || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    ui.scene.setPointerCapture(event.pointerId);
    wandGesture = { id: event.pointerId, startY: event.clientY, initialDepth: WAND_DEPTHS.indexOf(depth) };
  }, { signal });
  ui.scene.addEventListener('pointermove', event => {
    if (event.pointerId !== wandGesture?.id) return;
    const steps = Math.round((event.clientY - wandGesture.startY) / 24);
    const index = Math.min(WAND_DEPTHS.length - 1, Math.max(0, wandGesture.initialDepth + steps));
    setDepth(WAND_DEPTHS[index]);
  }, { signal });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    ui.scene.addEventListener(type, event => {
      if (event.pointerId === wandGesture?.id) wandGesture = null;
    }, { signal });
  }
  ui.scene.addEventListener('contextmenu', event => {
    if (stage === 'steam') event.preventDefault();
  }, { signal });
  host.ownerDocument.addEventListener('visibilitychange', () => {
    if (host.ownerDocument.hidden && running) stop();
    wandGesture = null;
  }, { signal });
  motion.addEventListener('change', draw, { signal });
  const resize = new view.ResizeObserver(draw);
  resize.observe(ui.scene);
  updateControls();
  draw();
  ui.title.focus({ preventScroll: true });
  return () => {
    running = false;
    sound();
    listeners.abort();
    resize.disconnect();
    if (frame !== undefined) view.cancelAnimationFrame(frame);
    layout.remove();
  };
}
