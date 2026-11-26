import { POUR_HEIGHTS, cupNotes, milkProfile, readRecipe } from './barista-profile.js';
import { bindCafeMusic } from './cafe-music.js';
import { createCafeSound } from './cafe-sound.js';
import { loadCafeMaterials } from './cafe-ware.js';
import { ChocolateDrawing, liquidContains } from './drawing.js';
import { readDraft, writeDraft } from './draft.js';
import { createCanvasFallback } from './fallback-cup.js';
import { DEFAULT_POUR_RATE, MilkPour } from './milk-pour.js';
import { PourInput } from './pour-input.js';
import { createSurface } from './surface.js';
import { bindActivation } from './touch-activation.js';

const $ = id => document.getElementById(id);
const introDuration = 3000 + Math.floor(Math.random() * 2001);
$('studioLoader').style.setProperty('--intro-duration', `${introDuration}ms`);
const cafeSound = createCafeSound();
bindCafeMusic({
  button: $('musicButton'),
  track: $('cafeMusic'),
  slider: $('musicVolume'),
  readout: $('musicVolumeValue'),
  status: $('musicStatus'),
});
const POUR_INPUT_BUFFER_MS = 1000 / 30;
const CUP_MODULE_WAIT_MS = 1000;
const CUP_RENDER_HEADROOM_MS = 1500;
const POUR_HINT = 'ピッチャーを液面へドラッグ。または液面を長押し。';
const drawing = new ChocolateDrawing();
let draftStorage;
try { draftStorage = window.sessionStorage; } catch { /* Storage may be disabled. */ }
const draft = readDraft(draftStorage);
drawing.strokes = draft.strokes;
let recipe = draft.recipe ?? null;
let pourHeight = draft.pourHeight ?? null;
const milk = new MilkPour(draft.milk, milkProfile(recipe));
milk.setSpoutHeightCm(pourHeight);
if (draft.stage === 'draw' || milk.amount || drawing.strokes.length) {
  $('loadingHint').textContent = '作りかけの一杯を復元中…';
}
const pourInput = new PourInput(milk);
const surface = createSurface(milk);
// Retain the original rim clipping of artwork made on the old fixed plane.
surface.fixedLevel = draft.volumeSurface === false || (draft.volumeSurface === undefined && draft.strokes.length > 0);
let firstFrameReady = false;
let controlsReady = false;
let introDeadline;
let revealTimer;

function showLoadingPhase(phase) {
  $('studio').dataset.loadPhase = String(phase);
  $('loadingProgress').setAttribute('aria-valuenow', phase);
}

showLoadingPhase(2);
requestAnimationFrame(() => {
  $('studioLoader').dataset.intro = 'playing';
  introDeadline = performance.now() + introDuration;
  scheduleReveal();
});

function revealStudio() {
  firstFrameReady = true;
  scheduleReveal();
}

function scheduleReveal() {
  if (!introDeadline || !firstFrameReady || !controlsReady) return;
  clearTimeout(revealTimer);
  revealTimer = setTimeout(finishIntro, Math.max(0, Math.ceil(introDeadline - performance.now())));
}

function finishIntro() {
  showLoadingPhase(3);
  $('studio').removeAttribute('aria-busy');
  $('studioLoader').setAttribute('aria-hidden', 'true');
  $('hud').inert = false;
}

async function loadCup() {
  const canvas = $('scene');
  const fallback = $('fallback');
  let timer;
  let materials;
  try {
    const deadline = new Promise(resolve => { timer = setTimeout(resolve, CUP_MODULE_WAIT_MS, null); });
    const sceneModule = Promise.race([import('./cup-scene.js'), deadline]).catch(() => null);
    const [module, decoded] = await Promise.all([sceneModule, loadCafeMaterials()]);
    materials = decoded;
    if (module && (!introDeadline || performance.now() <= introDeadline - CUP_RENDER_HEADROOM_MS)) {
      return module.createCupScene(canvas, fallback, $('ink'), $('pourStill'), $('pourSurface'), surface, revealStudio, materials);
    }
  } catch {
    // A blocked module or unavailable graphics context can use the same drawing tools in 2D.
  } finally {
    clearTimeout(timer);
  }
  const cup = createCanvasFallback(canvas, fallback, surface, { materials });
  revealStudio();
  return cup;
}

