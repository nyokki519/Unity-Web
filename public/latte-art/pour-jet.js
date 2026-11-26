import { CUP_PROFILE, FOAM_PLANE } from './foam-geometry.js';

export const PITCHER_LIP = Object.freeze({ x: -.67, y: 1.17, z: 0 });
export const POURING_PITCHER_SCALE = .84;
const rimHeight = Math.max(...CUP_PROFILE.map(([, height]) => height));
const WORLD_UNITS_PER_CM = .30;

const clamp = (n, low, high) => Math.min(high, Math.max(low, n));

export function pourJetPose(flow, used, position = { x: 0, y: 0 }, plane = FOAM_PLANE, heightCm) {
  const t = Math.min(1, Math.max(0, (flow - .02) / .62));
  const established = t * t * (3 - 2 * t);
  const manual = Number.isFinite(heightCm);
  const requested = manual ? WORLD_UNITS_PER_CM * clamp(heightCm, .6, 10) : .90 - .47 * established;
  // A low pour tips the body toward horizontal so the lip can approach the crema.
  const lowPour = manual ? clamp((.92 - requested) / .72, 0, 1) : 0;
  const angle = .88 + .27 * established + .09 * used + lowPour * (.38 - .19 * established);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const lipHeight = PITCHER_LIP.x * s + PITCHER_LIP.y * c;
  // These points on the pitcher's lower wall can become its lowest point as it tilts.
  const bottom = Math.min(-.51 * s, -.58 * s + .07 * c, -.60 * s + .22 * c);
  const clearance = rimHeight - plane.height + .025 + (lipHeight - bottom) * POURING_PITCHER_SCALE;
  const height = Math.max(requested, clearance);
  const x = position.x * plane.radius;
  const z = position.y * plane.radius;
  const lead = manual ? .16 + .16 * Math.min(1.8, requested) : .18 + .15 * established;
  const lipX = x + lead;
  const lipZ = z - .48 * lead;
  // Keeping the lip and landing inside the opening also keeps the curved falling
  // stream clear of the rim when a player moves along its far side.
  const fit = Math.min(1, (plane.radius - .035) / Math.hypot(lipX, lipZ));
  return { angle, height, reach: lipX * fit - x, depth: lipZ * fit - z };
}

export function pitcherFill(remainingMl) {
  return clamp(remainingMl / 200, 0, 1);
}

export function sampleFallingMilk(start, end, t) {
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t * t,
    z: start.z + (end.z - start.z) * t,
  };
}

// Volume continuity narrows the accelerating jet on its way to the liquid.
// The free ends round off while the column opens or breaks away from the lip.
export function milkJetRadius(flow, t, cut = 0, head = 1, drop = 1) {
  const radius = .054 * flow ** .45 / (1 + 5 * drop * t * t) ** .25;
  const distance = Math.min(cut > 0 ? t - cut : 1, head < 1 ? head - t : 1);
  const cap = Math.max(0, 1 - Math.max(0, distance) / .055);
  return radius * Math.sqrt(1 - cap * cap);
}
