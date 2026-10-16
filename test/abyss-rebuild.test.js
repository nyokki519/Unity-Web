import test from "node:test";
import assert from "node:assert/strict";
import { createBoard } from "../public/js/abyss/si-config.js";
import { createSimulation } from "../public/js/abyss/si-engine.js";
test("rebuild exposes designed lanes and physical spill gaps instead of a sparse scatter", () => {
  const b = createBoard();
  assert.equal(b.physicsVersion, "si-4");
  for (const role of ["道釘", "こぼし", "ジャンプ釘", "天釘"])
    assert.ok(
      b.pins.some((p) => p.role === role),
      role,
    );
  assert.ok(b.routes.length >= 3);
  assert.ok(b.parts.some((p) => p.tag === "support"));
});
test("stronger natural shots still spend time in the pin routes and rebound laterally", () => {
  const g = createSimulation({ seed: "lanterna-comparison", initialBalls: 12 });
  let next = 0;
  const paths = new Map();
  try {
    while (g.status === "running" && g.elapsed < 65) {
      if (g.remaining && g.elapsed >= next) {
        g.fire(45);
        next = g.elapsed + 1;
      }
      g.step(1 / 240);
      for (const b of g.balls) {
        if (b.zone !== "board") continue;
        const p = paths.get(b.id) || { time: 0, turns: 0, sign: 0 };
        p.time += 1 / 240;
        const s = Math.abs(b.vx) > 0.04 ? Math.sign(b.vx) : 0;
        if (s && p.sign && s !== p.sign) p.turns++;
        if (s) p.sign = s;
        paths.set(b.id, p);
      }
    }
    assert.ok(g.stats.contacts.pin >= 40, `contacts ${g.stats.contacts.pin}`);
    assert.ok(
      [...paths.values()].filter((p) => p.time > 0.6 && p.turns >= 3).length >=
        4,
      JSON.stringify([...paths.values()]),
    );
    assert.equal(g.balls.length, 0);
  } finally {
    g.dispose();
  }
});
test("dishes have comparable peripheral apertures and a genuine orbital floor", () => {
  for (const level of ["easy", "normal", "abyss"])
    for (const t of createBoard(level).trays) {
      assert.equal(t.profile, "orbital");
      assert.ok(t.holes.every((h) => Math.hypot(h.x, h.z) > 0.3 * t.radius));
      assert.ok(
        Math.max(...t.holes.map((h) => h.r)) /
          Math.min(...t.holes.map((h) => h.r)) <
          1.01,
      );
    }
});
test("SI-4 can save tuning for its extra pins without loosening old formats", async () => {
  const { validateImport } = await import("../public/js/abyss/storage.js");
  const preset = {
    version: 2,
    physicsVersion: "si-4",
    kind: "preset",
    difficulty: "custom",
    seed: "tuning",
    config: { pinAdjustments: [{ index: 160, dx: 0.001 }] },
  };
  assert.doesNotThrow(() => validateImport(preset));
  assert.throws(() =>
    validateImport({
      ...preset,
      config: { pinAdjustments: [{ index: 177, dx: 0.001 }] },
    }),
  );
  assert.throws(() => validateImport({ ...preset, physicsVersion: "si-3" }));
});
test("SI-3 records replay through the frozen curved model", async () => {
  const { createSimulation: previous } = await import(
    "../public/js/abyss/si-v3/si-engine.js"
  );
  const { exportSession } = await import("../public/js/abyss/storage.js");
  const { createReplay } = await import("../public/js/abyss/replay.js");
  const g = previous({ seed: "preserved-si3", initialBalls: 1 });
  let r;
  try {
    g.fire(35);
    g.step(2);
    r = createReplay(exportSession(g));
    r.step(g.tick);
    assert.deepEqual(r.game.snapshot(), g.snapshot());
  } finally {
    r?.game.dispose();
    g.dispose();
  }
});
test("a resting ball at the upper rail junction drains instead of forming a pocket", () => {
  const g = createSimulation({ debug: true, initialBalls: 1 });
  try {
    const b = g.debugDrop(0);
    b.zone = "board";
    const position = { x: 0.04221266, y: 0.65308589, z: 0.01051 };
    g.debugSetBall(b.id, { position, velocity: { x: 0, y: 0, z: 0 } });
    g.step(5);
    const current = g.balls.find((v) => v.id === b.id);
    assert.ok(
      !current ||
        Math.hypot(current.x - position.x, current.y - position.y) > 0.025,
    );
  } finally {
    g.dispose();
  }
});
test("rejected launch at the live-ball cap does not change the saved random sequence", () => {
  const a = createSimulation({
      seed: "cap-replay",
      initialBalls: 2,
      config: { maxBalls: 1 },
    }),
    b = createSimulation({
      seed: "cap-replay",
      initialBalls: 2,
      config: { maxBalls: 1 },
    });
  try {
    a.fire(45);
    b.fire(45);
    a.step(0.7);
    b.step(0.7);
    assert.equal(a.fire(45), false);
    for (let i = 0; i < 240 * 65 && a.balls.length; i++) {
      a.step(1 / 240);
      b.step(1 / 240);
    }
    assert.equal(a.balls.length, 0);
    assert.equal(a.fire(45), true);
    assert.equal(b.fire(45), true);
    assert.deepEqual(a.snapshot(), b.snapshot());
  } finally {
    a.dispose();
    b.dispose();
  }
});
