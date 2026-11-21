const foamDisk = { x: 0, y: 0, radius: 1 };
const inside = (point, bounds) => bounds.every(circle =>
  (point.x - circle.x) ** 2 + (point.y - circle.y) ** 2 <= circle.radius ** 2);

export function liquidContains(point, clips) {
  return Boolean(point && inside(point, [foamDisk, ...clips]));
}

// Exactly one endpoint is on the foam. Keep the part of the gesture that reaches the rim.
function exitFraction(interior, exterior, bounds) {
  const dx = exterior.x - interior.x;
  const dy = exterior.y - interior.y;
  const a = dx ** 2 + dy ** 2;
  if (!a) return 0;
  let t = 1;
  for (const circle of bounds) {
    const x = interior.x - circle.x;
    const y = interior.y - circle.y;
    const b = x * dx + y * dy;
    const c = x ** 2 + y ** 2 - circle.radius ** 2;
    const exit = (-b + Math.sqrt(Math.max(0, b * b - a * c))) / a;
    t = Math.min(t, Math.max(0, exit));
  }
  return t;
}

function pointAlong(from, to, t) {
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

function rimIntersection(interior, exterior, bounds) {
  return pointAlong(interior, exterior, exitFraction(interior, exterior, bounds));
}

export function liquidExit(interior, exterior, clips) {
  const fraction = exitFraction(interior, exterior, [foamDisk, ...clips]);
  return { position: pointAlong(interior, exterior, fraction), fraction };
}

export class ChocolateDrawing {
  strokes = [];
  #active = null;

  get activeStroke() { return this.#active?.stroke ?? null; }

  start(pointerId, point, width, color = '#4c281b', clips = []) {
    const bounds = [foamDisk, ...clips];
    if (this.#active || !point || !inside(point, bounds)) return false;
    const stroke = { width, color, paths: [[point]] };
    this.strokes.push(stroke);
    this.#active = { pointerId, stroke, bounds, previous: point };
    return true;
  }

  move(pointerId, points) {
    const active = this.#active;
    if (active?.pointerId !== pointerId) return false;
    const { stroke, bounds } = active;
    let changed = false;
    for (const point of points) {
      const previous = active.previous;
      const wasInside = previous && inside(previous, bounds);
      const isInside = point && inside(point, bounds);
      if (wasInside && isInside && Math.hypot(point.x - previous.x, point.y - previous.y) < 0.0005) continue;
      if (wasInside && isInside) {
        stroke.paths.at(-1).push(point);
      } else if (wasInside && point) {
        stroke.paths.at(-1).push(rimIntersection(previous, point, bounds));
      } else if (isInside) {
        stroke.paths.push(previous ? [rimIntersection(point, previous, bounds), point] : [point]);
      }
      changed ||= Boolean(wasInside || isInside);
      active.previous = point;
    }
    return changed;
  }

  end(pointerId) {
    if (this.#active?.pointerId === pointerId) this.#active = null;
  }

  cancel() {
    this.#active = null;
  }

  undo() {
    this.cancel();
    this.strokes.pop();
  }

  clear() {
    this.cancel();
    this.strokes.length = 0;
  }
}

function formsCorner(previous, point, next) {
  const ax = point.x - previous.x;
  const ay = point.y - previous.y;
  const bx = next.x - point.x;
  const by = next.y - point.y;
  const before = ax * ax + ay * ay;
  const after = bx * bx + by * by;
  if (Math.min(before, after) < .0001) return false;
  return ax * bx + ay * by <= 0;
}

// Sample the smoothed centerline closely enough for adjacent deposits to merge.
function chocolateDeposits(points, width) {
  const spacing = Math.max(.0025, width * .16);
  const samples = [{ ...points[0], distance: 0 }];
  function append(end, control) {
    const start = samples.at(-1);
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    const controlLength = control && (Math.hypot(control.x - start.x, control.y - start.y)
      + Math.hypot(end.x - control.x, end.y - control.y));
    const steps = Math.max(1, Math.ceil((controlLength ?? length) / spacing));
    for (let index = 1; index <= steps; index++) {
      const t = index / steps;
      const point = control
        ? pointAlong(pointAlong(start, control, t), pointAlong(control, end, t), t)
        : pointAlong(start, end, t);
      const previous = samples.at(-1);
      point.distance = previous.distance + Math.hypot(point.x - previous.x, point.y - previous.y);
      samples.push(point);
    }
  }
  for (let index = 1; index < points.length - 1; index++) {
    const point = points[index];
    if (formsCorner(points[index - 1], point, points[index + 1])) append(point);
    else append(pointAlong(point, points[index + 1], .5), point);
  }
  append(points.at(-1));
  const total = samples.at(-1).distance;
  const taperLength = Math.min(width * 3.4, total * .42);
  for (const point of samples) {
    const contact = .37 * Math.exp(-point.distance / (width * .78));
    const lift = taperLength ? Math.min(1, (total - point.distance) / taperLength) : 1;
    const variation = .07 * Math.sin(point.distance * 39) + .045 * Math.sin(point.distance * 91);
    point.radius = width * .5 * (1 + contact + variation) * (.37 + .63 * Math.sqrt(lift));
  }
  return samples;
}

function paintDepositLayer(context, samples, color, scale, offsetX = 0, offsetY = 0) {
  context.fillStyle = color;
  context.beginPath();
  for (const point of samples) {
    const x = point.x + point.radius * offsetX;
    const y = point.y + point.radius * offsetY;
    const radius = point.radius * scale;
    context.moveTo(x + radius, y);
    context.arc(x, y, radius, 0, Math.PI * 2);
  }
  context.fill();
}

function roundDrop(context, { x, y }, width, color) {
  const radius = width * .77;
  const chocolate = context.createRadialGradient(x - radius * .24, y - radius * .29, 0, x, y, radius);
  chocolate.addColorStop(0, '#d8ac89');
  chocolate.addColorStop(.17, '#956249');
  chocolate.addColorStop(.44, '#633a29');
  chocolate.addColorStop(.74, color);
  chocolate.addColorStop(.88, '#70452eca');
  chocolate.addColorStop(1, '#8e613c00');
  context.fillStyle = chocolate;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

export function paintChocolate(context, strokes) {
  for (const { paths, width, color } of strokes) {
    for (const points of paths) {
      if (points.length === 1) {
        roundDrop(context, points[0], width, color);
        continue;
      }
      const deposits = chocolateDeposits(points, width);
      paintDepositLayer(context, deposits, '#a16a4236', 1.23, .045, .10);
      paintDepositLayer(context, deposits, '#663b2758', 1.09, .025, .07);
      paintDepositLayer(context, deposits, color, .94);
      paintDepositLayer(context, deposits, '#c28b6358', .55, -.16, -.22);
      const shine = deposits.filter(point => point.radius > width * .43
        && Math.sin(point.distance * 68) + .45 * Math.sin(point.distance * 157) > .48);
      paintDepositLayer(context, shine, '#efd4b878', .17, -.29, -.36);
    }
  }
}
