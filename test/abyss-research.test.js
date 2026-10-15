import test from "node:test";
import assert from "node:assert/strict";
import { wilson, summarize, toCSV } from "../public/js/abyss/analysis.js";
import {
  validateImport,
  exportSession,
  loadSettings,
  validateSettings,
} from "../public/js/abyss/storage.js";
import { createReplay } from "../public/js/abyss/replay.js";
import { createSimulation } from "../public/js/abyss/engine.js";
import { FIXED_DT } from "../public/js/abyss/config.js";
import {
  randomFromSeed,
  approximateTrial,
} from "../public/js/abyss/research-worker.js";
test("Wilson intervals and conditional denominators", () => {
  assert.deepEqual(wilson(0, 0), { low: 0, high: 1 });
  const interval = wilson(50, 100);
  assert.ok(Math.abs(interval.low - 0.40383) < 0.0001);
  const rows = summarize({
    stats: {
      forestAttempts: 100,
      forestPasses: 20,
      gateReached: 20,
      gateAttempts: 90,
      gatePasses: 5,
      trayEntries: [5, 2, 1],
      trayPasses: [2, 1, 0],
    },
  });
  assert.equal(rows[1].rate, 0.25);
  assert.equal(rows[2].reached, 5);
  assert.match(rows[4].label, /標本不足/);
  assert.match(toCSV([{ label: 'a"b' }]), /a""b/);
});
test("session export replay preserves tick inputs and physical outcome", () => {
  const g = createSimulation({ seed: "replay", initialBalls: 3 });
  g.fire(55, -103);
  for (let i = 0; i < 40; i++) g.step(FIXED_DT);
  g.fire(60, -100);
  for (let i = 0; i < 1200; i++) g.step(FIXED_DT);
  const record = exportSession(g),
    replay = createReplay(record);
  replay.step(g.tick);
  assert.deepEqual(replay.game.snapshot(), g.snapshot());
  assert.equal(replay.finished, true);
  assert.equal(g.inputs[0].type, "fire");
});
test("import rejects malformed and unsafe schemas", () => {
  const record = exportSession(createSimulation());
  for (const change of [
    { version: 2 },
    { seed: "x".repeat(129) },
    { config: { gravity: Infinity } },
    { config: { gravity: 3001 } },
    { config: { unknown: 1 } },
    { inputs: [{ tick: 0, power: 101, angle: -100 }] },
    { elapsed: NaN },
    { unexpected: true },
  ])
    assert.throws(() => validateImport({ ...record, ...change }));
  assert.throws(() =>
    validateImport(JSON.parse('{"__proto__":{},"version":1}')),
  );
  assert.throws(() =>
    validateImport({ ...record, config: Object.create({ gravity: 10 }) }),
  );
  assert.equal(
    validateImport({
      version: 1,
      kind: "preset",
      seed: "x",
      difficulty: "custom",
      config: { gravity: 500 },
    }).kind,
    "preset",
  );
});
test("approximation is seeded and applies conditional stages", () => {
  function run() {
    const random = randomFromSeed("test"),
      counts = { reached: [0, 0, 0, 0, 0], passed: [0, 0, 0, 0, 0] };
    for (let i = 0; i < 1000; i++)
      approximateTrial(random, [0.5, 0.5, 0.5, 0.5, 0.5], counts);
    return counts;
  }
  assert.deepEqual(run(), run());
  const c = run();
  assert.equal(c.reached[1], c.passed[0]);
  assert.equal(c.reached[4], c.passed[3]);
});
test("missing IndexedDB rejects clearly", async () => {
  if (!globalThis.indexedDB)
    await assert.rejects(loadSettings(), /unavailable/);
});

test("settings permit validated nested board config", () => {
  assert.doesNotThrow(() =>
    validateSettings({
      config: {
        gravity: 760,
        gatePeriod: 2.8,
        trayRPM: [12, -16, 20],
        pinPreset: "default",
      },
      power: 55,
    }),
  );
  assert.throws(() => validateSettings({ config: { gravity: 3001 } }));
  assert.throws(() => validateSettings({ config: { unknown: true } }));
});
test("negative ticks, inconsistent totals and debug exports reject", () => {
  const g = createSimulation(),
    record = exportSession(g);
  assert.throws(() =>
    validateImport({
      ...record,
      inputs: [{ tick: -1, power: 55, angle: -103 }],
    }),
  );
  assert.throws(() =>
    validateImport({
      ...record,
      result: { score: 0, lost: 1, jackpots: 0, fired: 0 },
    }),
  );
  g.debugUsed = true;
  assert.throws(() => exportSession(g), /デバッグ/);
});
test("manual end is replayed at final tick", () => {
  const g = createSimulation({ initialBalls: 3 });
  g.fire(55, -103);
  g.step(0.5);
  g.end();
  const data = exportSession(g),
    replay = createReplay(data);
  replay.step(g.tick);
  assert.deepEqual(replay.game.snapshot(), g.snapshot());
  assert.equal(replay.game.status, "finished");
});

test("tick zero end and fire export preserve boundary inputs", () => {
  const ended = createSimulation();
  ended.end();
  assert.equal(createReplay(exportSession(ended)).game.status, "finished");
  const active = createSimulation();
  active.fire(55, -103);
  assert.deepEqual(
    createReplay(exportSession(active)).game.snapshot(),
    active.snapshot(),
  );
});

test("replay rejects duplicate and too-close fire ticks and post-end inputs", () => {
  const g = createSimulation({
    initialBalls: 3,
    config: { fireInterval: 0.2 },
  });
  g.fire(55, -103);
  g.step(0.25);
  g.fire(55, -103);
  const record = exportSession(g);
  for (const tick of [0, 47])
    assert.throws(
      () =>
        validateImport({
          ...record,
          inputs: [record.inputs[0], { ...record.inputs[1], tick }],
        }),
      /cadence/,
    );
  assert.throws(
    () =>
      validateImport({
        ...record,
        inputs: [{ tick: 0, type: "end" }, ...record.inputs],
      }),
    /input/,
  );
  assert.throws(
    () =>
      validateImport({
        ...record,
        inputs: [
          { tick: 0, type: "end" },
          { tick: 0, type: "end" },
        ],
      }),
    /input/,
  );
});
test("replay refuses corrupted final counters and inputs rejected by capacity", () => {
  const g = createSimulation({ initialBalls: 3 });
  g.fire(55, -103);
  g.step(0.2);
  const record = exportSession(g);
  const corrupted = { ...record, result: { ...record.result, score: 1 } };
  const replay = createReplay(corrupted);
  assert.throws(() => replay.step(g.tick), /result mismatch/);
  const impossible = {
    ...record,
    config: { maxBalls: 1 },
    inputs: [
      record.inputs[0],
      { tick: 24, type: "fire", power: 55, angle: -103 },
    ],
    result: { ...record.result, fired: 2 },
  };
  const blocked = createReplay(impossible);
  assert.throws(() => blocked.step(g.tick), /input rejected/);
});
