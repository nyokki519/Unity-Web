export const WIDTH = 1000,
  HEIGHT = 1600,
  FIXED_DT = 1 / 240,
  BALL_RADIUS = 5.5;
const finite = (v, d, min, max) =>
  Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Number(v))) : d;
export function createBoard(difficulty = "easy", overrides = {}) {
  const level = ["easy", "normal", "abyss", "custom"].includes(difficulty)
    ? difficulty
    : "easy";
  const factor = level === "normal" ? 0.76 : level === "abyss" ? 0.55 : 1;
  const pins = Array.from({ length: 300 }, (_, i) => {
    const row = Math.floor(i / 15),
      col = i % 15;
    return {
      id: i,
      x:
        90 +
        col * 52 +
        (row % 2 ? 19 : 0) +
        Math.sin(row * 1.7 + col * 0.8) * 9,
      y: 170 + row * 32 + Math.sin(col * 0.9) * 7,
      r: 5 + (i % 4) * 0.45,
    };
  });
  const trays = [220, 180, 150].map((diameter, i) => {
    const radius = diameter / 2,
      rpm = [12, -16, 20][i];
    return {
      stage: i + 1,
      cx: 500,
      cy: 1110 + i * 175,
      z: 45 + i * 25,
      diameter,
      radius,
      rpm,
      omega: (rpm * Math.PI) / 30,
      spring: [2.3, 2.8, 3.3][i],
      drag: 0.22,
      tiltX: radius * [2.3, 2.8, 3.3][i] * 0.45,
      tiltY: 0,
      holes: Array.from({ length: 3 }, (_, j) => ({
        id: j,
        x: Math.cos((j * Math.PI * 2) / 3) * radius * 0.51,
        y: Math.sin((j * Math.PI * 2) / 3) * radius * 0.51,
        r: radius * (j === 0 ? 0.22 : 0.24) * factor,
        win: j === 0,
      })),
    };
  });
  const board = {
    width: WIDTH,
    height: HEIGHT,
    left: 45,
    right: 865,
    gravity: 760,
    restitution: 0.66,
    friction: 0.16,
    ballRadius: BALL_RADIUS,
    fireInterval: 0.1,
    maxBalls: 32,
    difficulty: level,
    pins,
    trays,
    launcher: { x: 930, y: 1450 },
    entry: {
      x: 500,
      y: 920,
      width: level === "easy" ? 250 : level === "normal" ? 155 : 95,
    },
    gate: {
      x: 500,
      y: 950,
      width: level === "easy" ? 230 : level === "normal" ? 140 : 80,
      height: 14,
      period: 2.8,
      openDuration: level === "easy" ? 1.9 : level === "normal" ? 1.05 : 0.55,
      phase: 0,
    },
  };
  for (const k of [
    "gravity",
    "restitution",
    "friction",
    "fireInterval",
    "maxBalls",
  ])
    if (k in overrides)
      board[k] = finite(
        overrides[k],
        board[k],
        k === "gravity" ? 0 : 0,
        k === "gravity"
          ? 3000
          : k === "maxBalls"
            ? 32
            : k === "fireInterval"
              ? 10
              : 1,
      );
  board.fireInterval = Math.max(0.1, board.fireInterval);
  board.maxBalls = Math.max(1, Math.floor(board.maxBalls));
  if (overrides.gate && typeof overrides.gate === "object")
    for (const k of ["period", "openDuration", "phase", "width"])
      if (k in overrides.gate)
        board.gate[k] = finite(
          overrides.gate[k],
          board.gate[k],
          k === "period" ? 0.1 : 0,
          k === "width" ? 600 : 60,
        );
  board.launchAngle = finite(overrides.launchAngle, -103, -175, -5);
  board.launchVariance = finite(overrides.launchVariance, 1, 0, 12);
  board.gate.period = finite(overrides.gatePeriod, board.gate.period, 0.1, 60);
  board.gate.openDuration = finite(
    overrides.gateOpenDuration,
    board.gate.openDuration,
    0,
    60,
  );
  const holeScale = finite(overrides.holeScale, 1, 0.35, 1.5);
  board.trays.forEach((t, i) => {
    t.rpm = finite(overrides.trayRPM?.[i], t.rpm, -60, 60);
    t.omega = (t.rpm * Math.PI) / 30;
    t.holes.forEach((h) => (h.r *= holeScale));
  });
  if (["left", "right"].includes(overrides.pinPreset))
    board.pins.forEach((p, i) => {
      p.x +=
        Math.sin(Math.floor(i / 15) * 0.8) *
        (overrides.pinPreset === "left" ? -20 : 20);
    });
  if (Array.isArray(overrides.pinAdjustments))
    for (const a of overrides.pinAdjustments.slice(0, 300)) {
      if (Number.isInteger(a?.index) && board.pins[a.index]) {
        const p = board.pins[a.index];
        p.x += finite(a.dx, 0, -20, 20);
        p.y += finite(a.dy, 0, -12, 12);
      }
    }
  return board;
}
export function holesAt(tray, time) {
  const a = tray.omega * time,
    c = Math.cos(a),
    s = Math.sin(a);
  return tray.holes.map((h) => ({
    ...h,
    x: h.x * c - h.y * s,
    y: h.x * s + h.y * c,
  }));
}
export function gateIsOpen(gate, time) {
  return (
    (((time + gate.phase) % gate.period) + gate.period) % gate.period <
    gate.openDuration
  );
}

export function gateAt(gate, time) {
  const phase =
      (((time + gate.phase) % gate.period) + gate.period) % gate.period,
    open = gateIsOpen(gate, time);
  const ramp = Math.min(0.18, gate.openDuration / 3);
  const travel = open
    ? ramp
      ? Math.min(1, phase / ramp, (gate.openDuration - phase) / ramp)
      : 1
    : 0;
  return {
    ...gate,
    open,
    offset: travel * (gate.width + 20),
    barX: gate.x + travel * (gate.width + 20),
  };
}
