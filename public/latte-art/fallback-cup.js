import { canvasOf, PHOTO_SIZE } from './surface.js';
import { createWalnutImages } from './walnut.js';
import { drawingFoamClips, PHOTO_FOAM_CLIPS } from './foam-geometry.js';

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

function paintPitcher(ctx, x, y, scale, aim, fill, flowing) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const left = 1.05 + .20 * aim.x;
  const top = -.80 + .30 * aim.y;
  if (flowing && fill > .02) {
    ctx.strokeStyle = '#fff6e4';
    ctx.lineCap = 'round';
    ctx.lineWidth = .018 + .026 * fill;
    ctx.beginPath();
    ctx.moveTo(left - .11, top + .065);
    ctx.quadraticCurveTo((left + aim.x) * .52, top + .10, aim.x, .88 * aim.y);
    ctx.stroke();
  }
  ctx.translate(left, top);
  ctx.rotate(.12 + (flowing ? .55 * fill : 0));
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
  ctx.fillStyle = '#f7eddd';
  ctx.beginPath();
  ctx.ellipse(.25, .025, .35, .10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = .032;
  ctx.stroke();
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
  let mode = 'draw';
  let pourAim = { x: 0, y: 0 };
  let pouring = false;
  let artwork = { fill: 1, strokes: [], active: null };
  let width = 1;
  let height = 1;
  let ratio = 1;
  let pending = 0;
  function layout(w, h, view) {
    const widthBlend = Math.max(0, Math.min(1, (w / h - .57) / .23));
    const portrait = view === 'draw' || view === 'pour'
      ? 1 - widthBlend ** 2 * (3 - 2 * widthBlend) : 0;
    return {
      x: w * (view === 'photo' ? .532 : .5 + .104 * portrait),
      y: h * (view === 'photo' ? .439 : .47 - .119 * portrait),
      r: Math.min(w * (view === 'photo' ? .277 : .34), h * .31),
    };
  }
  function paint(ctx, w, h, view) {
    const { x, y, r } = layout(w, h, view);
    ctx.drawImage(tableImage, 136, 56, 240, 400, 0, 0, w, h);
    const backdrop = ctx.createLinearGradient(0, 0, w, h);
    backdrop.addColorStop(0, '#fff1db20');
    backdrop.addColorStop(1, '#24150b35');
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
    saucer.addColorStop(0, '#fffdf5');
    saucer.addColorStop(.72, '#e9e5dd');
    saucer.addColorStop(.91, '#d0c7bb');
    saucer.addColorStop(1, '#f1e9dc');
    ellipse(1.58, 1.4, saucer, r * .35, -r * .13);
    ctx.save();
    ctx.shadowColor = '#44392752';
    ctx.shadowOffsetX = r * .04;
    ctx.shadowOffsetY = r * .09;
    ctx.shadowBlur = r * .09;
    ellipse(.91, .77, '#c9c1b5', .20 * r);
    ctx.restore();
    const front = view === 'draw' || view === 'pour';
    const glaze = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    glaze.addColorStop(0, '#faf6ee');
    glaze.addColorStop(.56, '#f0ece4');
    glaze.addColorStop(1, '#afa598');
    ctx.strokeStyle = '#b1a99d';
    ctx.lineWidth = r * .21;
    ctx.beginPath();
    ctx.ellipse(x + r * (front ? .55 : 1.1), y + r * (front ? .94 : .09),
      r * .32, r * .14, front ? 1 : .08, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = glaze;
    ctx.lineWidth = r * .165;
    ctx.stroke();
    ellipse(1.068, .935, glaze, r * .085);
    ellipse(1.074, .949, '#f8f4eb');
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * .88, 0, 0, Math.PI * 2);
    ctx.clip();
    const clips = view === 'photo' ? PHOTO_FOAM_CLIPS : view === 'draw' ? drawingFoamClips(w / h) : [];
    for (const circle of clips) {
      ctx.beginPath();
      ctx.ellipse(x + r * circle.x, y + r * .88 * circle.y, r * circle.radius, r * .88 * circle.radius, 0, 0, Math.PI * 2);
      ctx.clip();
    }
    ctx.drawImage(foam.canvas, x - r, y - r * .88, r * 2, r * 1.76);
    ctx.restore();
    if (view === 'serve' || view === 'photo') paintSpoon(ctx, x, y + r * 1.13, r);
    if (view === 'pour') paintPitcher(ctx, x, y, r, pourAim, artwork.fill, pouring);
  }
  function draw() {
    const { fill, strokes, active } = artwork;
    foam.paint(fill, strokes, active, mode === 'pour' ? pourAim : undefined);
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
    setArtwork(fill, strokes, active) {
      artwork = { fill, strokes, active };
      invalidate();
    },
    resize,
    setMode(next) { mode = next; invalidate(); },
    setPour(_fill, point = pourAim, flowing = false) {
      const length = Math.max(1, Math.hypot(point.x, point.y));
      pourAim = { x: point.x / length, y: point.y / length };
      pouring = flowing;
      if (mode === 'pour') invalidate();
    },
    sample(event) {
      const rect = canvas.getBoundingClientRect();
      const { x, y, r } = layout(width, height, mode);
      return { x: (event.clientX - rect.left - x) / r, y: (event.clientY - rect.top - y) / (r * .88) };
    },
    photo() {
      foam.paintPhoto(artwork.fill, artwork.strokes);
      const picture = canvasOf(PHOTO_SIZE);
      paint(picture.getContext('2d'), PHOTO_SIZE, PHOTO_SIZE, 'photo');
      return picture;
    },
  };
}
