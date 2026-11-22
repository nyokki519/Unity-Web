import { joinedFoamLevels } from './foam-coating.js';
import { FOAM_PLANE, liquidPlaneAtFill } from './foam-geometry.js';
import { paintChocolate } from './drawing.js';
import { FOAM_DENSITY_PER_ML, MILK_CAPACITY, MILK_GRID_SIZE } from './milk-pour.js';
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
      const flow = angle + 3.8 * radius + .35 * Math.sin(3 * angle - 3.4 * radius);
      const ribbons = (.5 + .5 * Math.sin(3 * flow + 1.7 * Math.sin(5.8 * radius)))
        * (.70 + .30 * Math.cos(angle + 4 * radius));
      const streaks = .5 + .5 * Math.sin(11 * flow + 3.2 * Math.cos(flow + 8 * radius));
      const islands = .5 + .5 * Math.sin(21 * x + 14 * y + 1.9 * Math.sin(14 * y - 7 * x));
      const shade = .53 * ribbons + .17 * streaks + .18 * islands + .12 * random();
      const offset = (row * size + column) * 4;
      image.data[offset] = 129 + 89 * shade;
      image.data[offset + 1] = 64 + 85 * shade;
      image.data[offset + 2] = 26 + 49 * shade;
      image.data[offset + 3] = (50 + 16 * radius) * Math.min(1, radius * 3.8);
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

// Keep the diffuse window reflection anchored to the cup while foam moves.
function reflectWindow(context, opacity) {
  context.save();
  context.translate(-.41, -.39);
  context.rotate(-.54);
  context.scale(.78, .31);
  const reflection = context.createRadialGradient(0, 0, .02, 0, 0, 1);
  reflection.addColorStop(0, `rgba(255, 244, 220, ${opacity})`);
  reflection.addColorStop(.42, `rgba(255, 244, 220, ${opacity * .55})`);
  reflection.addColorStop(1, 'rgba(255, 244, 220, 0)');
  context.fillStyle = reflection;
  context.fillRect(-1, -1, 2, 2);
  context.restore();
}

// Extend the edge color past the round simulation boundary by one filter
// footprint. The final cup mask supplies the curved edge at display resolution.
function foamBorder(size) {
  const border = [];
  const half = size / 2;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const x = col + .5 - half, y = row + .5 - half;
      const distance = Math.hypot(x, y);
      if (distance < half || distance > half + Math.SQRT2) continue;
      const scale = (half - .8) / distance;
      const sourceX = Math.floor(half + x * scale);
      const sourceY = Math.floor(half + y * scale);
      border.push([row * size + col, sourceY * size + sourceX]);
    }
  }
  return border;
}

