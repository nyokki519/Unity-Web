import { canvasOf, PHOTO_SIZE } from './surface.js';
import { createWalnutImages } from './walnut.js';

export function createCanvasFallback(mainCanvas, canvas, foam, {
  overlay = false, tableImage = createWalnutImages(false).colorCanvas,
} = {}) {
  if (overlay) canvas.classList.add('paint-overlay');
  else mainCanvas.hidden = true;
  canvas.hidden = false;
  const context = canvas.getContext('2d');
  let mode = 'draw';
  let pourAim = { x: 0, y: 0 };
  let artwork = { fill: 1, strokes: [] };
  let width = 1;
  let height = 1;
  let ratio = 1;
  function layout(w, h, view) {
    const portrait = view === 'draw' && w < h * .75;
    return {
      x: w * (portrait ? .58 : .5),
      y: h * (portrait ? .355 : view === 'photo' ? .49 : .47),
      r: Math.min(w * (view === 'photo' ? .315 : .34), h * .31),
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
    function ellipse(rx, ry, color, offsetY = 0) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x, y + offsetY, r * rx, r * ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.shadowColor = '#1c130aa0';
    ctx.shadowBlur = r * .20;
    ctx.shadowOffsetX = r * .08;
    ctx.shadowOffsetY = r * .16;
    const saucer = ctx.createRadialGradient(x - .56 * r, y - .48 * r, .22 * r, x, y, 1.6 * r);
    saucer.addColorStop(0, '#fffdf5');
    saucer.addColorStop(.66, '#e8e5df');
    saucer.addColorStop(1, '#b8aea1');
    ellipse(1.50, 1.28, saucer, .13 * r);
    ctx.restore();
    const front = view === 'draw';
    ctx.strokeStyle = '#c9c3b7';
    ctx.lineWidth = r * .17;
    ctx.beginPath();
    ctx.ellipse(x + r * (front ? .46 : 1.09), y + r * (front ? .96 : .09),
      r * .31, r * .19, front ? 1.08 : 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#f4efe6';
    ctx.lineWidth = r * .08;
    ctx.stroke();
    ellipse(1.05, .94, '#c9c0b1', r * .08);
    ellipse(1.055, .934, '#fff7e9');
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * .88, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(foam.canvas, x - r, y - r * .88, r * 2, r * 1.76);
    ctx.restore();
  }
  function draw() {
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    paint(context, width, height, mode);
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    width = rect.width;
    height = rect.height;
    ratio = Math.min(devicePixelRatio || 1, 1.75);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    draw();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();
  return {
    input: canvas,
    setArtwork(fill, strokes, active) {
      artwork = { fill, strokes };
      foam.paint(fill, strokes, active, mode === 'pour' ? pourAim : undefined);
      draw();
    },
    resize,
    setMode(next) { mode = next; draw(); },
    setPour(_fill, point) {
      if (!point) return;
      const length = Math.max(1, Math.hypot(point.x, point.y));
      pourAim = { x: point.x / length, y: point.y / length };
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
