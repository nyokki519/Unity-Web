import { ChocolateDrawing } from './drawing.js';
import { createCupScene, createSurface } from './cup-scene.js';

const $ = id => document.getElementById(id);
const drawing = new ChocolateDrawing();
const surface = createSurface();
const cup = createCupScene($('scene'), $('fallback'), surface);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let mode = 'draw';
let pourAmount = 0;
let pourPointerId = null;
let drawPointerId = null;
let servingTimer = 0;
let photoFile = null;
let photoUrl = '';
let resultCycle = 0;

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
  mode = next;
  closeMenus();
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
  cup.setPour(value, position);
  redraw();
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
    if (!drawing.start(event.pointerId, point, penWidth())) return;
    drawPointerId = event.pointerId;
    updateToolbar();
    redraw();
  } else if (mode === 'pour') {
    if (Math.hypot(point.x, point.y) > 1.45) return;
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
  }
  if (event.pointerId === pourPointerId) pourPointerId = null;
}

for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  cup.input.addEventListener(name, endGesture);
}
function releaseGesture() {
  drawing.cancel();
  if (drawPointerId !== null && cup.input.hasPointerCapture(drawPointerId)) cup.input.releasePointerCapture(drawPointerId);
  if (pourPointerId !== null && cup.input.hasPointerCapture(pourPointerId)) cup.input.releasePointerCapture(pourPointerId);
  drawPointerId = pourPointerId = null;
  redraw();
}
window.addEventListener('resize', releaseGesture);
cup.input.addEventListener('webglcontextlost', releaseGesture);
cup.input.addEventListener('webglcontextrestored', releaseGesture);

$('menuButton').onclick = () => {
  const open = $('menu').hidden;
  closeMenus();
  $('menu').hidden = !open;
  $('menuButton').setAttribute('aria-expanded', String(open));
};
$('widthButton').onclick = () => {
  const open = $('widthPanel').hidden;
  closeMenus();
  $('widthPanel').hidden = !open;
  $('widthButton').setAttribute('aria-expanded', String(open));
  if (open) $('width').focus({ preventScroll: true });
};
$('width').oninput = () => {
  $('widthButton').querySelector('i').style.setProperty('--dot', (5 + Number($('width').value)) + 'px');
};
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || ($('widthPanel').hidden && $('menu').hidden)) return;
  const button = $('widthPanel').hidden ? $('menuButton') : $('widthButton');
  closeMenus();
  button.focus();
});
$('showHelp').onclick = () => {
  closeMenus();
  $('helpDialog').showModal();
};
$('helpDialog').addEventListener('close', () => $('menuButton').focus());
$('showPour').onclick = () => {
  setMode('pour');
  $('tilt').focus({ preventScroll: true });
};
$('showDraw').onclick = $('next').onclick = () => {
  setMode('draw');
  $('widthButton').focus({ preventScroll: true });
};
$('tilt').oninput = () => updatePour(Number($('tilt').value) / 100);
$('resetPour').onclick = () => {
  $('tilt').value = '0';
  updatePour(0);
};
$('undo').onclick = () => {
  drawing.undo();
  redraw();
  updateToolbar('直前の一筆を取り消しました。');
};
$('clear').onclick = () => {
  const dialog = $('clearDialog');
  dialog.returnValue = 'cancel';
  dialog.showModal();
};
$('clearDialog').addEventListener('close', () => {
  if ($('clearDialog').returnValue === 'clear') {
    drawing.clear();
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

function preparePhoto(cycle) {
  if (cycle !== resultCycle) return;
  function ready(blob) {
    if (cycle !== resultCycle) return;
    $('resultPhoto').setAttribute('aria-busy', 'false');
    if (!blob) {
      $('photoLabel').textContent = '画像を作れませんでした。編集に戻って再度お試しください。';
      return;
    }
    photoFile = new File([blob], 'unity-latte-art.png', { type: 'image/png' });
    photoUrl = URL.createObjectURL(photoFile);
    $('preview').src = photoUrl;
    $('preview').hidden = false;
    $('photoLabel').hidden = true;
    $('saveImage').disabled = false;
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

const finishButton = $('finish');
let finishTouch = null;
finishButton.onclick = finishDrawing;
finishButton.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'touch' || !event.isPrimary) return;
  finishTouch = { id: event.pointerId, x: event.clientX, y: event.clientY };
});
finishButton.addEventListener('pointercancel', () => { finishTouch = null; });
finishButton.addEventListener('pointerup', event => {
  const touch = finishTouch;
  if (touch?.id !== event.pointerId) return;
  finishTouch = null;
  if (Math.hypot(event.clientX - touch.x, event.clientY - touch.y) > 12) return;
  if (!finishButton.contains(document.elementFromPoint(event.clientX, event.clientY))) return;
  // Real taps can lose their synthesized click immediately after a captured canvas drag.
  // Keep keyboard/mouse clicks and let the mode check make both paths safe.
  requestAnimationFrame(finishDrawing);
});

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
$('serving').onclick = openResult;
$('closeResult').onclick = $('editAgain').onclick = () => $('finishPanel').close();
$('finishPanel').addEventListener('close', () => {
  resultCycle++;
  releasePhoto();
  setMode('draw');
  $('finish').focus({ preventScroll: true });
});
$('restart').onclick = () => {
  drawing.clear();
  pourAmount = 0;
  $('tilt').value = '0';
  $('tiltValue').value = '0%';
  $('finishPanel').close();
};
$('saveImage').onclick = async () => {
  const file = photoFile;
  if (!file) return;
  const options = { files: [file], title: 'Unity MIX ラテアート' };
  try {
    if (navigator.share && navigator.canShare?.(options)) {
      await navigator.share(options);
      return;
    }
  } catch (error) {
    if (error.name === 'AbortError') return;
  }
  if (photoFile !== file || !photoUrl) return;
  const link = document.createElement('a');
  link.href = photoUrl;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  $('saveStatus').textContent = 'PNGをダウンロードしました。';
};

setMode('draw');