export function createSurface(milk) {
  const surface = canvasOf(ART_SIZE);
  const base = canvasOf(ART_SIZE);
  const coffee = canvasOf(ART_SIZE);
  const foam = canvasOf(MILK_GRID_SIZE);
  const foamContext = foam.getContext('2d');
  const foamImage = foamContext.createImageData(MILK_GRID_SIZE, MILK_GRID_SIZE);
  const pixels = new Uint32Array(foamImage.data.buffer);
  const border = foamBorder(MILK_GRID_SIZE);
  const seamCorrection = new Float32Array(pixels.length);
  const visibleFoam = new Float32Array(pixels.length);
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
  const bubbles = Array.from({ length: 3400 }, () => {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random());
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      radius: (0.43 + random() ** 5 * 2.7) / (ART_SIZE / 2),
    };
  });
  // A fixed, fine pore texture survives compositing into the export and never
  // crawls as foam spreads. The lower-resolution field breaks up the wet edge.
  const grainSize = foamGrain.width;
  const pores = new ImageData(grainSize, grainSize);
  for (let i = 0; i < pores.data.length; i += 4) {
    const value = random() - .46;
    const shadow = value < 0;
    pores.data[i] = shadow ? 128 : 255;
    pores.data[i + 1] = shadow ? 105 : 250;
    pores.data[i + 2] = shadow ? 82 : 237;
    pores.data[i + 3] = Math.abs(value) * (shadow ? 35 : 52);
  }
  const structure = Float32Array.from({ length: MILK_GRID_SIZE ** 2 }, () => .90 + .20 * random());
  const coffeeContext = coffee.getContext('2d');
  const grain = foamGrain.getContext('2d');
  grain.putImageData(pores, 0, 0);
  grain.setTransform(foamGrain.width / 2, 0, 0, foamGrain.height / 2,
    foamGrain.width / 2, foamGrain.height / 2);
  coffeeContext.setTransform(radius, 0, 0, radius, radius, radius);
  const espresso = coffeeContext.createRadialGradient(-.29, -.23, .09, 0, 0, 1.05);
  espresso.addColorStop(0, '#a76739');
  espresso.addColorStop(.58, '#955633');
  espresso.addColorStop(.88, '#8a4d2c');
  espresso.addColorStop(1, '#60321e');
  coffeeContext.fillStyle = espresso;
  coffeeContext.fillRect(-1, -1, 2, 2);
  coffeeContext.drawImage(crema, -1, -1, 2, 2);
  reflectWindow(coffeeContext, .17);
  reflectWindow(grain, .11);
  // The liquid darkens against the cup wall, with a narrow lit shoulder.
  const meniscus = coffeeContext.createRadialGradient(0, 0, .9, 0, 0, 1);
  meniscus.addColorStop(0, '#41201600');
  meniscus.addColorStop(.67, '#dca46d23');
  meniscus.addColorStop(1, '#41201666');
  coffeeContext.fillStyle = meniscus;
  coffeeContext.fillRect(-1, -1, 2, 2);
  for (const { x, y, radius: pore } of bubbles) {
    coffeeContext.fillStyle = '#45231731';
    coffeeContext.beginPath();
    coffeeContext.ellipse(x, y, pore, .83 * pore, -.52, 0, Math.PI * 2);
    coffeeContext.fill();
    grain.fillStyle = '#997a6226';
    grain.beginPath();
    grain.ellipse(x, y, pore, .83 * pore, -.52, 0, Math.PI * 2);
    grain.fill();
    grain.fillStyle = '#fffaf04a';
    grain.beginPath();
    grain.ellipse(x - .42 * pore, y - .52 * pore, .66 * pore, .36 * pore, -.52, 0, Math.PI * 2);
    grain.fill();
  }

  let coatRevision = -1;
  let mixedOpacity = 0;
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
      layer.fillStyle = `rgba(223, 178, 125, ${mixedOpacity})`;
      layer.fillRect(0, 0, size, size);
      layer.drawImage(foamCoat, 0, 0, size, size);
    }
  }

  function updateFoam() {
    if (coatRevision !== milk.revision) {
      const density = milk.density;
      joinedFoamLevels(density, MILK_GRID_SIZE, seamCorrection, visibleFoam);
      let floatingDensity = 0;
      for (let i = 0; i < density.length; i++) {
        const level = density[i];
        floatingDensity += level;
        const offset = i * 4;
        // Below this level the foam's eight-bit alpha rounds to zero.
        if (level <= .001) {
          foamImage.data[offset + 3] = 0;
          continue;
        }
        const thickness = visibleFoam[i] * structure[i];
        // Where adjacent pours build a shared foam layer, let it turn white
        // sooner while keeping the thinnest fringe translucent.
        const densitySquared = thickness * thickness;
        const coating = thickness + 3.1 * densitySquared / (5 + densitySquared);
        const cream = 1 - Math.exp(-.38 * coating);
        const cover = 1 - Math.exp(-.62 * coating);
        const slope = visibleFoam[i] - (visibleFoam[i - MILK_GRID_SIZE - 1] ?? visibleFoam[i]);
        const relief = 2.4 * slope / (1 + Math.abs(slope));
        foamImage.data[offset] = 228 + 22 * cream + relief;
        foamImage.data[offset + 1] = 190 + 54 * cream + relief;
        foamImage.data[offset + 2] = 152 + 82 * cream + relief;
        foamImage.data[offset + 3] = 255 * cover;
      }
      const mixedVolume = Math.max(0, milk.landedAmount - floatingDensity / FOAM_DENSITY_PER_ML);
      mixedOpacity = .72 * (1 - Math.exp(-mixedVolume / 45));
      for (const [edge, inside] of border) pixels[edge] = pixels[inside];
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
    const flow = milk.impactFlow;
    if (flow < .025) return;
    const half = layer.canvas.width / 2;
    const { x, y } = milk.impactPosition;
    layer.save();
    layer.setTransform(half, 0, 0, half, half, half);
    const dimpleRadius = .026 + .029 * flow;
    const dimple = layer.createRadialGradient(x, y, 0, x, y, dimpleRadius);
    dimple.addColorStop(0, `rgba(71, 39, 24, ${.08 + .13 * flow})`);
    dimple.addColorStop(.48, `rgba(105, 61, 37, ${.07 * flow})`);
    dimple.addColorStop(1, 'rgba(105, 61, 37, 0)');
    layer.fillStyle = dimple;
    layer.fillRect(x - dimpleRadius, y - dimpleRadius, 2 * dimpleRadius, 2 * dimpleRadius);
    layer.lineCap = 'round';
    for (const offset of [0, .5]) {
      const phase = (milk.motionTime / (340 - 85 * flow) + offset) % 1;
      const radius = .028 + (.05 + .060 * flow) * phase;
      const shine = Math.sin(Math.PI * phase) * (1 - phase) * (.17 + .38 * flow);
      layer.lineWidth = .0035 + .006 * (1 - phase) * flow;
      layer.strokeStyle = `rgba(255, 244, 222, ${shine})`;
      layer.beginPath();
      layer.ellipse(x, y, radius, radius * .91, -.38, Math.PI * 1.02, Math.PI * 1.75);
      layer.stroke();
      layer.strokeStyle = `rgba(96, 46, 24, ${shine * .46})`;
      layer.beginPath();
      layer.ellipse(x, y, radius, radius * .91, -.38, Math.PI * .04, Math.PI * .73);
      layer.stroke();
    }
    layer.restore();
  }

  let lastAmount = -1;
  let lastPlane = FOAM_PLANE;
  return {
    fixedLevel: false,
    get plane() {
      if (this.fixedLevel) return FOAM_PLANE;
      const amount = milk.landedAmount;
      if (amount !== lastAmount) {
        lastPlane = liquidPlaneAtFill(amount / MILK_CAPACITY);
        lastAmount = amount;
      }
      return lastPlane;
    },
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
