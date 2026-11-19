import { paintChocolate } from './drawing.js';
import { StrokePaintCache } from './stroke-paint-cache.js';

export const PHOTO_SIZE = 1200;
const ART_SIZE = 1024;
const PEN_COLORS = { espresso: '#8b4a29', foam: '#f8eee0' };

export function canvasOf(size) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  return canvas;
}

function randomFrom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function cremaTexture() {
  const size = 256;
  const canvas = canvasOf(size);
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(size, size);
  const random = randomFrom(6529);
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      const x = (column - size / 2) / (size / 2);
      const y = (row - size / 2) / (size / 2);
      const radius = Math.hypot(x, y);
      const flow = Math.atan2(y, x) + 4.5 * radius;
      const ribbons = .5 + .5 * Math.sin(5 * flow + 2.1 * Math.sin(3.6 * radius));
      const streaks = .5 + .5 * Math.sin(13 * flow + 3.2 * Math.cos(flow + 8 * radius));
      const shade = .67 * ribbons + .25 * streaks + .08 * random();
      const offset = (row * size + column) * 4;
      image.data[offset] = 129 + 89 * shade;
      image.data[offset + 1] = 64 + 85 * shade;
      image.data[offset + 2] = 26 + 49 * shade;
      image.data[offset + 3] = 62 * Math.min(1, radius * 4);
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

export function createSurface() {
  const surface = canvasOf(ART_SIZE);
  const base = canvasOf(ART_SIZE);
  const ink = canvasOf(ART_SIZE);
  const context = surface.getContext('2d');
  const ground = base.getContext('2d');
  const inkContext = ink.getContext('2d');
  const radius = ART_SIZE / 2;
  const crema = cremaTexture();
  function paintInk(layer, strokes) {
    layer.save();
    layer.setTransform(radius, 0, 0, radius, radius, radius);
    layer.beginPath();
    layer.arc(0, 0, 1, 0, Math.PI * 2);
    layer.clip();
    paintChocolate(layer, strokes);
    layer.restore();
  }
  const cache = new StrokePaintCache({
    clear: () => inkContext.clearRect(0, 0, ART_SIZE, ART_SIZE),
    append: strokes => paintInk(inkContext, strokes),
  });
  const random = randomFrom(7123);
  const bubbles = Array.from({ length: 2500 }, () => {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random());
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      radius: (0.4 + random() ** 4 * 3.2) / (ART_SIZE / 2),
      highlight: random() > 0.38,
    };
  });
  let baseFill = -1;
  let baseX = 0;
  let baseY = 0;

  function updateBase(fill, x, y) {
    const half = ART_SIZE / 2;
    ground.setTransform(half, 0, 0, half, half, half);
    ground.fillStyle = PEN_COLORS.espresso;
    ground.fillRect(-1, -1, 2, 2);
    const edge = 0.22 + fill * 0.72;
    const espresso = ground.createRadialGradient(-0.16, -0.19, 0.12, 0, 0, 1.06);
    espresso.addColorStop(0, '#a8693f');
    espresso.addColorStop(.78, '#9c5f37');
    espresso.addColorStop(1, '#6d361c');
    ground.fillStyle = espresso;
    ground.fillRect(-1, -1, 2, 2);
    ground.drawImage(crema, -1, -1, 2, 2);
    if (fill > 0) {
      const foam = ground.createRadialGradient(x - .18, y - .2, .04, x, y, edge + .055);
      foam.addColorStop(0, '#fffdf4');
      foam.addColorStop(.7, PEN_COLORS.foam);
      foam.addColorStop(.92, '#e5cfb6');
      foam.addColorStop(1, '#dec2a100');
      ground.globalAlpha = Math.min(1, fill * 2.1);
      ground.fillStyle = foam;
      ground.fillRect(-1, -1, 2, 2);
      ground.globalAlpha = 1;
    }
    for (const bubble of bubbles) {
      const insideFoam = fill > 0 && Math.hypot(bubble.x - x, bubble.y - y) < edge;
      ground.fillStyle = insideFoam
        ? (bubble.highlight ? '#ffffff8a' : '#8d694525')
        : (bubble.highlight ? '#ebbc7f3c' : '#522d212e');
      ground.beginPath();
      ground.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
      ground.fill();
    }
  }

  function paintBase(fill, aim) {
    const reach = fill > 0 ? .48 * (1 - fill) : 0;
    const x = (aim?.x ?? 0) * reach;
    const y = (aim?.y ?? 0) * reach;
    if (baseFill !== fill || baseX !== x || baseY !== y) {
      updateBase(fill, x, y);
      baseFill = fill;
      baseX = x;
      baseY = y;
    }
    context.drawImage(base, 0, 0);
  }

  return {
    canvas: surface,
    paintBlank(fill) { paintBase(fill); },
    paintInkPreview(layer, strokes, active, clips = []) {
      cache.sync(strokes, active);
      layer.clearRect(0, 0, ART_SIZE, ART_SIZE);
      layer.save();
      for (const circle of clips) {
        layer.beginPath();
        layer.arc((circle.x + 1) * radius, (circle.y + 1) * radius, circle.radius * radius, 0, Math.PI * 2);
        layer.clip();
      }
      layer.drawImage(ink, 0, 0);
      if (active) paintInk(layer, [active]);
      layer.restore();
    },
    paint(fill, strokes, active, aim) {
      paintBase(fill, aim);
      cache.sync(strokes, active);
      context.drawImage(ink, 0, 0);
      if (active) paintInk(context, [active]);
    },
    paintPhoto(fill, strokes) {
      // Export always composites strokes in the same order onto the foam itself.
      paintBase(fill);
      paintInk(context, strokes);
    },
  };
}
