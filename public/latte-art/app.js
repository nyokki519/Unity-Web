import { paintCafeMark } from './cafe-ware.js';
import { ChocolateDrawing, liquidContains } from './drawing.js';
import { readDraft, writeDraft } from './draft.js';
import { createCanvasFallback } from './fallback-cup.js';
import { DEFAULT_POUR_RATE, MILK_CAPACITY, MilkPour } from './milk-pour.js';
import { PourInput } from './pour-input.js';
import { createSurface } from './surface.js';
import { bindActivation } from './touch-activation.js';

const $ = id => document.getElementById(id);
paintCafeMark($('cafeMark').getContext('2d'), 0, 0, 96, '#f5d9ad');
const drawing = new ChocolateDrawing();
let draftStorage;
try { draftStorage = window.sessionStorage; } catch { /* Storage may be disabled. */ }
const draft = readDraft(draftStorage);
drawing.strokes = draft.strokes;
const milk = new MilkPour(draft.milk);
const pourInput = new PourInput(milk);
const surface = createSurface(milk);
function revealStudio() {
  $('studio').removeAttribute('aria-busy');
  $('hud').inert = false;
}

async function loadCup() {
  const canvas = $('scene');
  const fallback = $('fallback');
  let timer;
  try {
    const deadline = new Promise(resolve => { timer = setTimeout(resolve, 7000, null); });
    const module = await Promise.race([import('./cup-scene.js'), deadline]);
    if (module) return module.createCupScene(canvas, fallback, $('ink'), $('pourStill'), $('pourSurface'), surface, revealStudio);
  } catch {
    // A blocked module or unavailable graphics context can use the same drawing tools in 2D.
  } finally {
    clearTimeout(timer);
  }
  const cup = createCanvasFallback(canvas, fallback, surface);
  revealStudio();
  return cup;
}

const cup = await loadCup();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let stage = draft.stage;
let mode = stage;
let pourRate = DEFAULT_POUR_RATE;
let pourPointerId = null;
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

function flushDraft() {
  clearTimeout(draftTimer);
  if (!draftDirty) return;
  draftDirty = false;
  if (savedMilkRevision !== milk.revision) {
    savedMilk = milk.snapshot();
    savedMilkRevision = milk.revision;
  }
  writeDraft(draftStorage, { stage, milk: savedMilk, strokes: drawing.strokes });
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

function setMode(next, animate = false) {
  if (mode === 'pour' && next !== 'pour') settlePour();
  mode = next;
  $('studio').dataset.stage = next;
  closeMenus();
  if (drawing.activeStroke) queueDraft();
  drawing.cancel();
  if (pourPointerId !== null && cup.input.hasPointerCapture(pourPointerId)) cup.input.releasePointerCapture(pourPointerId);
  drawPointerId = pourPointerId = null;
  $('hud').hidden = next === 'serve';
  $('serving').hidden = next !== 'serve';
  $('pourControls').hidden = $('next').hidden = next !== 'pour';
  $('showDraw').hidden = next !== 'pour';
  $('drawControls').hidden = next !== 'draw';
  $('tip').textContent = next === 'pour'
    ? '液面を押して注ぎ、そのまま指で位置を動かせます。'
    : '泡に触れて一滴。指を動かして一筆。';
  const label = next === 'pour' ? 'カップの液面を押してミルクを注ぐ' : 'カップの液面に指でチョコを描く';
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

function presentPour(paintNow = false) {
  const amount = `${Math.round(milk.amount)} mL`;
  if ($('poured').value !== amount) $('poured').value = amount;
  const full = milk.amount >= MILK_CAPACITY;
  $('pourCenter').setAttribute('aria-disabled', String(pourPointerId !== null || milk.pouring || full));
  if (full) $('tip').textContent = 'カップが満量です。チョコペンで描けます。';
  cup.setPour({ position: milk.toolTarget, flow: milk.flow, resting: milk.resting, amount: milk.amount }, paintNow);
}

function inputTime(timestamp) {
  const current = performance.now();
  if (!Number.isFinite(timestamp)) return current;
  const relative = timestamp > current + 1000 ? timestamp - performance.timeOrigin : timestamp;
  return relative >= 0 ? Math.min(current, relative) : current;
}

function paintPourFrame(now) {
  pourFrame = 0;
  // Leave one simulation step for coalesced motion events near the display frame.
  const inputDelay = pourPointerId !== null && milk.pouring ? 1000 / 60 : 0;
  pourInput.advance(Math.max(0, now - inputDelay), pourRate);
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
    if (!liquidContains(point, cup.pouringClips) || !beginPour(point, 0, event.timeStamp)) return;
    pourPointerId = event.pointerId;
  } else {
    return;
  }
  cup.input.setPointerCapture(event.pointerId);
});

