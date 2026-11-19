const foamDisk = { x: 0, y: 0, radius: 1 };
const inside = (point, bounds) => bounds.every(circle =>
  (point.x - circle.x) ** 2 + (point.y - circle.y) ** 2 <= circle.radius ** 2);

// Exactly one endpoint is on the foam. Keep the part of the gesture that reaches the rim.
function rimIntersection(interior, exterior, bounds) {
  const dx = exterior.x - interior.x;
  const dy = exterior.y - interior.y;
  const a = dx ** 2 + dy ** 2;
  let t = 1;
  for (const circle of bounds) {
    const x = interior.x - circle.x;
    const y = interior.y - circle.y;
    const b = x * dx + y * dy;
    const c = x ** 2 + y ** 2 - circle.radius ** 2;
    const exit = (-b + Math.sqrt(Math.max(0, b * b - a * c))) / a;
    t = Math.min(t, Math.max(0, exit));
  }
  return { x: interior.x + t * dx, y: interior.y + t * dy };
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

function trace(context, points, offset) {
  context.beginPath();
  context.moveTo(points[0].x, points[0].y - offset);
  for (let i = 1; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    if (formsCorner(points[i - 1], from, to)) {
      context.lineTo(from.x, from.y - offset);
    } else {
      context.quadraticCurveTo(from.x, from.y - offset, (from.x + to.x) / 2, (from.y + to.y) / 2 - offset);
    }
  }
  const end = points.at(-1);
  context.lineTo(end.x, end.y - offset);
}

export function paintChocolate(context, strokes) {
  context.lineCap = 'round';
  context.lineJoin = 'round';
  for (const { paths, width, color } of strokes) {
    for (const points of paths) {
      if (points.length === 1) {
        const { x, y } = points[0];
        const drop = context.createRadialGradient(x - width * 0.18, y - width * 0.2, 0, x, y, width * 0.56);
        drop.addColorStop(0, '#936657');
        drop.addColorStop(0.46, color);
        drop.addColorStop(1, color);
        context.fillStyle = drop;
        context.beginPath();
        context.arc(x, y, width * 0.56, 0, Math.PI * 2);
        context.fill();
        continue;
      }
      trace(context, points, -width * 0.09);
      context.strokeStyle = '#46231c35';
      context.lineWidth = width * 1.12;
      context.stroke();
      trace(context, points, 0);
      context.strokeStyle = color;
      context.lineWidth = width;
      context.stroke();
      trace(context, points, width * 0.18);
      context.strokeStyle = '#fff0d435';
      context.lineWidth = width * 0.26;
      context.stroke();
    }
  }
}
