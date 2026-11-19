const HEART_STEAM = 'M49 59 C41 44 18 32 19 17 C20 5 32 1 41 8 C47 13 50 21 50 29 C57 20 69 17 78 25 C90 36 76 49 62 52 C54 54 50 56 50 65 M29 30 C24 22 27 14 31 13';
const CUP = 'M29 63 Q34 86 49 88 Q63 88 69 63 M65 77 Q82 71 77 65 Q75 63 68 68 M18 85 C18 81 27 79 35 79 M64 79 C76 80 83 83 83 86 C81 96 20 96 18 85';
const LIQUID = 'M29 63 C31 58 65 58 69 63 C64 68 35 68 29 63 Z';
let markPaths;

export function paintCafeMark(context, x, y, size, color) {
  markPaths ??= [HEART_STEAM, CUP, LIQUID].map(outline => new Path2D(outline));
  context.save();
  context.translate(x, y);
  context.scale(size / 100, size / 100);
  context.strokeStyle = color;
  context.lineWidth = 3.25;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  for (const path of markPaths) context.stroke(path);
  context.restore();
}

export function ceramicGlaze() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff6e8';
  context.fillRect(0, 0, 512, 512);
  let state = 1079;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let i = 0; i < 5700; i++) {
    const x = next() * 512;
    const y = next() * 512;
    const radius = .35 + next() ** 3 * 1.45;
    context.fillStyle = next() > .2 ? '#82573353' : '#6a45227d';
    context.beginPath();
    context.ellipse(x, y, radius, radius * .70, next() * Math.PI, 0, 2 * Math.PI);
    context.fill();
  }
  return canvas;
}
