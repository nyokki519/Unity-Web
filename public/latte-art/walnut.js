import { canvasOf } from './surface.js';

const TAU = 2 * Math.PI;

function valueNoise(columns, rows, seed) {
  const values = Float32Array.from({ length: columns * rows }, () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  });

  const smooth = value => value * value * (3 - 2 * value);
  const mix = (a, b, weight) => a + (b - a) * weight;
  return (u, v) => {
    const x = (u - Math.floor(u)) * columns;
    const y = (v - Math.floor(v)) * rows;
    const column = Math.floor(x);
    const row = Math.floor(y);
    const nextColumn = (column + 1) % columns;
    const nextRow = (row + 1) % rows;
    const weightX = smooth(x - column);
    const weightY = smooth(y - row);
    const top = mix(values[row * columns + column], values[row * columns + nextColumn], weightX);
    const bottom = mix(values[nextRow * columns + column], values[nextRow * columns + nextColumn], weightX);
    return mix(top, bottom, weightY);
  };
}

const crown = valueNoise(4, 7, 701);
const bands = valueNoise(8, 43, 193);
const strands = valueNoise(15, 143, 457);
const pores = valueNoise(37, 233, 1209);

export function sampleWalnut(u, v) {
  // Periodic warping bends the layers without leaving a seam in the repeating texture.
  const bend = .0045 * Math.sin(TAU * (u + v)) + .0018 * Math.sin(TAU * (2 * u - 3 * v));
  const w = v + bend;
  const coarse = crown(u, v);
  const ribbon = bands(u, w);
  const openGrain = .5 + .5 * Math.sin(TAU * (181 * w + .05 * Math.sin(TAU * 3 * u)));
  const fiber = .54 * strands(u, w) + .19 * pores(u, w) + .27 * openGrain;
  return {
    tone: .23 * coarse + .31 * ribbon + .46 * fiber,
    fiber,
  };
}

export function createWalnutImages(withRelief = true) {
  const size = 512;
  const colorCanvas = canvasOf(size);
  const reliefCanvas = withRelief ? canvasOf(size) : null;
  const colorContext = colorCanvas.getContext('2d');
  const reliefContext = reliefCanvas?.getContext('2d');
  const colorImage = colorContext.createImageData(size, size);
  const reliefImage = reliefContext?.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const { tone, fiber } = sampleWalnut(x / size, y / size);
      const offset = (y * size + x) * 4;

      // Dark vascular lines sit under the polish and follow the same warped grain.
      const pore = 12 * Math.max(0, .55 - fiber);
      colorImage.data[offset] = 70 + 36 * tone - pore;
      colorImage.data[offset + 1] = 63 + 34 * tone - pore;
      colorImage.data[offset + 2] = 58 + 32 * tone - pore;
      colorImage.data[offset + 3] = 255;
      if (reliefImage) {
        reliefImage.data.fill(Math.round(100 + 55 * fiber), offset, offset + 3);
        reliefImage.data[offset + 3] = 255;
      }
    }
  }
  colorContext.putImageData(colorImage, 0, 0);
  reliefContext?.putImageData(reliefImage, 0, 0);
  return { colorCanvas, reliefCanvas };
}
