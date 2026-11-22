import { createWalnutImages } from './walnut.js';

async function readMaterial(path) {
  const image = new Image();
  image.src = new URL(path, import.meta.url).href;
  // A slow or unavailable decorative image must not hold up the game.
  let timeout;
  try {
    return await Promise.race([
      image.decode().then(() => image, () => null),
      new Promise(resolve => { timeout = setTimeout(resolve, 1200, null); }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

function makeCafeStamp(officialMark) {
  if (!officialMark) return null;
  const canvas = document.createElement('canvas');
  canvas.width = officialMark.width;
  canvas.height = officialMark.height;
  const context = canvas.getContext('2d');
  context.drawImage(officialMark, 0, 0);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  // The official image has a beige surround. Keep its exact ink silhouette
  // and use a warm underglaze pigment on the porcelain.
  for (let i = 0; i < image.data.length; i += 4) {
    const [r, g, b] = image.data.subarray(i, i + 3);
    const brightness = (r + g + b) / 3;
    image.data[i] = 83;
    image.data[i + 1] = 59;
    image.data[i + 2] = 46;
    image.data[i + 3] = 255 * Math.max(0, Math.min(1, (188 - brightness) / 109));
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

export async function loadCafeMaterials() {
  const [grain, relief, officialMark] = await Promise.all([
    readMaterial('./table-grain.webp'),
    readMaterial('./table-relief.webp'),
    readMaterial('../assets/unity-mark.webp'),
  ]);
  const timber = grain
    ? { colorCanvas: grain, reliefCanvas: relief }
    : createWalnutImages();
  return { timber, stamp: makeCafeStamp(officialMark) };
}

export function ceramicGlaze() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d');
  context.fillStyle = '#fffdf8';
  context.fillRect(0, 0, 512, 512);
  let state = 1079;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let i = 0; i < 1650; i++) {
    const x = next() * 512;
    const y = next() * 512;
    const radius = .28 + next() ** 3 * .65;
    context.fillStyle = next() > .2 ? '#8c7e6a21' : '#8c7e6a30';
    context.beginPath();
    context.ellipse(x, y, radius, radius * .70, next() * Math.PI, 0, 2 * Math.PI);
    context.fill();
  }
  return canvas;
}