const cup = await loadCup();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let stage = draft.stage;
let mode = stage;
let pourRate = DEFAULT_POUR_RATE;
let pourPointerId = null;
let lastPourTouch = null;
let pitcherPickup = null;
let pitcherOffset = null;
let pourFrame = 0;
let drawPointerId = null;
let servingTimer = 0;
let returnStage = 'draw';
let photoFile = null;
let photoUrl = '';
let sharingFile = null;
let resultCycle = 0;
let cachedPhoto = null;
let photoRevision = 0;
let draftTimer = 0;
let draftDirty = false;
let savedMilkRevision = -1;
let savedMilk;
let prepCleanup;
let prepRequest = 0;
let preparedRecipe = null;
let prepStyles;

function flushDraft() {
  clearTimeout(draftTimer);
  if (!draftDirty) return;
  draftDirty = false;
  if (savedMilkRevision !== milk.revision) {
    savedMilk = milk.snapshot();
    savedMilkRevision = milk.revision;
  }
  writeDraft(draftStorage, {
    stage, milk: savedMilk, strokes: drawing.strokes, volumeSurface: !surface.fixedLevel,
    ...(recipe ? { recipe } : {}), ...(pourHeight ? { pourHeight } : {}),
  });
}

function queueDraft() {
  if (!draftStorage) return;
  draftDirty = true;
  clearTimeout(draftTimer);
  if (!drawing.strokes.length) {
    flushDraft();
    return;
  }
  draftTimer = setTimeout(() => {
    if (drawing.activeStroke) queueDraft();
    else flushDraft();
  }, 180);
}

function invalidatePhoto() {
  cachedPhoto = null;
  photoRevision++;
}

function redraw() {
  cup.setArtwork(drawing.strokes, drawing.activeStroke);
}

function updateToolbar(message) {
  $('undo').disabled = $('clear').disabled = drawing.strokes.length === 0;
  if (message) $('status').textContent = message;
}

function closeMenus() {
  $('menuButton').setAttribute('aria-expanded', 'false');
  $('menu').hidden = true;
  $('widthButton').setAttribute('aria-expanded', 'false');
  $('widthPanel').hidden = true;
}

function releaseCapturedPointers() {
  const captured = [drawPointerId, pourPointerId];
  drawPointerId = pourPointerId = null;
  lastPourTouch = null;
  pitcherPickup = pitcherOffset = null;
  $('pourAim').hidden = true;
  for (const id of captured) {
    if (id !== null && cup.input.hasPointerCapture(id)) cup.input.releasePointerCapture(id);
  }
}

function setMode(next, animate = false) {
  if (mode === 'pour' && next !== 'pour') settlePour();
  mode = next;
  $('studio').dataset.stage = next;
  closeMenus();
  if (drawing.activeStroke) queueDraft();
  drawing.cancel();
  releaseCapturedPointers();
  $('hud').hidden = next === 'serve';
  $('serving').hidden = next !== 'serve';
  $('pourControls').hidden = $('pourGuide').hidden = $('resetMilk').hidden = $('next').hidden = next !== 'pour';
  $('showDraw').hidden = next !== 'pour';
  $('drawControls').hidden = next !== 'draw';
  $('tip').textContent = next === 'pour'
    ? POUR_HINT
    : '泡に触れて一滴。指を動かして一筆。';
  const label = next === 'pour' ? 'ピッチャーを動かすか、液面を押してミルクを注ぐ' : 'カップの液面に指でチョコを描く';
  $('scene').setAttribute('aria-label', label);
  $('fallback').setAttribute('aria-label', label);
  cup.setMode(next, animate);
  if (next === 'pour') presentPour();
  else redraw();
  updateToolbar();
  const nextStage = next === 'serve' ? 'draw' : next;
  if (stage !== nextStage) {
    stage = nextStage;
    queueDraft();
  }
}

function setButtonAvailability(button, available) {
  const disabled = String(!available);
  if (button.getAttribute('aria-disabled') !== disabled) button.setAttribute('aria-disabled', disabled);
}

