import { ceramicGlaze, paintCafeMark } from './cafe-ware.js';
import { canvasOf, PHOTO_SIZE } from './surface.js';
import { createWalnutImages } from './walnut.js';
import { drawingFoamClips, PHOTO_FOAM_CLIPS, visibleFoamClips } from './foam-geometry.js';
import { MILK_CAPACITY } from './milk-pour.js';

function paintSpoon(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.rotate(-.065);
  const steel = ctx.createLinearGradient(0, -.15, 0, .15);
  steel.addColorStop(0, '#f4ede4');
  steel.addColorStop(.43, '#d6cfc5');
  steel.addColorStop(.74, '#9b9184');
  steel.addColorStop(1, '#eee5d9');
  ctx.lineCap = 'round';
  ctx.strokeStyle = steel;
  ctx.lineWidth = .07;
  ctx.beginPath();
  ctx.moveTo(-.4, 0);
  ctx.lineTo(.76, 0);
  ctx.stroke();
  ctx.fillStyle = steel;
  ctx.beginPath();
  ctx.ellipse(-.64, 0, .32, .17, 0, 0, Math.PI * 2);
  ctx.fill();
  const well = ctx.createRadialGradient(-.71, .046, .02, -.64, 0, .3);
  well.addColorStop(0, '#f7eee2');
  well.addColorStop(.62, '#a69c8c');
  well.addColorStop(1, '#e7ddd1');
  ctx.fillStyle = well;
  ctx.beginPath();
  ctx.ellipse(-.64, 0, .28, .135, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function paintPitcher(ctx, x, y, scale, { position, flow, streamCut = 0, resting, amount }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const left = (position.x + .18) * (1 - resting) + .48 * resting;
  const top = (.88 * position.y - .65) * (1 - resting) - 1.17 * resting;
  const used = amount / MILK_CAPACITY;
  const angle = .10 * resting + (.25 + .40 * used + .27 * flow) * (1 - resting);
  if (flow > .008) {
    const tipX = left - .12 * Math.cos(angle) - .03 * Math.sin(angle);
    const tipY = top - .12 * Math.sin(angle) + .03 * Math.cos(angle);
    ctx.strokeStyle = '#fff6e4';
    ctx.lineCap = 'round';
    ctx.lineWidth = .043 * Math.sqrt(flow);
    ctx.beginPath();
    const dx = position.x - tipX;
    const dy = .88 * position.y - tipY;
    ctx.moveTo(tipX + dx * streamCut, tipY + dy * streamCut ** 2);
    for (let i = 1; i <= 12; i++) {
      const fraction = streamCut + (1 - streamCut) * i / 12;
      ctx.lineTo(tipX + dx * fraction, tipY + dy * fraction ** 2);
    }
    ctx.stroke();
  }
  ctx.translate(left, top);
  ctx.rotate(angle);
  const steel = ctx.createLinearGradient(-.1, 0, .65, .25);
  steel.addColorStop(0, '#786b5e');
  steel.addColorStop(.22, '#eee7df');
  steel.addColorStop(.52, '#c5b9aa');
  steel.addColorStop(.82, '#9a8d7e');
  steel.addColorStop(1, '#e3d9ce');
  ctx.strokeStyle = steel;
  ctx.lineWidth = .06;
  ctx.beginPath();
  ctx.ellipse(.53, .21, .16, .19, .12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = steel;
  ctx.beginPath();
  ctx.moveTo(-.12, .03);
  ctx.quadraticCurveTo(.06, .12, .02, .25);
  ctx.quadraticCurveTo(.01, .57, .36, .56);
  ctx.quadraticCurveTo(.65, .55, .57, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#685c4c';
  ctx.beginPath();
  ctx.ellipse(.25, .025, .35, .10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = .032;
  ctx.stroke();
  ctx.save();
  ctx.clip();
  ctx.translate(.25, .025 + .06 * used);
  ctx.rotate(-angle);
  ctx.fillStyle = '#f7eddd';
  ctx.beginPath();
  ctx.ellipse(0, 0, .33 - .09 * used, .075, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

function paintChocolatePen(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.rotate(.4);
  ctx.shadowColor = '#20140d67';
  ctx.shadowBlur = scale * .08;
  ctx.shadowOffsetY = scale * .04;
  const wrapper = ctx.createLinearGradient(0, -.13, 0, .13);
  wrapper.addColorStop(0, '#9c725d');
  wrapper.addColorStop(.43, '#c49370');
  wrapper.addColorStop(1, '#62402d');
  ctx.fillStyle = wrapper;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(.39, -.09, .72, -.12);
  ctx.quadraticCurveTo(.78, 0, .71, .12);
  ctx.quadraticCurveTo(.32, .08, 0, 0);
  ctx.fill();
  ctx.restore();
}

export function createCanvasFallback(mainCanvas, canvas, foam, {
  overlay = false, tableImage = createWalnutImages(false).colorCanvas,
} = {}) {
  if (overlay) canvas.classList.add('paint-overlay');
  else {
    mainCanvas.hidden = true;
    canvas.removeAttribute('aria-hidden');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', mainCanvas.getAttribute('aria-label'));
  }
  canvas.hidden = false;
  const context = canvas.getContext('2d');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let mode = 'pour';
  let pourView = { position: { x: 0, y: 0 }, flow: 0, resting: 1, amount: 0 };
  let artwork = { strokes: [], active: null };
  let width = 1;
  let height = 1;
  let ratio = 1;
  let pending = 0;
  const glazeGrain = ceramicGlaze();
  function layout(w, h, view) {
    const widthBlend = Math.max(0, Math.min(1, (w / h - .57) / .23));
    const portrait = view === 'draw' || view === 'pour'
      ? 1 - widthBlend ** 2 * (3 - 2 * widthBlend) : 0;
    return {
      x: w * (view === 'photo' ? .532 : .5 + .121 * portrait),
      y: h * (view === 'photo' ? .439 : .47 - .108 * portrait),
      r: Math.min(w * (view === 'photo' ? .277 : .34 - .022 * portrait), h * .31),
    };
  }
  function paint(ctx, w, h, view) {
    const { x, y, r } = layout(w, h, view);
    ctx.drawImage(tableImage, 136, 56, 240, 400, 0, 0, w, h);
    const backdrop = ctx.createRadialGradient(w * .07, h * .19, 0, w * .07, h * .19, Math.hypot(w, h) * .82);
    backdrop.addColorStop(0, '#ffd8a650');
    backdrop.addColorStop(.45, '#bd754525');
    backdrop.addColorStop(1, '#3b190e60');
    ctx.fillStyle = backdrop;
    ctx.fillRect(0, 0, w, h);
    function ellipse(rx, ry, color, offsetY = 0, offsetX = 0) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x + offsetX, y + offsetY, r * rx, r * ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.shadowColor = '#1c130a80';
    ctx.shadowBlur = r * .15;
    ctx.shadowOffsetX = r * .09;
    ctx.shadowOffsetY = r * .17;
    ellipse(1.58, 1.4, '#c8bfb2', r * .39, -r * .13);
    ctx.restore();
    const saucer = ctx.createRadialGradient(x - .50 * r, y - .24 * r, .34 * r, x - r * .13, y + r * .35, 1.6 * r);
    saucer.addColorStop(0, '#fff2dc');
    saucer.addColorStop(.72, '#e9d6b9');
    saucer.addColorStop(.94, '#bc8a61');
    saucer.addColorStop(1, '#d3b493');
    ellipse(1.58, 1.4, saucer, r * .35, -r * .13);
    paintCafeMark(ctx, x - r * 1.14, y + r * .99, r * .40, '#6b4230');
    ctx.save();
    ctx.fillStyle = '#6b4230';
    ctx.font = `${r * .12}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Unity', x - r * .94, y + r * 1.44);
    ctx.restore();
    ctx.save();
    ctx.shadowColor = '#44392752';
    ctx.shadowOffsetX = r * .04;
    ctx.shadowOffsetY = r * .09;
    ctx.shadowBlur = r * .09;
    ellipse(.91, .77, '#c9c1b5', .20 * r);
    ctx.restore();
    const front = view === 'draw' || view === 'pour';
    const glaze = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    glaze.addColorStop(0, '#fff3df');
    glaze.addColorStop(.56, '#e4ceb0');
    glaze.addColorStop(1, '#b69678');
    ctx.strokeStyle = '#b1a99d';
    ctx.lineWidth = r * .21;
    ctx.beginPath();
    ctx.ellipse(x + r * (front ? -.12 : 1.1), y + r * (front ? 1.04 : .09),
      r * .32, r * .14, front ? -1.27 : .08, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = glaze;
    ctx.lineWidth = r * .165;
    ctx.stroke();
    const body = ctx.createLinearGradient(x - r, y + r * .58, x + r, y + r * 1.16);
    body.addColorStop(0, '#e9d5b7');
    body.addColorStop(.47, '#c6a178');
    body.addColorStop(1, '#947358');
    ellipse(1.028, .872, body, r * .23);
    ellipse(1.068, .935, glaze, r * .085);
    ellipse(1.074, .949, '#c28c60');
    ellipse(1.051, .926, '#f3dfbf');
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y + r * .085, r * 1.068, r * .935, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = .65;
    ctx.drawImage(glazeGrain, x - 1.08 * r, y - r, 2.16 * r, 2.16 * r);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * .88, 0, 0, Math.PI * 2);
    ctx.clip();
    let clips = [];
    if (view === 'photo') clips = PHOTO_FOAM_CLIPS;
    if (view === 'draw') clips = drawingFoamClips(w / h);
    if (view === 'pour') clips = visibleFoamClips('pour', w / h);
    for (const circle of clips) {
      ctx.beginPath();
      ctx.ellipse(x + r * circle.x, y + r * .88 * circle.y, r * circle.radius, r * .88 * circle.radius, 0, 0, Math.PI * 2);
      ctx.clip();
    }
    ctx.drawImage(foam.canvas, x - r, y - r * .88, r * 2, r * 1.76);
    ctx.restore();
    paintCafeMark(ctx, x + r * .24, y + r * .895, r * .16, '#68412b');
    if (view === 'serve' || view === 'photo') paintSpoon(ctx, x, y + r * 1.13, r);
    if (view === 'pour') paintPitcher(ctx, x, y, r, pourView);
    if (view === 'draw') paintChocolatePen(ctx, x + r * .14, y + r * 2, r);
  }
  function draw() {
    const { strokes, active } = artwork;
    foam.paint(strokes, active, mode === 'pour' && !reducedMotion.matches);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    paint(context, width, height, mode);
  }
  function invalidate() {
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = 0;
      draw();
    });
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nextRatio = Math.min(devicePixelRatio || 1, 1.75);
    if (width === rect.width && height === rect.height && ratio === nextRatio) return;
    ({ width, height } = rect);
    ratio = nextRatio;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    draw();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();
  return {
    input: canvas,
    get drawingClips() { return drawingFoamClips(width / height); },
    get pouringClips() { return visibleFoamClips('pour', width / height); },
    setArtwork(strokes, active) {
      artwork = { strokes, active };
      invalidate();
    },
    resize,
    setMode(next) { mode = next; invalidate(); },
    setPour(view, paintNow = false) {
      pourView = view;
      if (mode !== 'pour') return;
      if (paintNow) {
        cancelAnimationFrame(pending);
        pending = 0;
        draw();
      } else invalidate();
    },
    sample(event) {
      const rect = canvas.getBoundingClientRect();
      const { x, y, r } = layout(width, height, mode);
      return { x: (event.clientX - rect.left - x) / r, y: (event.clientY - rect.top - y) / (r * .88) };
    },
    photo() {
      foam.paintPhoto(artwork.strokes);
      const picture = canvasOf(PHOTO_SIZE);
      paint(picture.getContext('2d'), PHOTO_SIZE, PHOTO_SIZE, 'photo');
      return picture;
    },
  };
}
