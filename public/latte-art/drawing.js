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

function trace(context, points, dx = 0, dy = 0) {
  context.beginPath();
  context.moveTo(points[0].x + dx, points[0].y + dy);
  for (let i = 1; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    if (formsCorner(points[i - 1], from, to)) {
      context.lineTo(from.x + dx, from.y + dy);
    } else {
      context.quadraticCurveTo(from.x + dx, from.y + dy, (from.x + to.x) / 2 + dx, (from.y + to.y) / 2 + dy);
    }
  }
  const end = points.at(-1);
  context.lineTo(end.x + dx, end.y + dy);
}

function roundDrop(context, { x, y }, width, color, onLine = false) {
  const scale = onLine ? .53 : .58;
  const gloss = context.createRadialGradient(x - width * .18, y - width * .21, 0, x, y, width * scale);
  gloss.addColorStop(0, '#bb8c72');
  gloss.addColorStop(.14, '#916048');
  gloss.addColorStop(.40, '#744533');
  gloss.addColorStop(.72, color);
  gloss.addColorStop(1, onLine ? color : '#381b13');
  context.fillStyle = gloss;
  context.beginPath();
  context.arc(x, y, width * scale, 0, Math.PI * 2);
  context.fill();
}

export function paintChocolate(context, strokes) {
  context.lineCap = 'round';
  context.lineJoin = 'round';
  for (const { paths, width, color } of strokes) {
    for (const points of paths) {
      if (points.length === 1) {
        roundDrop(context, points[0], width, color);
        continue;
      }
      trace(context, points, width * .035, width * .10);
      context.strokeStyle = '#30150669';
      context.lineWidth = width * 1.11;
      context.stroke();
      trace(context, points);
      context.strokeStyle = color;
      context.lineWidth = width;
      context.stroke();
      roundDrop(context, points[0], width, color, true);
      // A soft reflection over the rounded sauce with a narrower, warm highlight.
      trace(context, points, -width * .075, -width * .11);
      context.strokeStyle = '#d69b755e';
      context.lineWidth = width * .52;
      context.stroke();
      trace(context, points, -width * .125, -width * .17);
      context.strokeStyle = '#ffe5c56b';
      context.lineWidth = width * .16;
      context.stroke();
    }
  }
}