function presentPour(paintNow = false) {
  if (!$('prepDialog').open) cafeSound.update({ kind: 'pour', flow: milk.flow });
  const volume = milk.amount >= .05 && milk.amount < 1 ? milk.amount.toFixed(1) : Math.round(milk.amount);
  const amount = `${volume} mL`;
  if ($('poured').value !== amount) $('poured').value = amount;
  const full = milk.full;
  setButtonAvailability($('pourCenter'), pourPointerId === null && !milk.pouring && !full);
  setButtonAvailability($('resetMilk'), milk.amount > 0 || milk.moving);
  const heightHint = pourHeight === 8 ? '高めから細く注ぐと、コーヒーになじみます。'
    : pourHeight === 1 ? '液面近くから注ぐと、白い泡が浮きます。' : POUR_HINT;
  const fullHint = milk.remaining > .01 ? 'カップが満量です。チョコペンで描けます。'
    : 'ピッチャーが空になりました。チョコペンで描けます。';
  const hint = full ? fullHint
    : pourPointerId === null ? heightHint
    : milk.pouring ? '指を動かすと着地点が移動。離すと止まります。' : '液面へ指を動かすと注ぎ始めます。';
  if ($('tip').textContent !== hint) $('tip').textContent = hint;
  const aim = $('pourAim');
  if (!aim.hidden && (full || !isAimingPour())) aim.hidden = true;
  cup.setPour({
    position: milk.toolTarget, impact: milk.streamTarget, flow: milk.flow,
    streamCut: milk.streamCut, streamHead: milk.streamHead,
    resting: milk.resting, amount: milk.amount, pitcherOffset,
    heightCm: pourHeight, stockMl: milk.milkMl, remainingMl: milk.remaining,
  }, paintNow);
}

function inputTime(timestamp) {
  const current = performance.now();
  if (!Number.isFinite(timestamp)) return current;
  const relative = timestamp > current + 1000 ? timestamp - performance.timeOrigin : timestamp;
  return relative >= 0 ? Math.min(current, relative) : current;
}

function paintPourFrame(now) {
  pourFrame = 0;
  // Keep two fixed steps open for late pointer samples. Motion events themselves
  // still advance directly to their recorded time and position.
  const inputDelay = pourPointerId !== null && milk.pouring ? POUR_INPUT_BUFFER_MS : 0;
  pourInput.preview(Math.max(0, now - inputDelay), pourRate);
  presentPour(true);
  if (milk.moving) pourFrame = requestAnimationFrame(paintPourFrame);
  else queueDraft();
}

function beginPour(position, duration = 0, timestamp = performance.now()) {
  if (!pourInput.start(position, inputTime(timestamp), duration)) return false;
  invalidatePhoto();
  if (!pourFrame) pourFrame = requestAnimationFrame(paintPourFrame);
  return true;
}

function settlePour() {
  if (!milk.moving && !pourFrame) return;
  pourInput.end(performance.now(), pourRate);
  cancelAnimationFrame(pourFrame);
  pourFrame = 0;
  milk.settle();
  presentPour();
  queueDraft();
}

function penWidth() {
  return 0.008 + Number($('width').value) * 0.0056;
}

function isAimingPour() {
  return milk.pouring && milk.flow <= Math.min(.11, pourRate * .35);
}

function showPourAim(event) {
  const aim = $('pourAim');
  if (!isAimingPour()) {
    aim.hidden = true;
    return;
  }
  const bounds = $('studio').getBoundingClientRect();
  aim.style.left = `${event.clientX - bounds.left}px`;
  aim.style.top = `${event.clientY - bounds.top}px`;
  aim.hidden = false;
}

// Keep native gestures available in the guide, toolbar and saved photo.
for (const name of ['contextmenu', 'selectstart', 'dragstart']) {
  cup.input.addEventListener(name, event => event.preventDefault());
}
cup.input.addEventListener('pointerdown', event => {
  if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
  const point = cup.sample(event);
  closeMenus();
  if (!point) return;
  if (mode === 'draw') {
    if (!drawing.start(event.pointerId, point, penWidth(), undefined, cup.drawingClips)) return;
    invalidatePhoto();
    drawPointerId = event.pointerId;
    updateToolbar();
    redraw();
  } else if (mode === 'pour') {
    if (milk.pouring || milk.full) return;
    // A returning pitcher can overlap the liquid on a quick second press.
    // A press inside the cup always starts a pour, including a stationary hold.
    if (liquidContains(point, cup.pouringClips)) {
      if (!beginPour(point, 0, event.timeStamp)) return;
      pourPointerId = event.pointerId;
      showPourAim(event);
    } else if (cup.hitsPitcher(event)) {
      pourPointerId = event.pointerId;
      pitcherPickup = point;
      presentPour();
    } else return;
    lastPourTouch = { x: event.clientX, y: event.clientY };
  } else {
    return;
  }
  event.preventDefault();
  cup.input.setPointerCapture(event.pointerId);
});

