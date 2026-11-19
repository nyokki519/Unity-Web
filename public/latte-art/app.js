import { ChocolateDrawing } from './drawing.js';
import { readDraft, writeDraft } from './draft.js';
import { createCanvasFallback } from './fallback-cup.js';
import { createSurface } from './surface.js';
import { bindActivation } from './touch-activation.js';

const $ = id => document.getElementById(id);
const drawing = new ChocolateDrawing();
let draftStorage;
try { draftStorage = window.sessionStorage; } catch { /* Storage may be disabled. */ }
drawing.strokes = readDraft(draftStorage);
const surface = createSurface();
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
    if (module) return module.createCupScene(canvas, fallback, $('ink'), surface, revealStudio);
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
let mode = 'draw';
let pourAmount = 0;
let pourPointerId = null;
let pourFlowTimer = 0;
let drawPointerId = null;
let servingTimer = 0;
let photoFile = null;
let photoUrl = '';
let sharingFile = null;
let resultCycle = 0;
let cachedPhoto = null;
let photoRevision = 0;
let draftTimer = 0;
let draftDirty = false;

function flushDraft() {
  clearTimeout(draftTimer);
  if (!draftDirty) return;
  draftDirty = false;
  writeDraft(draftStorage, drawing.strokes);
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
  cup.setArtwork(mode === 'pour' ? pourAmount : 1, drawing.strokes, drawing.activeStroke);
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
  clearTimeout(pourFlowTimer);
  mode = next;
  closeMenus();
  if (drawing.activeStroke) queueDraft();
  drawing.cancel();
  drawPointerId = pourPointerId = null;
  $('hud').hidden = next === 'serve';
  $('serving').hidden = next !== 'serve';
  $('pourControls').hidden = $('next').hidden = next !== 'pour';
  $('drawControls').hidden = next !== 'draw';
  $('tip').textContent = next === 'pour'
    ? '量を調整し、カップの上で注ぐ位置を動かします。'
    : '泡に触れて一滴。指を動かして一筆。';
  cup.setMode(next, animate);
  cup.setPour(pourAmount);
  redraw();
  updateToolbar();
}

function updatePour(value, position) {
  pourAmount = value;
  $('tiltValue').value = Math.round(value * 100) + '%';
  cup.setPour(value, position, value > 0);
  redraw();
}

function stopPour() {
  clearTimeout(pourFlowTimer);
  cup.setPour(pourAmount);
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
    if (Math.hypot(point.x, point.y) > 1.45) return;
    clearTimeout(pourFlowTimer);
    pourPointerId = event.pointerId;
    updatePour(pourAmount, point);
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
    const point = cup.sample(event);
    if (point) updatePour(pourAmount, point);
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
    stopPour();
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
  if (mode === 'pour') stopPour();
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
  const dialog = $('helpDialog');
  dialog.returnValue = '';
  dialog.showModal();
};
$('helpDialog').addEventListener('close', event => {
  const action = event.currentTarget.returnValue;
  if (action === 'pour' || action === 'draw') openEditingMode(action);
  else $('menuButton').focus();
});
function openEditingMode(next) {
  setMode(next);
  $(next === 'pour' ? 'tilt' : 'widthButton').focus({ preventScroll: true });
}
$('showPour').onclick = () => openEditingMode('pour');
$('showDraw').onclick = $('next').onclick = () => openEditingMode('draw');
$('tilt').oninput = () => {
  updatePour(Number($('tilt').value) / 100);
  clearTimeout(pourFlowTimer);
  if (pourPointerId === null) pourFlowTimer = setTimeout(stopPour, 270);
};
$('resetPour').onclick = () => {
  clearTimeout(pourFlowTimer);
  $('tilt').value = '0';
  updatePour(0);
};
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
function returnToDrawing() {
  clearTimeout(servingTimer);
  resultCycle++;
  releasePhoto();
  setMode('draw');
  $('finish').focus({ preventScroll: true });
}
$('finishPanel').addEventListener('close', returnToDrawing);
$('serving').addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  returnToDrawing();
});
$('restart').onclick = () => {
  drawing.clear();
  queueDraft();
  invalidatePhoto();
  pourAmount = 0;
  $('tilt').value = '0';
  $('tiltValue').value = '0%';
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

setMode('draw');
showPenWidth();
