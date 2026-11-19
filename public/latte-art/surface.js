import { paintChocolate } from './drawing.js';
import { MILK_GRID_SIZE } from './milk-pour.js';
import { StrokePaintCache } from './stroke-paint-cache.js';

export const PHOTO_SIZE = 1200;
const ART_SIZE = 1024;

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

export function createSurface(milk) {
  const surface = canvasOf(ART_SIZE);
  const base = canvasOf(ART_SIZE);
  const coffee = canvasOf(ART_SIZE);
  const foam = canvasOf(MILK_GRID_SIZE);
  const foamContext = foam.getContext('2d');
  const foamImage = foamContext.createImageData(MILK_GRID_SIZE, MILK_GRID_SIZE);
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
  const coffeeContext = coffee.getContext('2d');
  coffeeContext.setTransform(radius, 0, 0, radius, radius, radius);
  const espresso = coffeeContext.createRadialGradient(-.16, -.19, .12, 0, 0, 1.06);
  espresso.addColorStop(0, '#994f28');
  espresso.addColorStop(.78, '#8e4b2a');
  espresso.addColorStop(1, '#62321b');
  coffeeContext.fillStyle = espresso;
  coffeeContext.fillRect(-1, -1, 2, 2);
  coffeeContext.drawImage(crema, -1, -1, 2, 2);
  for (const bubble of bubbles) {
    coffeeContext.fillStyle = bubble.highlight ? '#ebbc7f3c' : '#522d212e';
    coffeeContext.beginPath();
    coffeeContext.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
    coffeeContext.fill();
  }

  let paintedRevision = -1;
  function updateBase() {
    ground.drawImage(coffee, 0, 0);
    if (milk.legacy) {
      // Drafts from the previous studio already had a full cup of milk.
      const filled = ground.createRadialGradient(.82 * radius, .80 * radius, .04 * radius,
        radius, radius, .995 * radius);
      filled.addColorStop(0, '#fffdf4');
      filled.addColorStop(.7, '#f8eee0');
      filled.addColorStop(.92, '#e5cfb6');
      filled.addColorStop(1, '#dec2a100');
      ground.fillStyle = filled;
      ground.fillRect(0, 0, ART_SIZE, ART_SIZE);
    } else if (milk.amount > 0) {
      const density = milk.density;
      for (let i = 0; i < density.length; i++) {
        const level = density[i];
        const cream = 1 - Math.exp(-.36 * level);
        const offset = i * 4;
        foamImage.data[offset] = 231 + 23 * cream;
        foamImage.data[offset + 1] = 189 + 60 * cream;
        foamImage.data[offset + 2] = 144 + 96 * cream;
        foamImage.data[offset + 3] = 255 * (1 - Math.exp(-.65 * level));
      }
      foamContext.putImageData(foamImage, 0, 0);
      ground.drawImage(foam, 0, 0, ART_SIZE, ART_SIZE);
    }
    paintedRevision = milk.revision;
  }

  function paintBase() {
    if (paintedRevision !== milk.revision) updateBase();
    context.drawImage(base, 0, 0);
  }

  return {
    canvas: surface,
    paintBlank: paintBase,
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
    paint(strokes, active) {
      paintBase();
      cache.sync(strokes, active);
      context.drawImage(ink, 0, 0);
      if (active) paintInk(context, [active]);
    },
    paintPhoto(strokes) {
      // Export always composites strokes in the same order onto the foam itself.
      paintBase();
      paintInk(context, strokes);
    },
  };
}