function movedPourTouch(event) {
  return event.clientX !== lastPourTouch?.x || event.clientY !== lastPourTouch?.y;
}

cup.input.addEventListener('pointermove', event => {
  if (mode === 'draw' && event.pointerId === drawPointerId) {
    const events = event.getCoalescedEvents?.();
    const samples = (events?.length ? events : [event]).map(sample => cup.sample(sample));
    if (drawing.move(event.pointerId, samples)) redraw();
  } else if (mode === 'pour' && event.pointerId === pourPointerId) {
    const events = event.getCoalescedEvents?.();
    for (const sample of events?.length ? events : [event]) {
      if (!movedPourTouch(sample)) continue;
      lastPourTouch = { x: sample.clientX, y: sample.clientY };
      const point = cup.sample(sample);
      if (pitcherPickup && point && !milk.pouring) {
        const x = point.x - pitcherPickup.x;
        const y = point.y - pitcherPickup.y;
        const gain = Math.min(1, .9 / (Math.hypot(x, y) || 1));
        pitcherOffset = { x: x * gain, y: y * gain };
      }
      if (pourInput.move(point, inputTime(sample.timeStamp), pourRate, cup.pouringClips)) invalidatePhoto();
    }
    showPourAim(event);
    if (!pourFrame && milk.moving) pourFrame = requestAnimationFrame(paintPourFrame);
    else if (!pourFrame) presentPour();
  }
});

function endGesture(event) {
  if (event.pointerId === drawPointerId) {
    if (event.type === 'pointerup' && drawing.move(event.pointerId, [cup.sample(event)])) redraw();
    drawing.end(event.pointerId);
    drawPointerId = null;
    queueDraft();
  }
  if (event.pointerId === pourPointerId) {
    pourPointerId = null;
    pitcherPickup = pitcherOffset = null;
    $('pourAim').hidden = true;
    // The surface rises under a held finger. Reprojecting an unchanged touch at
    // release would deposit a last sideways streak as though the finger moved.
    const position = event.type === 'pointerup' && movedPourTouch(event) ? cup.sample(event) : null;
    lastPourTouch = null;
    pourInput.end(inputTime(event.timeStamp), pourRate, position, cup.pouringClips);
    if (!milk.moving) {
      presentPour();
      queueDraft();
    }
    else if (!pourFrame) pourFrame = requestAnimationFrame(paintPourFrame);
  }
}

for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  cup.input.addEventListener(name, endGesture);
}
function releaseGesture() {
  if (drawing.activeStroke) queueDraft();
  drawing.cancel();
  releaseCapturedPointers();
  if (mode === 'pour') {
    if (milk.moving || pourFrame) settlePour();
    else presentPour();
  }
  redraw();
}
// A mobile browser can resize its toolbar while the finger is still down.
let layoutWidth = document.documentElement.clientWidth;
window.addEventListener('resize', () => {
  const width = document.documentElement.clientWidth;
  if (width !== layoutWidth) releaseGesture();
  layoutWidth = width;
});
function pauseDrawing() {
  releaseGesture();
  flushDraft();
  cafeSound.update();
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseDrawing();
});
window.addEventListener('pagehide', pauseDrawing);
for (const event of ['webglcontextlost', 'webglcontextrestored']) {
  cup.input.addEventListener(event, () => {
    invalidatePhoto();
    releaseGesture();
  });
}

