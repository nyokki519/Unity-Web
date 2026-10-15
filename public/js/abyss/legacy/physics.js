import { holesAt } from "./config.js";
export function sweepCircle(x, y, nx, ny, cx, cy, r) {
  const dx = nx - x,
    dy = ny - y,
    ox = x - cx,
    oy = y - cy,
    c = ox * ox + oy * oy - r * r;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy;
  if (a < 1e-18) return null;
  const b = 2 * (ox * dx + oy * dy),
    d = b * b - 4 * a * c;
  if (d < 0) return null;
  const t = (-b - Math.sqrt(d)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}
export function impulse(
  b,
  nx,
  ny,
  restitution = 0.66,
  friction = 0.16,
  surfaceX = 0,
  surfaceY = 0,
) {
  const dx = b.vx - surfaceX,
    dy = b.vy - surfaceY,
    vn = dx * nx + dy * ny;
  if (vn >= 0) return;
  const j = -(1 + restitution) * vn;
  const tx = -ny,
    ty = nx,
    vt = dx * tx + dy * ty - (b.spin || 0) * b.r,
    jt = Math.max(-friction * j, Math.min(friction * j, -vt / 3));
  b.vx += j * nx + jt * tx;
  b.vy += j * ny + jt * ty;
  b.spin = (b.spin || 0) - (2 * jt) / b.r;
}
export function moveBoard(b, board, dt, onContact) {
  b.vy += board.gravity * dt;
  let left = dt;
  for (let i = 0; i < 16 && left > 1e-8; i++) {
    const nx = b.x + b.vx * left,
      ny = b.y + b.vy * left;
    let hit = null;
    for (const p of board.pins) {
      const t = sweepCircle(b.x, b.y, nx, ny, p.x, p.y, p.r + b.r);
      if (t !== null && (!hit || t < hit.t)) hit = { t, p };
    }
    for (const [x, n] of [
      [board.left + b.r, 1],
      [board.right - b.r, -1],
    ]) {
      const t = (x - b.x) / (nx - b.x);
      if (t >= 0 && t <= 1 && b.vx * n < 0 && (!hit || t < hit.t))
        hit = { t, n };
    }
    if (!hit) {
      b.x = nx;
      b.y = ny;
      break;
    }
    b.x += (nx - b.x) * hit.t;
    b.y += (ny - b.y) * hit.t;
    let ux = hit.n || 0,
      uy = 0;
    if (hit.p) {
      const d = Math.hypot(b.x - hit.p.x, b.y - hit.p.y) || 1;
      ux = (b.x - hit.p.x) / d;
      uy = (b.y - hit.p.y) / d;
    }
    impulse(b, ux, uy, board.restitution, board.friction);
    b.x += ux * 0.025;
    b.y += uy * 0.025;
    left *= 1 - hit.t;
    onContact(hit.p ? "pin" : "wall", b, hit.p?.id);
  }
}
export function moveTray(b, tray, time, dt, onContact) {
  const omega = tray.omega;
  const relativeX = b.vx + omega * b.y,
    relativeY = b.vy - omega * b.x;
  b.vx += (-tray.spring * b.x + tray.tiltX - tray.drag * relativeX) * dt;
  b.vy += (-tray.spring * b.y + tray.tiltY - tray.drag * relativeY) * dt;
  const nx = b.x + b.vx * dt,
    ny = b.y + b.vy * dt;
  let hit = null;
  const before = holesAt(tray, time),
    after = holesAt(tray, time + dt);
  for (let i = 0; i < before.length; i++) {
    const h = before[i],
      n = after[i],
      t = sweepCircle(
        b.x - h.x,
        b.y - h.y,
        nx - n.x,
        ny - n.y,
        0,
        0,
        Math.max(0, h.r - b.r),
      );
    if (t !== null && (!hit || t < hit.t)) hit = { t, h };
  }
  if (hit) {
    b.x += (nx - b.x) * hit.t;
    b.y += (ny - b.y) * hit.t;
    return holesAt(tray, time + dt * hit.t).find((h) => h.id === hit.h.id);
  }
  b.x = nx;
  b.y = ny;
  const d = Math.hypot(b.x, b.y),
    limit = tray.radius - b.r;
  if (d > limit) {
    const ux = b.x / d,
      uy = b.y / d;
    b.x = ux * limit;
    b.y = uy * limit;
    impulse(b, -ux, -uy, 0.55, 0.18, -omega * b.y, omega * b.x);
    onContact("rim", b);
  }
  return hit?.h || null;
}
export function resolveBalls(balls, onContact, dt = 1 / 240) {
  const group = (b) => (["board", "gate"].includes(b.zone) ? "board" : b.zone);
  for (let i = 0; i < balls.length; i++)
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i],
        b = balls[j];
      if (
        group(a) !== group(b) ||
        a.stage !== b.stage ||
        !["board", "tray", "gate"].includes(a.zone)
      )
        continue;
      let dx = b.x - a.x,
        dy = b.y - a.y,
        d = Math.hypot(dx, dy);
      const r = a.r + b.r;
      if (d >= r) {
        if (
          a.prevZone !== a.zone ||
          b.prevZone !== b.zone ||
          a.prevStage !== a.stage ||
          b.prevStage !== b.stage
        )
          continue;
        const t = sweepCircle(
          a.prevX - b.prevX,
          a.prevY - b.prevY,
          a.x - b.x,
          a.y - b.y,
          0,
          0,
          r,
        );
        if (t === null) continue;
        a.x = a.prevX + (a.x - a.prevX) * t;
        a.y = a.prevY + (a.y - a.prevY) * t;
        b.x = b.prevX + (b.x - b.prevX) * t;
        b.y = b.prevY + (b.y - b.prevY) * t;
        dx = b.x - a.x;
        dy = b.y - a.y;
        d = Math.hypot(dx, dy);
        const nx = d ? dx / d : 1,
          ny = d ? dy / d : 0,
          v = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (v < 0) {
          const j = -0.82 * v;
          a.vx -= j * nx;
          a.vy -= j * ny;
          b.vx += j * nx;
          b.vy += j * ny;
        }
        a.x += a.vx * dt * (1 - t);
        a.y += a.vy * dt * (1 - t);
        b.x += b.vx * dt * (1 - t);
        b.y += b.vy * dt * (1 - t);
        onContact("ball", a);
        continue;
      }
      const nx = d ? dx / d : 1,
        ny = d ? dy / d : 0,
        overlap = (r - d) / 2 + 0.001;
      a.x -= nx * overlap;
      a.y -= ny * overlap;
      b.x += nx * overlap;
      b.y += ny * overlap;
      const v = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (v < 0) {
        const j = -0.82 * v;
        a.vx -= j * nx;
        a.vy -= j * ny;
        b.vx += j * nx;
        b.vy += j * ny;
      }
      onContact("ball", a);
    }
}
