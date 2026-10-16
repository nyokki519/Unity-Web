import {
  vec,
  identity,
  rod,
  chute,
  bowlMesh,
  shaftMesh,
  bowlHeight,
} from "./si-geometry.js";
const BALL_RADIUS = 0.0055;
export function buildTrays(board, overrides = {}) {
  const p = board.parts,
    easy = board.difficulty === "easy",
    hard = board.difficulty === "abyss",
    clamp = (v, d, a, b) =>
      Number.isFinite(Number(v)) ? Math.max(a, Math.min(b, Number(v))) : d;
  const holeScale = clamp(overrides.holeScale, 1, 0.7, 1.3),
    counts = easy ? [3, 3, 3] : [3, 4, 5];
  for (let i = 0; i < 3; i++) {
    const radius =
        [0.0675, 0.0625, 0.0575][i] * clamp(overrides.cradleScale, 1, 0.8, 1.2),
      cy = [0.25, 0.145, 0.04][i],
      cz = 0.115 + i * 0.005,
      ratio = easy ? 1.95 : hard ? 1.3 : 1.55;
    const drainAngle = i * 0.7 + (easy ? 0 : (2 * Math.PI) / counts[i]);
    const t = {
      profile: "orbital",
      stage: i + 1,
      cx: 0.25,
      cy,
      cz,
      radius,
      diameter: radius * 2,
      depth: 0.014 * clamp(overrides.cradleDepthScale, 1, 0.7, 1.3),
      valleyRadius: radius * 0.5,
      centerRise: 0.007,
      tilt: -0.1 * Math.cos(drainAngle),
      tiltZ: -0.1 * Math.sin(drainAngle),
      rpm: 0,
      omega: 0,
      holes: [],
      evidence: "E: original curved fixed dish; not machine measurement",
    };
    for (let j = 0; j < counts[i]; j++) {
      const a = i * 0.7 + (j * 2 * Math.PI) / counts[i],
        distance =
          t.valleyRadius -
          ((t.tilt * Math.cos(a) + t.tiltZ * Math.sin(a)) *
            (t.radius - t.valleyRadius) ** 2) /
            (2 * t.depth);
      t.holes.push({
        id: j,
        x: distance * Math.cos(a),
        z: distance * Math.sin(a),
        r: Math.max(
          BALL_RADIUS * 1.14,
          Math.min(
            (easy ? 0.0105 : hard ? 0.0076 : 0.0088) * holeScale,
            radius * 0.18,
          ),
        ),
        win: j === (i === 1 ? (easy ? 0 : 1) : hard ? 2 : 1),
      });
    }
    const wallVertices = [],
      wallIndices = [];
    for (let j = 0; j <= 96; j++) {
      const a = (j * 2 * Math.PI) / 96;
      for (const y of [cy - 0.006, cy + 0.025])
        wallVertices.push(
          t.cx + radius * Math.cos(a),
          y,
          cz + radius * Math.sin(a),
        );
    }
    for (let j = 0; j < 96; j++) {
      const k = j * 2;
      wallIndices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
    p.push({
      id: `outer-wall-${i}`,
      kind: "mesh",
      tag: "rim",
      position: vec(),
      rotation: identity(),
      vertices: new Float32Array(wallVertices),
      indices: new Uint32Array(wallIndices),
      friction: 0.08,
      restitution: 0.05,
    });
    board.trays.push(t);
    p.push({
      id: `bowl-${i}`,
      kind: "mesh",
      tag: "bowl",
      position: vec(),
      rotation: identity(),
      ...bowlMesh(t),
      friction: 0.025,
      restitution: 0.08,
    });
    for (let j = 0; j < 72; j++) {
      const a = (j * 2 * Math.PI) / 72,
        b = ((j + 1) * 2 * Math.PI) / 72;
      rod(
        p,
        `rim-${i}-${j}`,
        "rim",
        vec(t.cx + radius * Math.cos(a), cy + 0.025, cz + radius * Math.sin(a)),
        vec(t.cx + radius * Math.cos(b), cy + 0.025, cz + radius * Math.sin(b)),
        0.003,
      );
    }
    for (const h of t.holes) {
      p.push({
        id: `shaft-${i}-${h.id}`,
        kind: "mesh",
        tag: "shaft",
        win: h.win,
        position: vec(),
        rotation: identity(),
        ...shaftMesh(t, h),
        friction: 0.12,
        restitution: 0.08,
      });
      if (!h.win) {
        const sy = bowlHeight(t, h.x, h.z) - 0.018;
        chute(
          p,
          `reject-${i}-${h.id}`,
          [
            vec(t.cx + h.x, sy, cz + h.z),
            vec(
              t.cx + Math.cos(Math.atan2(h.z, h.x)) * (radius + 0.045),
              sy - 0.045,
              cz + Math.sin(Math.atan2(h.z, h.x)) * (radius + 0.045),
            ),
          ],
          0.026,
        );
      }
    }
  }
  const first = board.trays[0];
  chute(
    p,
    "gate-entry",
    [
      vec(0.25, 0.335, 0.007),
      vec(first.cx - first.radius * 0.67, 0.284, first.cz - 0.02),
    ],
    [board.entry.width + 0.024, 0.032],
  );
  for (let i = 0; i < 2; i++) {
    const t = board.trays[i],
      next = board.trays[i + 1],
      h = t.holes.find((h) => h.win),
      sy = bowlHeight(t, h.x, h.z) - 0.02,
      ex = next.cx + next.radius * 0.67;
    chute(
      p,
      `transfer-${i}`,
      [
        vec(t.cx + h.x, sy, t.cz + h.z),
        vec(next.cx - next.radius * 0.45, next.cy + 0.033, next.cz - 0.02),
      ],
      0.026,
    );
  }
}