bindActivation($('menuButton'), () => {
  const open = $('menu').hidden;
  closeMenus();
  $('newCup').hidden = mode === 'pour' && !milk.amount && !recipe;
  $('menu').hidden = !open;
  $('menuButton').setAttribute('aria-expanded', String(open));
});
const soundButton = $('soundButton');
soundButton.hidden = !cafeSound.supported;
soundButton.setAttribute('aria-pressed', String(cafeSound.enabled));
soundButton.addEventListener('click', () => {
  cafeSound.toggle();
  soundButton.setAttribute('aria-pressed', String(cafeSound.enabled));
});
document.addEventListener('pointerdown', cafeSound.unlock, { passive: true, capture: true });
document.addEventListener('keydown', cafeSound.unlock);
bindActivation($('widthButton'), () => {
  const open = $('widthPanel').hidden;
  closeMenus();
  $('widthPanel').hidden = !open;
  $('widthButton').setAttribute('aria-expanded', String(open));
  if (open) $('width').focus({ preventScroll: true });
});
function showPenWidth() {
  const value = Number($('width').value);
  $('widthButton').querySelector('i').style.setProperty('--dot', (5 + value) + 'px');
  $('widthSample').style.setProperty('--line-width', (penWidth() * 132).toFixed(2) + 'px');
  $('width').setAttribute('aria-valuetext', `太さ ${value} / 9`);
}
$('width').addEventListener('input', showPenWidth);
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || ($('widthPanel').hidden && $('menu').hidden)) return;
  const button = $('widthPanel').hidden ? $('menuButton') : $('widthButton');
  closeMenus();
  button.focus();
});
$('showHelp').onclick = () => {
  closeMenus();
  releaseGesture();
  const dialog = $('helpDialog');
  dialog.returnValue = '';
  dialog.showModal();
};
$('helpDialog').addEventListener('close', () => $('menuButton').focus());
for (const id of ['pourGuide', 'drawGuide']) {
  const button = $(id);
  const dialog = $(button.getAttribute('aria-controls'));
  bindActivation(button, () => {
    closeMenus();
    releaseGesture();
    dialog.showModal();
  }, { requireOwnPress: true });
  bindActivation(dialog.querySelector('button'), () => dialog.close(), { requireOwnPress: true });
  dialog.addEventListener('close', () => button.focus({ preventScroll: true }));
}
function openDrawing() {
  if (mode !== 'pour') return;
  setMode('draw');
  $('widthButton').focus({ preventScroll: true });
}
bindActivation($('showDraw'), openDrawing);
bindActivation($('next'), openDrawing, { requireOwnPress: true });
$('tilt').oninput = event => {
  if (milk.moving || pourPointerId !== null) pourInput.advance(inputTime(event?.timeStamp), pourRate);
  pourRate = Number($('tilt').value) / 100;
  const display = pourRate <= .36 ? '細く' : pourRate >= .75 ? 'たっぷり' : 'ふつう';
  $('tiltValue').value = display;
  $('tilt').setAttribute('aria-valuetext', display);
  if (!pourFrame && milk.moving) pourFrame = requestAnimationFrame(paintPourFrame);
};

function syncPourHeight() {
  const value = pourHeight === null ? 'auto' : String(pourHeight);
  $('pourHeights').querySelector(`[value="${value}"]`).checked = true;
}
function setPourHeight(height, timestamp) {
  const nextHeight = POUR_HEIGHTS.includes(height) ? height : null;
  if (nextHeight === pourHeight) return;
  if (milk.moving || pourPointerId !== null) pourInput.advance(inputTime(timestamp), pourRate);
  pourHeight = nextHeight;
  milk.setSpoutHeightCm(nextHeight);
  syncPourHeight();
  presentPour();
  queueDraft();
}
$('pourHeights').addEventListener('change', event => {
  if (event.target.name === 'pourHeight') setPourHeight(Number(event.target.value), event.timeStamp);
});

bindActivation($('pourCenter'), () => {
  if (pourPointerId === null) beginPour({ x: 0, y: 0 }, 630);
});
bindActivation($('resetMilk'), () => {
  if (mode !== 'pour' || (!milk.amount && !milk.moving)) return;
  closeMenus();
  releaseGesture();
  milk.reset();
  invalidatePhoto();
  presentPour(true);
  queueDraft();
  updateToolbar('ミルクを入れ直せます。');
}, { requireOwnPress: true });
bindActivation($('undo'), () => {
  drawing.undo();
  releaseCapturedPointers();
  queueDraft();
  invalidatePhoto();
  redraw();
  updateToolbar('直前の一筆を取り消しました。');
});
bindActivation($('clear'), () => {
  releaseGesture();
  const dialog = $('clearDialog');
  dialog.returnValue = 'cancel';
  dialog.showModal();
});
for (const button of $('clearDialog').querySelectorAll('button')) {
  bindActivation(button, () => $('clearDialog').close(button.value), { requireOwnPress: true });
}
$('clearDialog').addEventListener('close', () => {
  if ($('clearDialog').returnValue === 'clear') {
    drawing.clear();
    queueDraft();
    invalidatePhoto();
    redraw();
    updateToolbar('チョコの線を消しました。');
    $('widthButton').focus();
  } else {
    $('clear').focus();
  }
});