cup.input.addEventListener('pointermove', event => {
  if (mode === 'draw' && event.pointerId === drawPointerId) {
    const events = event.getCoalescedEvents?.();
    const samples = (events?.length ? events : [event]).map(sample => cup.sample(sample));
    if (drawing.move(event.pointerId, samples)) redraw();
  } else if (mode === 'pour' && event.pointerId === pourPointerId) {
    const events = event.getCoalescedEvents?.();
    for (const sample of events?.length ? events : [event]) {
      const point = cup.sample(sample);
      if (pourInput.move(point, inputTime(sample.timeStamp), pourRate, cup.pouringClips)) invalidatePhoto();
    }
    if (!pourFrame && milk.moving) pourFrame = requestAnimationFrame(paintPourFrame);
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
    const position = event.type === 'pointerup' ? cup.sample(event) : null;
    pourInput.end(inputTime(event.timeStamp), pourRate, position, cup.pouringClips);
    if (!milk.moving) presentPour();
    else if (!pourFrame) pourFrame = requestAnimationFrame(paintPourFrame);
  }
}

for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  cup.input.addEventListener(name, endGesture);
}
function releaseGesture() {
  if (drawing.activeStroke) queueDraft();
  drawing.cancel();
  if (drawPointerId !== null && cup.input.hasPointerCapture(drawPointerId)) cup.input.releasePointerCapture(drawPointerId);
  if (pourPointerId !== null && cup.input.hasPointerCapture(pourPointerId)) cup.input.releasePointerCapture(pourPointerId);
  drawPointerId = pourPointerId = null;
  if (mode === 'pour') settlePour();
  redraw();
}
window.addEventListener('resize', releaseGesture);
function pauseDrawing() {
  releaseGesture();
  flushDraft();
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
  $('newCup').hidden = mode === 'pour' && !milk.amount;
  $('menu').hidden = !open;
  $('menuButton').setAttribute('aria-expanded', String(open));
});
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
function openDrawing() {
  if (mode !== 'pour') return;
  setMode('draw');
  $('widthButton').focus({ preventScroll: true });
}
bindActivation($('showDraw'), openDrawing);
bindActivation($('next'), openDrawing);
$('tilt').oninput = () => {
  if (milk.moving) pourInput.advance(performance.now(), pourRate);
  pourRate = Number($('tilt').value) / 100;
  const display = Math.round(pourRate * 100) + '%';
  $('tiltValue').value = display;
  $('tilt').setAttribute('aria-valuetext', display);
};
bindActivation($('pourCenter'), () => {
  if (pourPointerId === null) beginPour({ x: 0, y: 0 }, 630);
});
bindActivation($('undo'), () => {
  drawing.undo();
  queueDraft();
  invalidatePhoto();
  redraw();
  updateToolbar('直前の一筆を取り消しました。');
});
bindActivation($('clear'), () => {
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
  servingTimer = setTimeout(openResult, reducedMotion.matches ? 0 : 3000);
}

bindActivation($('finish'), finishDrawing);

function openResult() {
  if (mode !== 'serve' || $('finishPanel').open) return;
  clearTimeout(servingTimer);
  $('serving').hidden = true;
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
function resetCup() {
  drawing.clear();
  milk.reset();
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

setMode(stage);
showPenWidth();
