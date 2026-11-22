// A pulled porcelain strap with broad joins and a narrower grip.
export const HANDLE_ANGLE = -2.78;
const lean = .52;
const top = [[1.336, 1.064], [1.57, 1.105], [2.025, 1.15], [2.03, .843]];
const bottom = [[2.03, .843], [2.03, .485], [1.66, .389], [1.053, .505]];

export function handleProfile(t) {
  const upper = t <= .5;
  const [a, b, c, d] = upper ? top : bottom;
  const u = upper ? t * 2 : t * 2 - 1;
  const v = 1 - u;
  const coordinate = i => v ** 3 * a[i] + 3 * v * v * u * b[i] + 3 * v * u * u * c[i] + u ** 3 * d[i];
  const derivative = i => v * v * (b[i] - a[i]) + 2 * v * u * (c[i] - b[i]) + u * u * (d[i] - c[i]);
  const dx = derivative(0), dy = derivative(1);
  const length = Math.hypot(dx, dy);
  const y = coordinate(1);
  const narrow = Math.sin(Math.PI * t);
  return {
    x: coordinate(0), y, z: lean * (y - .843), nx: dy / length, ny: -dx / length,
    depth: .108 - .029 * narrow,
    width: .162 - .045 * narrow,
  };
}

export function handleCrossSection(profile, angle) {
  const alongNormal = Math.cos(angle) * profile.depth;
  const across = Math.sin(angle) * profile.width;
  return {
    x: profile.x + profile.nx * alongNormal,
    y: profile.y + profile.ny * alongNormal - across * .32,
    z: profile.z + lean * profile.ny * alongNormal + across,
  };
}


export const CUP_SEAT_HEIGHT = .13;
export const SAUCER_FOOT_RADIUS = .92;
export const SAUCER_RIM = [2.203, .26];
export const SAUCER_FACE = [
  [0, CUP_SEAT_HEIGHT], [.74, CUP_SEAT_HEIGHT], [.81, .134], [.91, .146], [1.10, .15],
  [1.35, .162], [1.58, .183], [1.81, .221], [2.02, .271], [2.15, .287], [2.184, .285], [2.20, .276], SAUCER_RIM,
];
export const SAUCER_PROFILE = [
  [0, .035], [.78, .035], [.81, .003], [SAUCER_FOOT_RADIUS, .003], [.95, .025], [1.30, .053],
  [1.65, .106], [1.96, .176], [2.15, .225], [2.19, .242], ...[...SAUCER_FACE].reverse(),
];
export const SPOON_REST = Object.freeze({ x: -1.37, y: .244, z: -1.46, yaw: .72, pitch: -.0254, scale: .86 });

export function saucerHeightAt(radius) {
  if (radius > SAUCER_RIM[0]) return 0;
  const i = Math.max(1, SAUCER_FACE.findIndex(([r]) => radius <= r));
  const [r0, y0] = SAUCER_FACE[i - 1];
  const [r1, y1] = SAUCER_FACE[i];
  return y0 + (y1 - y0) * (radius - r0) / (r1 - r0);
}