bindActivation($('newCup'), () => {
  closeMenus();
  releaseGesture();
  const dialog = $('newCupDialog');
  dialog.returnValue = 'cancel';
  dialog.showModal();
});
for (const button of $('newCupDialog').querySelectorAll('button')) {
  bindActivation(button, () => $('newCupDialog').close(button.value), { requireOwnPress: true });
}
$('newCupDialog').addEventListener('close', () => {
  if ($('newCupDialog').returnValue === 'restart') {
    resetCup();
    setMode('pour');
    queueDraft();
    $('tilt').focus({ preventScroll: true });
  } else {
    $('menuButton').focus();
  }
});


function loadPrepStyles() {
  prepStyles ??= new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('./barista-prep.css?v=barista-1', import.meta.url);
    link.onload = resolve;
    link.onerror = () => {
      link.remove();
      prepStyles = null;
      reject(new Error('Barista preparation stylesheet unavailable'));
    };
    document.head.append(link);
  });
  return prepStyles;
}

async function openPrep() {
  const dialog = $('prepDialog');
  if (dialog.open) return;
  const request = ++prepRequest;
  preparedRecipe = null;
  const loading = document.createElement('div');
  loading.className = 'prep-loading';
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.textContent = '抽出器具を準備中…';
  const back = document.createElement('button');
  back.className = 'go';
  back.type = 'button';
  back.textContent = '戻る';
  back.onclick = () => dialog.close();
  loading.append(status, back);
  $('prepHost').replaceChildren(loading);
  dialog.showModal();
  try {
    const [{ mountBaristaPrep }] = await Promise.all([import('./barista-prep.js?v=barista-1'), loadPrepStyles()]);
    if (!dialog.open || request !== prepRequest) return;
    prepCleanup = mountBaristaPrep($('prepHost'), {
      onExit: () => dialog.close(),
      onSound: state => cafeSound.update(state),
      onReady: candidate => {
        const next = readRecipe(candidate);
        if (!next || !dialog.open || request !== prepRequest) return;
        preparedRecipe = next;
        dialog.close();
      },
    });
  } catch {
    if (!dialog.open || request !== prepRequest) return;
    $('prepHost').replaceChildren(loading);
    status.textContent = '抽出器具を開けませんでした。戻ると今の一杯から続けられます。';
  }
}
bindActivation($('openBarista'), () => {
  if (mode !== 'pour' && mode !== 'draw') return;
  closeMenus();
  releaseGesture();
  if (!milk.amount && !drawing.strokes.length && !recipe) {
    openPrep();
    return;
  }
  const confirm = $('replaceRecipeDialog');
  confirm.returnValue = 'cancel';
  confirm.showModal();
}, { requireOwnPress: true });
for (const button of $('replaceRecipeDialog').querySelectorAll('button')) {
  bindActivation(button, () => $('replaceRecipeDialog').close(button.value), { requireOwnPress: true });
}
$('replaceRecipeDialog').addEventListener('close', () => {
  if ($('replaceRecipeDialog').returnValue === 'replace') openPrep();
  else $('openBarista').focus({ preventScroll: true });
});
$('prepDialog').addEventListener('close', () => {
  prepRequest++;
  prepCleanup?.();
  cafeSound.update();
  prepCleanup = null;
  $('prepHost').replaceChildren();
  if (preparedRecipe) {
    resetCup(preparedRecipe);
    preparedRecipe = null;
    setMode('pour');
    queueDraft();
    updateToolbar('抽出とスチームが完了しました。高さを選んで注げます。');
    $('tilt').focus({ preventScroll: true });
  } else $('openBarista').focus({ preventScroll: true });
});

function releasePhoto() {
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = '';
  photoFile = null;
}

function showPhoto(file) {
  photoFile = file;
  photoUrl = URL.createObjectURL(file);
  $('preview').src = photoUrl;
  $('preview').hidden = false;
  $('photoLabel').hidden = true;
  $('saveImage').disabled = false;
  $('resultPhoto').setAttribute('aria-busy', 'false');
}

