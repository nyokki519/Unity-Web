import { vec, fromY, box } from "./si-geometry.js";
// Original layout. Supports are visible brass rails beneath the nail heads;
// every spill is also absent from the collider, never an invisible catch floor.
export function buildPinRoutes(board, overrides = {}) {
  const parts = board.parts,
    clamp = (v, d, a, b) =>
      Number.isFinite(Number(v)) ? Math.max(a, Math.min(b, Number(v))) : d;
  const addPin = (x, y, role) => {
    const id = board.pins.length,
      a = overrides.pinAdjustments?.find((v) => v.index === id);
    x +=
      (overrides.pinPreset === "left"
        ? -0.003
        : overrides.pinPreset === "right"
          ? 0.003
          : 0) + clamp(a?.dx, 0, -0.006, 0.006);
    y += clamp(a?.dy, 0, -0.006, 0.006);
    const pin = { id, x, y, z: 0.007, r: 0.00125, role };
    board.pins.push(pin);
    parts.push({
      id: `pin-${id}`,
      tag: "pin",
      kind: "cylinder",
      pinId: id,
      position: vec(x, y, 0.007),
      rotation: fromY(
        vec(
          Math.sin((clamp(a?.angle, 0, -15, 15) * Math.PI) / 180),
          0,
          Math.cos((clamp(a?.angle, 0, -15, 15) * Math.PI) / 180),
        ),
      ),
      radius: pin.r,
      halfHeight: 0.009,
      restitution: clamp(a?.restitution, board.restitution, 0, 0.9),
    });
  };
  board.routes = [
    {
      id: "upper-road",
      a: [0.035, 0.548],
      b: [0.318, 0.492],
      spills: [0.3, 0.64],
    },
    {
      id: "return-road",
      a: [0.421, 0.466],
      b: [0.145, 0.41],
      spills: [0.38, 0.74],
    },
    { id: "entry-road", a: [0.035, 0.395], b: [0.231, 0.353], spills: [0.24] },
    {
      id: "right-entry-road",
      a: [0.421, 0.393],
      b: [0.273, 0.353],
      spills: [0.22],
    },
  ];
  for (const route of board.routes) {
    const { a, b } = route,
      length = Math.hypot(b[0] - a[0], b[1] - a[1]),
      n = Math.ceil(length / 0.0095),
      gap = 0.017 / length;
    const at = (t) =>
      vec(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 0.007);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      if (!route.spills.some((s) => Math.abs(t - s) < gap / 2)) {
        const p = at(t);
        addPin(p.x, p.y, "道釘");
      }
    }
    let from = 0;
    for (const s of [...route.spills, 1 + gap / 2]) {
      const to = Math.min(1, s - gap / 2);
      if (to > from) {
        const a = at(from),
          b = at(to),
          dx = b.x - a.x,
          dy = b.y - a.y;
        box(
          parts,
          `${route.id}-${from.toFixed(3)}`,
          "support",
          vec((a.x + b.x) / 2, (a.y + b.y) / 2, 0.007),
          vec(0.0014, Math.hypot(dx, dy) / 2, 0.012),
          fromY(vec(dx, dy, 0)),
          { friction: 0.025, restitution: 0.12 },
        );
      }
      from = s + gap / 2;
    }
    for (const t of route.spills) {
      const p = at(t - gap * 0.75);
      addPin(p.x, p.y + 0.018, "こぼし");
    }
  }
  const dist = (x, y, r) => {
    const [a, b] = [r.a, r.b],
      dx = b[0] - a[0],
      dy = b[1] - a[1],
      t = Math.max(
        0,
        Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)),
      );
    return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
  };
  for (let row = 0; row < 8; row++)
    for (let col = 0; col < 13; col++) {
      const x = 0.057 + col * 0.027 + (row % 2) * 0.0135,
        y = 0.644 - row * 0.028;
      const nearRail = parts.some(
        (p) =>
          p.tag === "rail" &&
          p.start &&
          dist(x, y, { a: [p.start.x, p.start.y], b: [p.end.x, p.end.y] }) <
            p.radius + 0.00125 + 0.0125,
      );
      if (
        nearRail ||
        x > 0.406 ||
        board.routes.some((r) => dist(x, y, r) < 0.019) ||
        board.pins.some((p) => Math.hypot(x - p.x, y - p.y) < 0.018)
      )
        continue;
      addPin(x, y, row < 2 ? "天釘" : row < 5 ? "散らし釘" : "寄り釘");
    }
  for (const s of [-1, 1]) {
    addPin(0.25 + s * 0.014, 0.372, "ジャンプ釘");
    addPin(0.25 + s * (board.entry.width / 2 + 0.008), 0.326, "命釘");
  }
}
