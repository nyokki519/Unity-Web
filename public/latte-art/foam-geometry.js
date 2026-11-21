import { CUP_SEAT_HEIGHT } from './tableware-profile.js';

const lerp = (start, end, fraction) => (1 - fraction) * start + fraction * end;

const innerWall = [
  [1.354, 1.258], [1.348, 1.24], [1.347, 1.22], [1.30, 1.03], [1.25, .87],
  [1.15, .69], [1.02, .51], [.85, .38], [.68, .33], [0, .33],
];

export const CUP_OUTER_WALL = [
  [0, .16], [.53, .16], [.55, .14], [.56, CUP_SEAT_HEIGHT], [.65, CUP_SEAT_HEIGHT], [.67, .145],
  [.68, .18], [.71, .205], [.78, .24], [.89, .30], [1.01, .39], [1.13, .52],
  [1.23, .67], [1.31, .84], [1.367, 1.01], [1.397, 1.15], [1.404, 1.226],
  [1.403, 1.249], [1.397, 1.263], [1.385, 1.272], [1.369, 1.272],
];

export const CUP_PROFILE = [...CUP_OUTER_WALL, ...innerWall];

function planeAtHeight(height) {
  const lower = innerWall.findIndex(([, y]) => y <= height);
  const [a, top] = innerWall[lower - 1];
  const [b, bottom] = innerWall[lower];
  const radius = lerp(b, a, (height - bottom) / (top - bottom));
  return { height, radius: radius - .003 };
}

// Reference plane used by existing artwork and by the tableware's framing.
export const FOAM_PLANE = Object.freeze(planeAtHeight(1.06));

// Integrate the bowl as a stack of frustums. The common factor π/3 cancels
// when mapping a fraction of the available volume to a liquid height.
const fullHeight = innerWall[0][1] - .065;
const levels = innerWall.slice().reverse().filter(([, y]) => y < fullHeight);
levels.push([planeAtHeight(fullHeight).radius + .003, fullHeight]);
function volumeBelow(level) {
  let volume = 0;
  for (let i = 1; i < levels.length; i++) {
    const [r, y] = levels[i - 1];
    const [endRadius, endY] = levels[i];
    if (endY <= y || level <= y) continue;
    const depth = Math.min(level, endY) - y;
    const upper = lerp(r, endRadius, depth / (endY - y));
    volume += depth * (r * r + r * upper + upper * upper);
  }
  return volume;
}
const fullVolume = volumeBelow(fullHeight);
// A double shot in a cup with room for the pitcher's 160 mL.
const initialFraction = 60 / (60 + 160);
export function liquidPlaneAtFill(fraction) {
  const filled = Math.max(0, Math.min(1, fraction));
  const target = fullVolume * lerp(initialFraction, 1, filled);
  let lower = levels[0][1], upper = fullHeight;
  for (let step = 0; step < 16; step++) {
    const middle = (lower + upper) * .5;
    if (volumeBelow(middle) < target) lower = middle;
    else upper = middle;
  }
  return planeAtHeight(upper);
}

export function tableCameraFraming(view, aspect) {
  const relative = Math.max(0, Math.min(1, (aspect - .57) / (.80 - .57)));
  const portrait = 1 - relative ** 2 * (3 - 2 * relative);
  const photo = view === 'photo';
  const served = view === 'serve' || photo;
  const blend = (wide, tall) => lerp(wide, tall, portrait);
  const distance = photo ? 10.15 : served
    ? blend(10.6, 12.2 * Math.max(.9, .462 / aspect))
    : blend(11.25, Math.max(11.25, 18 * .462 / aspect));
  const elevation = photo ? 56 : served ? 64 : blend(57, 57.5);
  const angle = elevation * Math.PI / 180;
  const targetY = served ? .67 : .69;
  const targetZ = photo ? .16 : served ? .08 : blend(.08, .22);
  return {
    distance, elevation, targetY, targetZ,
    targetX: photo ? -.18 : blend(.18, .02),
    eye: { x: 0, y: targetY + distance * Math.sin(angle), z: targetZ + distance * Math.cos(angle) },
    shiftX: served ? 0 : -.126 * portrait,
    shiftY: served ? 0 : .095 * portrait,
  };
}

// A ray from the foam to the camera stays visible only while it fits through
// each wider cross section of the cup's inner wall.
function innerWallClips(eye, plane = FOAM_PLANE) {
  const clips = [];
  for (const [radius, height] of innerWall) {
    if (height <= plane.height || height >= eye.y) continue;
    const perspective = (height - plane.height) / (eye.y - height);
    const x = -perspective * eye.x / plane.radius;
    const y = -perspective * eye.z / plane.radius;
    const r = radius * (1 + perspective) / plane.radius;
    if (r < 1 + Math.hypot(x, y)) clips.push({ x, y, radius: r });
  }
  return clips;
}

export const PHOTO_FOAM_CLIPS = innerWallClips(tableCameraFraming('photo', 1).eye);

export function visibleFoamClips(view, aspect, plane = FOAM_PLANE) {
  return innerWallClips(tableCameraFraming(view, aspect).eye, plane);
}

export function drawingFoamClips(aspect, plane = FOAM_PLANE) {
  return [...visibleFoamClips('photo', 1, plane), ...visibleFoamClips('draw', aspect, plane)];
}

// Fit a lightweight canvas ellipse to the same projected disk as the 3D cup.
// Perspective changes both its aspect and its center as the waterline rises.
export function projectedLiquidEllipse(width, height, view, plane) {
  const { eye, targetX, targetY, targetZ, shiftX, shiftY } = tableCameraFraming(view, width / height);
  const dx = targetX - eye.x, dy = targetY - eye.y, dz = targetZ - eye.z;
  const distance = Math.hypot(dx, dy, dz);
  const horizontal = Math.hypot(dx, dz);
  const rightX = -dz / horizontal, rightZ = dx / horizontal;
  const focal = .5 * height / Math.tan(14 * Math.PI / 180);
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  for (const [cos, sin] of unitRing) {
    const x = plane.radius * cos - eye.x;
    const y = plane.height - eye.y;
    const z = plane.radius * sin - eye.z;
    const scale = focal * distance / (x * dx + y * dy + z * dz);
    const screenX = (rightX * x + rightZ * z) * scale;
    const screenY = ((dx * x + dz * z) * dy / horizontal - horizontal * y) * scale / distance;
    left = Math.min(left, screenX);
    right = Math.max(right, screenX);
    top = Math.min(top, screenY);
    bottom = Math.max(bottom, screenY);
  }
  return {
    x: width * (.5 - shiftX) + (left + right) / 2,
    y: height * (.5 - shiftY) + (top + bottom) / 2,
    r: (right - left) / 2,
    ry: (bottom - top) / 2,
  };
}

const unitRing = Array.from({ length: 48 }, (_, index) => {
  const angle = index * Math.PI / 24;
  return [Math.cos(angle), Math.sin(angle)];
});
