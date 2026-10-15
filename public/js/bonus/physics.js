// Earliest segment/circle contact; used for solid surfaces and open holes alike.
export function sweepCircle(x, y, nx, ny, cx, cy, r) {
  const dx = nx - x,
    dy = ny - y,
    ox = x - cx,
    oy = y - cy,
    c = ox * ox + oy * oy - r * r;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy;
  if (!a) return null;
  const b = 2 * (ox * dx + oy * dy),
    disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}
export function moveBoard(b, board, dt) {
  b.vy += 700 * dt;
  let left = dt;
  for (let iteration = 0; iteration < 12 && left > 1e-9; iteration++) {
    const nx = b.x + b.vx * left,
      ny = b.y + b.vy * left;
    let hit = null;
    for (const pin of board.pins) {
      const t = sweepCircle(b.x, b.y, nx, ny, pin.x, pin.y, pin.r + b.r);
      if (t !== null && (!hit || t < hit.t)) hit = { t, pin };
    }
    for (const [edge, normal] of [
      [board.left + b.r, 1],
      [board.right - b.r, -1],
    ]) {
      const t = (edge - b.x) / (nx - b.x);
      if (t >= 0 && t <= 1 && b.vx * normal < 0 && (!hit || t < hit.t))
        hit = { t, normal };
    }
    if (!hit) {
      b.x = nx;
      b.y = ny;
      break;
    }
    b.x += (nx - b.x) * hit.t;
    b.y += (ny - b.y) * hit.t;
    let ux = hit.normal || 0,
      uy = 0;
    if (hit.pin) {
      const len = Math.hypot(b.x - hit.pin.x, b.y - hit.pin.y) || 1;
      ux = (b.x - hit.pin.x) / len;
      uy = (b.y - hit.pin.y) / len;
    }
    const dot = b.vx * ux + b.vy * uy;
    if (dot < 0) {
      b.vx -= 1.7 * dot * ux;
      b.vy -= 1.7 * dot * uy;
    }
    b.x += ux * 0.001;
    b.y += uy * 0.001;
    left *= 1 - hit.t;
  }
}
export function moveTray(b, tray, dt) {
  b.vx += (-tray.spring * b.x + tray.tiltX - tray.drag * b.vx) * dt;
  b.vy += (-tray.spring * b.y + tray.tiltY - tray.drag * b.vy) * dt;
  const nx = b.x + b.vx * dt,
    ny = b.y + b.vy * dt;
  let first = null;
  for (const h of tray.holes) {
    const t = sweepCircle(b.x, b.y, nx, ny, h.x, h.y, h.r);
    if (t !== null && (!first || t < first.t)) first = { t, h };
  }
  if (first) {
    b.x += (nx - b.x) * first.t;
    b.y += (ny - b.y) * first.t;
    return first.h;
  }
  b.x = nx;
  b.y = ny;
  const distance = Math.hypot(b.x, b.y),
    limit = tray.radius - b.r;
  if (distance > limit) {
    const ux = b.x / distance,
      uy = b.y / distance;
    b.x = ux * limit;
    b.y = uy * limit;
    const dot = b.vx * ux + b.vy * uy;
    if (dot > 0) {
      b.vx -= 1.65 * dot * ux;
      b.vy -= 1.65 * dot * uy;
    }
  }
  return null;
}
