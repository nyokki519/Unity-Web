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
      const x = (column - size / 2) / (size / 2) + .13;
      const y = (row - size / 2) / (size / 2) - .09;
      const radius = Math.hypot(x, y);
      const angle = Math.atan2(y, x);
      const flow = angle + 3 * radius + .33 * Math.sin(3 * angle - 3.4 * radius);
      const ribbons = (.5 + .5 * Math.sin(3 * flow + 1.4 * Math.sin(4.6 * radius)))
        * (.70 + .30 * Math.cos(angle + 4 * radius));
      const streaks = .5 + .5 * Math.sin(11 * flow + 3.2 * Math.cos(flow + 8 * radius));
      const shade = .64 * ribbons + .21 * streaks + .15 * random();
      const offset = (row * size + column) * 4;
      image.data[offset] = 129 + 89 * shade;
      image.data[offset + 1] = 64 + 85 * shade;
      image.data[offset + 2] = 26 + 49 * shade;
      image.data[offset + 3] = (38 + 12 * radius) * Math.min(1, radius * 4);
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
  const foamCoat = canvasOf(512);
  const coat = foamCoat.getContext('2d');
  const foamGrain = canvasOf(foamCoat.width);
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
  const grain = foamGrain.getContext('2d');
  grain.setTransform(foamGrain.width / 2, 0, 0, foamGrain.height / 2,
    foamGrain.width / 2, foamGrain.height / 2);
  coffeeContext.setTransform(radius, 0, 0, radius, radius, radius);
  const espresso = coffeeContext.createRadialGradient(-.16, -.19, .12, 0, 0, 1.06);
  espresso.addColorStop(0, '#994f28');
  espresso.addColorStop(.78, '#8e4b2a');
  espresso.addColorStop(1, '#62321b');
  coffeeContext.fillStyle = espresso;
  coffeeContext.fillRect(-1, -1, 2, 2);
  coffeeContext.drawImage(crema, -1, -1, 2, 2);
  const windowGlow = coffeeContext.createRadialGradient(-.63, -.67, .02, -.59, -.63, .57);
  windowGlow.addColorStop(0, '#ffdca437');
  windowGlow.addColorStop(1, '#ffcf6d00');
  coffeeContext.fillStyle = windowGlow;
  coffeeContext.fillRect(-1, -1, 2, 2);
  for (const bubble of bubbles) {
    coffeeContext.fillStyle = bubble.highlight ? '#ebbc7f3c' : '#522d212e';
    coffeeContext.beginPath();
    coffeeContext.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
    coffeeContext.fill();
    grain.fillStyle = bubble.highlight ? '#fffefa42' : '#a27d5929';
    grain.beginPath();
    grain.ellipse(bubble.x, bubble.y, bubble.radius * .87, bubble.radius * .72, .24, 0, Math.PI * 2);
    grain.fill();
  }

  let coatRevision = -1;
  let paintedRevision = -1;
  function compositeBase(layer, size) {
    layer.drawImage(coffee, 0, 0, size, size);
    if (milk.legacy) {
      // Drafts from the previous studio already had a full cup of milk.
      const half = size / 2;
      const filled = layer.createRadialGradient(.82 * half, .80 * half, .04 * half,
        half, half, .995 * half);
      filled.addColorStop(0, '#fffdf4');
      filled.addColorStop(.7, '#f8eee0');
      filled.addColorStop(.92, '#e5cfb6');
      filled.addColorStop(1, '#dec2a100');
      layer.fillStyle = filled;
      layer.fillRect(0, 0, size, size);
    } else if (milk.amount > 0) {
      updateFoam();
      layer.drawImage(foamCoat, 0, 0, size, size);
    }
  }

  function updateFoam() {
    if (coatRevision !== milk.revision) {
      const density = milk.density;
      for (let i = 0; i < density.length; i++) {
        const level = density[i];
        const cream = 1 - Math.exp(-.42 * level);
        const boundary = Math.max(0, Math.min(1, (level - .21) / 1.45));
        const cover = .43 * cream + .57 * boundary ** 2 * (3 - 2 * boundary);
        const offset = i * 4;
        foamImage.data[offset] = 233 + 19 * cream;
        foamImage.data[offset + 1] = 188 + 59 * cream;
        foamImage.data[offset + 2] = 142 + 94 * cream;
        foamImage.data[offset + 3] = 255 * cover;
      }
      foamContext.putImageData(foamImage, 0, 0);
      coat.clearRect(0, 0, foamCoat.width, foamCoat.height);
      coat.drawImage(foam, 0, 0, foamCoat.width, foamCoat.height);
      coat.globalCompositeOperation = 'source-atop';
      coat.drawImage(foamGrain, 0, 0);
      coat.globalCompositeOperation = 'source-over';
      coatRevision = milk.revision;
    }
  }

  function paintBase() {
    if (paintedRevision !== milk.revision) {
      compositeBase(ground, ART_SIZE);
      paintedRevision = milk.revision;
    }
    context.drawImage(base, 0, 0);
  }

  function clipLayer(layer, clips) {
    const half = layer.canvas.width / 2;
    layer.beginPath();
    layer.arc(half, half, half, 0, Math.PI * 2);
    layer.clip();
    for (const circle of clips) {
      layer.beginPath();
      layer.arc((circle.x + 1) * half, (circle.y + 1) * half, circle.radius * half, 0, Math.PI * 2);
      layer.clip();
    }
  }

  function paintImpact(layer) {
    if (milk.flow < .025) return;
    const half = layer.canvas.width / 2;
    const { x, y } = milk.position;
    layer.save();
    layer.setTransform(half, 0, 0, half, half, half);
    layer.lineWidth = .007;
    for (const offset of [0, .5]) {
      const phase = (milk.motionTime / 295 + offset) % 1;
      const radius = .025 + .082 * phase;
      const shine = (1 - phase) ** 2 * (.10 + .24 * milk.flow);
      layer.strokeStyle = `rgba(255, 244, 222, ${shine})`;
      layer.beginPath();
      layer.arc(x, y, radius, Math.PI * .92, Math.PI * 1.77);
      layer.stroke();
      layer.strokeStyle = `rgba(96, 46, 24, ${shine * .46})`;
      layer.beginPath();
      layer.arc(x, y, radius, Math.PI * .05, Math.PI * .78);
      layer.stroke();
    }
    layer.restore();
  }

  return {
    canvas: surface,
    paintBlank: paintBase,
    paintPourPreview(layer, clips, showImpact) {
      const size = layer.canvas.width;
      layer.clearRect(0, 0, size, size);
      layer.save();
      clipLayer(layer, clips);
      // Composite at the visible texture size while the pitcher is moving.
      compositeBase(layer, size);
      if (showImpact) paintImpact(layer);
      layer.restore();
    },
    paintInkPreview(layer, strokes, active, clips = []) {
      cache.sync(strokes, active);
      layer.clearRect(0, 0, ART_SIZE, ART_SIZE);
      layer.save();
      clipLayer(layer, clips);
      layer.drawImage(ink, 0, 0);
      if (active) paintInk(layer, [active]);
      layer.restore();
    },
    paint(strokes, active, showImpact = false) {
      paintBase();
      if (showImpact) paintImpact(context);
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