function preparePhoto(cycle) {
  if (cycle !== resultCycle) return;
  if (cachedPhoto) {
    showPhoto(cachedPhoto);
    return;
  }
  const revision = photoRevision;
  function ready(blob) {
    if (cycle !== resultCycle) return;
    if (!blob) {
      $('resultPhoto').setAttribute('aria-busy', 'false');
      $('photoLabel').textContent = '画像を作れませんでした。編集に戻って再度お試しください。';
      return;
    }
    const file = new File([blob], 'unity-latte-art.png', { type: 'image/png' });
    if (revision === photoRevision) cachedPhoto = file;
    showPhoto(file);
  }
  try {
    cup.photo().toBlob(ready, 'image/png');
  } catch {
    ready(null);
  }
}


function updateBrewNote() {
  $('brewNote').hidden = !recipe;
  if (!recipe) return;
  const note = cupNotes(recipe, milk.amount);
  $('noteEspresso').textContent = `${recipe.espressoMl.toFixed(1)} mL`;
  $('noteMilk').textContent = `${Math.round(recipe.temperature)} ℃ · ${Math.round(milk.amount)} mL`;
  $('noteFoam').textContent = note.foamLabel;
  $('brewTip').textContent = note.tip;
}

function finishDrawing() {
  if (mode !== 'draw') return;
  resultCycle++;
  $('saveImage').disabled = true;
  $('saveStatus').textContent = '';
  $('resultPhoto').setAttribute('aria-busy', 'true');
  $('photoLabel').textContent = '画像を準備中…';
  $('photoLabel').hidden = false;
  $('preview').hidden = true;
  $('preview').removeAttribute('src');
  releasePhoto();
  setMode('serve', true);
  if (!reducedMotion.matches) $('serving').focus({ preventScroll: true });
  servingTimer = setTimeout(openResult, reducedMotion.matches ? 0 : 1250);
}

bindActivation($('finish'), finishDrawing, { requireOwnPress: true });

function openResult() {
  if (mode !== 'serve' || $('finishPanel').open) return;
  clearTimeout(servingTimer);
  $('serving').hidden = true;
  updateBrewNote();
  $('finishPanel').showModal();
  $('editAgain').focus({ preventScroll: true });
  // Open the controls before the high-resolution render can block the next tap.
  const cycle = resultCycle;
  requestAnimationFrame(() => requestAnimationFrame(() => preparePhoto(cycle)));
}
bindActivation($('serving'), openResult, { requireOwnPress: true });
$('closeResult').onclick = $('editAgain').onclick = () => $('finishPanel').close();
function returnToEditing() {
  clearTimeout(servingTimer);
  resultCycle++;
  releasePhoto();
  setMode(returnStage);
  $(returnStage === 'pour' ? 'tilt' : 'finish').focus({ preventScroll: true });
  returnStage = 'draw';
}
$('finishPanel').addEventListener('close', returnToEditing);
$('serving').addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  returnToEditing();
});
function resetCup(nextRecipe = null) {
  surface.fixedLevel = false;
  drawing.clear();
  milk.reset();
  recipe = nextRecipe;
  milk.configure(milkProfile(recipe));
  pourHeight = recipe ? 8 : null;
  milk.setSpoutHeightCm(pourHeight);
  syncPourHeight();
  savedMilkRevision = -1;
  invalidatePhoto();
  $('tilt').value = String(DEFAULT_POUR_RATE * 100);
  $('tilt').oninput();
}
$('restart').onclick = () => {
  resetCup();
  returnStage = 'pour';
  $('finishPanel').close();
};
$('saveImage').onclick = async () => {
  const file = photoFile;
  if (!file || sharingFile === file) return;
  $('saveStatus').textContent = '';
  const options = { files: [file], title: 'Unity MIX ラテアート' };
  try {
    if (navigator.share && navigator.canShare?.(options)) {
      sharingFile = file;
      await navigator.share(options);
      return;
    }
  } catch (error) {
    if (error.name === 'AbortError') return;
  } finally {
    if (sharingFile === file) sharingFile = null;
  }
  if (photoFile !== file || !photoUrl) return;
  const link = document.createElement('a');
  link.href = photoUrl;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  $('saveStatus').textContent = 'PNGの保存を開始しました。';
};

syncPourHeight();
setMode(stage);
showPenWidth();
controlsReady = true;
if (firstFrameReady) revealStudio();
