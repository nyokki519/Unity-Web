import { buildTrays } from "./tray-layout.js";
import { buildPinRoutes } from "./board-routes.js";
import {
  vec,
  identity,
  fromY,
  box,
  rod,
  chute,
  bowlMesh,
  shaftMesh,
  bowlHeight,
} from "./si-geometry.js";
export const PHYSICS_VERSION = "si-4",
  WIDTH = 1000,
  HEIGHT = 1600,
  FIXED_DT = 1 / 240,
  BALL_RADIUS = 0.0055,
  BALL_MASS = 0.0055,
  PX_PER_METER = 2000;
const clamp = (v, d, a, b) =>
  Number.isFinite(Number(v)) ? Math.min(b, Math.max(a, Number(v))) : d;
export function gateAt(g, time) {
  const phase = (((time + g.phase) % g.period) + g.period) % g.period,
    ramp = Math.min(0.25, g.openDuration / 3),
    f =
      phase < g.openDuration && ramp
        ? Math.max(
            0,
            Math.min(1, phase / ramp, (g.openDuration - phase) / ramp),
          )
        : 0;
  return {
    position: vec(g.x + (g.width + 0.014) * f, g.y, g.z),
    rotation: identity(),
    open: f > 0.85,
    offset: (g.width + 0.014) * f,
  };
}
export function holesAt(tray) {
  return tray.holes;
}
export function createBoard(difficulty = "easy", overrides = {}) {
  const level = ["easy", "normal", "abyss", "custom"].includes(difficulty)
      ? difficulty
      : "easy",
    easy = level === "easy",
    hard = level === "abyss";
  const board = {
    physicsVersion: PHYSICS_VERSION,
    units: "m-s-kg",
    width: 0.5,
    height: 0.8,
    presentation: { width: WIDTH, height: HEIGHT, pxPerMeter: PX_PER_METER },
    difficulty: level,
    ballRadius: BALL_RADIUS,
    ballMass: BALL_MASS,
    gravity: clamp(overrides.gravity, 9.80665, 1, 15),
    friction: clamp(overrides.friction, 0.18, 0.01, 1),
    restitution: clamp(overrides.restitution, 0.68, 0, 0.9),
    fireInterval: clamp(overrides.fireInterval, 0.6, 0.1, 3),
    maxBalls: Math.floor(clamp(overrides.maxBalls, 24, 1, 32)),
    launchVariance: clamp(overrides.launchVariance, 0.012, 0, 0.1),
    launcher: vec(0.455, 0.045, 0.007),
    entry: { x: 0.25, y: 0.35, width: easy ? 0.065 : hard ? 0.019 : 0.032 },
    parts: [],
    pins: [],
    trays: [],
    evidence: {
      source: "Offline Research Pack v1.0",
      confidence: "secondary-note",
      measuredOrEstimated:
        "ball standard summary; all mechanisms original provisional",
      ballDiameter: {
        value: 0.011,
        source: "offline-pack/03_ENGINEERING/01_DIMENSIONS_AND_PHYSICS.md",
        confidence: "secondary-note",
        measuredOrEstimated: "reported-standard",
      },
      ballMass: {
        value: 0.0055,
        source: "same note: 5.4–5.7g",
        confidence: "secondary-note",
        measuredOrEstimated: "adopted-within-reported-range",
      },
      mechanisms: {
        source: "JACKPOT_REDESIGN.md",
        confidence: "E",
        measuredOrEstimated: "original-provisional",
      },
    },
  };
  const p = board.parts;
  box(p, "back", "back", vec(0.25, 0.4, -0.003), vec(0.25, 0.4, 0.003));
  box(
    p,
    "upper-glass",
    "glass",
    vec(0.235, 0.565, 0.017),
    vec(0.205, 0.215, 0.001),
    identity(),
    { visible: false },
  );
  box(
    p,
    "rail-glass",
    "glass",
    vec(0.455, 0.4, 0.017),
    vec(0.018, 0.38, 0.001),
    identity(),
    { visible: false },
  );
  // Two physical guide rails, including a continuous upper arc. No launch teleport.
  for (const [x, id] of [
    [0.444, "inner"],
    [0.466, "outer"],
  ])
    rod(
      p,
      `rail-${id}`,
      "rail",
      vec(x, 0.025, 0.007),
      vec(x, 0.55, 0.007),
      0.002,
    );
  for (const [r, id] of [
    [0.1958, "inner"],
    [0.2142, "outer"],
  ]) {
    const vertices = [],
      indices = [],
      count = 100;
    for (let i = 0; i <= count; i++) {
      const a = (i * 150 * Math.PI) / 180 / count;
      for (const z of [-0.004, 0.019])
        vertices.push(0.25 + r * Math.cos(a), 0.55 + r * Math.sin(a), z);
    }
    for (let i = 0; i < count; i++) {
      const a = i * 2,
        b = a + 1,
        c = a + 2,
        d = a + 3;
      indices.push(a, b, c, b, d, c);
    }
    p.push({
      id: `arc-${id}`,
      kind: "mesh",
      tag: "rail",
      position: vec(),
      rotation: identity(),
      vertices: new Float32Array(vertices),
      indices: new Uint32Array(indices),
      friction: 0.01,
      restitution: 0,
    });
  }
  rod(
    p,
    "upper-deflector",
    "rail",
    vec(0.035, 0.646, 0.007),
    vec(0.115, 0.565, 0.007),
    0.0025,
    { friction: 0.03, restitution: 0.15 },
  );
  rod(
    p,
    "board-left",
    "rail",
    vec(0.035, 0.34, 0.007),
    vec(0.035, 0.675, 0.007),
    0.0025,
  );
  rod(
    p,
    "board-right",
    "rail",
    vec(0.421, 0.34, 0.007),
    vec(0.421, 0.59, 0.007),
    0.0025,
  );
  buildPinRoutes(board, overrides);
  board.gate = {
    x: 0.25,
    y: 0.343,
    z: 0.007,
    width: board.entry.width,
    height: 0.004,
    depth: 0.025,
    period: clamp(overrides.gatePeriod, 3, 0.5, 15),
    openDuration: clamp(
      overrides.gateOpenDuration,
      easy ? 2 : hard ? 0.7 : 1.2,
      0.15,
      12,
    ),
    phase: 0,
  };
  box(
    p,
    "gate",
    "gate",
    vec(0.25, 0.343, 0.007),
    vec(board.gate.width / 2, 0.002, 0.013),
  );
  buildTrays(board, overrides);
  return board;
}
