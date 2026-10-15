import test from "node:test";
import assert from "node:assert/strict";
import { createBoard, holesAt } from "../public/js/abyss/config.js";
import { createSimulation } from "../public/js/abyss/engine.js";
import {
  sweepCircle,
  resolveBalls,
  moveTray,
} from "../public/js/abyss/physics.js";
test("board has deliberate geometry and rotating holes", () => {
  const b = createBoard();
  assert.equal(b.pins.length, 300);
  assert.deepEqual(
    b.trays.map((t) => t.diameter),
    [220, 180, 150],
  );
  assert.notEqual(holesAt(b.trays[0], 0)[0].y, holesAt(b.trays[0], 1)[0].y);
});
test("swept contact prevents tunneling", () =>
  assert.ok(sweepCircle(0, 0, 1000, 0, 500, 0, 10) < 0.5));
test("fixed clock agrees across frame rates", () => {
  const a = createSimulation(),
    b = createSimulation();
  a.fire();
  b.fire();
  for (let i = 0; i < 300; i++) a.step(1 / 30);
  for (let i = 0; i < 1200; i++) b.step(1 / 120);
  assert.deepEqual(a.snapshot(), b.snapshot());
});
test("debug exact win and miss resolve every tray with ledger", () => {
  for (let stage = 1; stage <= 3; stage++)
    for (const outcome of ["win", "miss"]) {
      const g = createSimulation({ debug: true });
      g.debugDrop(stage, { outcome });
      g.step(0.01);
      assert.equal(g.stats.trayPasses[stage - 1], outcome === "win" ? 1 : 0);
      assert.equal(g.stats.trayMisses[stage - 1], outcome === "miss" ? 1 : 0);
      g.step(1);
      assert.equal(g.fired, g.lost + g.jackpots + g.balls.length);
    }
});
test("gate physically blocks and admits", () => {
  for (const open of [true, false]) {
    const g = createSimulation({
      debug: true,
      config: { gate: { period: 10, openDuration: open ? 10 : 0, phase: 1 } },
    });
    g.debugDrop(0, { outcome: "win" });
    g.step(0.1);
    assert.equal(g.stats.gatePasses, open ? 1 : 0);
    if (!open) assert.ok(g.stats.contacts.gate > 0);
  }
});

test("fast ball reflects from pin without tunneling", () => {
  const g = createSimulation({ debug: true });
  const b = g.debugDrop(0);
  const p = g.board.pins[100];
  b.zone = "board";
  b.forestChecked = false;
  b.x = p.x - 40;
  b.y = p.y;
  b.vx = 20000;
  b.vy = 0;
  g.step(1 / 240);
  assert.ok(g.stats.contacts.pin > 0);
  assert.ok(Number.isFinite(b.vx));
});
test("normal physical play has conditional outcomes and conserved finite state", () => {
  const g = createSimulation({ difficulty: "normal", initialBalls: 40 });
  for (let tick = 0; tick < 240 * 50; tick++) {
    if (tick % 60 === 0) g.fire(40 + (tick % 55), -98 - (tick % 14));
    g.step(1 / 240);
    assert.equal(g.fired, g.lost + g.jackpots + g.balls.length);
  }
  assert.ok(
    g.stats.forestPasses > 0 && g.stats.forestPasses < g.stats.forestAttempts,
  );
  assert.ok(
    g.balls.every((b) =>
      [b.x, b.y, b.vx, b.vy, b.renderZ].every(Number.isFinite),
    ),
  );
});
test("quit retires live balls, records replay input and original reserve", () => {
  const g = createSimulation({ initialBalls: 8 });
  g.fire();
  g.end();
  assert.equal(g.balls.length, 0);
  assert.equal(g.lost, 1);
  assert.equal(g.initialBalls, 8);
  assert.equal(g.snapshot().initialBalls, 8);
  assert.equal(g.inputs.at(-1).type, "end");
  assert.ok(g.events.some((e) => e.type === "quit"));
});
test("debug validates stages and natural placement differs from hole placement", () => {
  const g = createSimulation({ debug: true });
  assert.equal(g.debugDrop(NaN), false);
  assert.equal(g.debugDrop(9), false);
  const b = g.debugDrop(1, { outcome: "natural" });
  assert.equal(g.debugUsed, true);
  assert.ok(Math.hypot(b.x, b.y) > g.board.trays[0].radius * 0.8);
});
test("seeded scatter distinguishes equal length seeds and repeats exactly", () => {
  const a = createSimulation({ seed: "abc" }),
    b = createSimulation({ seed: "def" }),
    c = createSimulation({ seed: "abc" });
  a.fire();
  b.fire();
  c.fire();
  assert.notEqual(a.balls[0].vx, b.balls[0].vx);
  assert.equal(a.balls[0].vx, c.balls[0].vx);
});
test("stalled tray recovers visibly and finishes ledger", () => {
  const g = createSimulation({
    debug: true,
    initialBalls: 1,
    config: { gravity: 0, trayRPM: [0, 0, 0] },
  });
  const b = g.debugDrop(1, { outcome: "natural" });
  g.board.trays[0].spring = 0;
  g.board.trays[0].tiltX = 0;
  b.vx = b.vy = 0;
  g.step(45);
  assert.equal(g.status, "finished");
  assert.equal(g.lost, 1);
  assert.ok(g.events.some((e) => e.type === "timeout"));
});

test("closed gate cannot admit a very fast ball through slab", () => {
  const g = createSimulation({ debug: true, config: { gateOpenDuration: 0 } });
  const b = g.debugDrop(0);
  b.vy = 20000;
  g.step(1 / 240);
  assert.equal(g.stats.gatePasses, 0);
  assert.equal(b.zone, "gate");
  assert.ok(b.y + b.r < g.board.gate.y);
});
test("post collision balls remain in the bowl boundary", () => {
  const g = createSimulation({ debug: true });
  const a = g.debugDrop(1, { outcome: "natural" }),
    b = g.debugDrop(1, { outcome: "natural" });
  g.step(1 / 240);
  for (const p of [a, b])
    assert.ok(Math.hypot(p.x, p.y) <= g.board.trays[0].radius - p.r + 1e-9);
});
test("metrics and bounded physical routes describe actual motion", () => {
  const g = createSimulation({ debug: true });
  g.fire();
  for (let i = 0; i < 120; i++) g.step(1 / 240);
  assert.ok(g.stats.speedSamples > 0);
  assert.ok(g.stats.dwellTotals[0] > 0);
  assert.ok(g.traces[0].points.length > 0);
  assert.equal(g.stats.pinHits.length, 300);
  assert.equal(Object.values(g.stats.angleBins)[0].shots, 1);
});

test("continuous relative ball contact stops fast crossing", () => {
  const a = {
      zone: "board",
      stage: 0,
      r: 5,
      x: 100,
      y: 50,
      prevX: 0,
      prevY: 50,
      prevZone: "board",
      prevStage: 0,
      vx: 24000,
      vy: 0,
    },
    b = {
      zone: "board",
      stage: 0,
      r: 5,
      x: 0,
      y: 50,
      prevX: 100,
      prevY: 50,
      prevZone: "board",
      prevStage: 0,
      vx: -24000,
      vy: 0,
    };
  let hits = 0;
  resolveBalls([a, b], () => hits++);
  assert.equal(hits, 1);
  assert.ok(a.vx < 0 && b.vx > 0);
  assert.ok(a.x < b.x);
});
test("board and gate balls share the same physical collision plane", () => {
  const a = { zone: "board", stage: 0, r: 5, x: 500, y: 919, vx: 0, vy: 20 },
    b = { zone: "gate", stage: 0, r: 5, x: 500, y: 921, vx: 0, vy: -20 };
  let hits = 0;
  resolveBalls([a, b], () => hits++);
  assert.equal(hits, 1);
  assert.ok(b.y - a.y >= 10);
});
test("tray capture stops at the earliest swept hole boundary", () => {
  const t = {
      omega: 0,
      spring: 0,
      tiltX: 0,
      tiltY: 0,
      drag: 0,
      radius: 200,
      holes: [{ id: 0, x: 0, y: 0, r: 20, win: true }],
    },
    b = { x: -100, y: 0, vx: 48000, vy: 0, r: 5 };
  const h = moveTray(b, t, 0, 1 / 240, () => {});
  assert.equal(h.win, true);
  assert.ok(Math.abs(b.x + 15) < 1e-7);
  assert.equal(b.y, 0);
});
test("gate passage follows continuous transfer pipe into tray rim", () => {
  const g = createSimulation({
    debug: true,
    config: { gate: { period: 10, openDuration: 10, phase: 1 } },
  });
  const b = g.debugDrop(0);
  let previous = { x: b.renderX, y: b.renderY, z: b.renderZ },
    sawTransfer = false,
    sawTray = false;
  for (let i = 0; i < 200; i++) {
    g.step(1 / 240);
    const delta = Math.hypot(
      b.renderX - previous.x,
      b.renderY - previous.y,
      b.renderZ - previous.z,
    );
    assert.ok(delta < 8, "no discontinuous jump " + delta);
    previous = { x: b.renderX, y: b.renderY, z: b.renderZ };
    if (b.zone === "transfer") {
      sawTransfer = true;
      assert.equal(g.stats.trayEntries[0], 0);
    }
    if (b.zone === "tray") {
      sawTray = true;
      assert.ok(Math.hypot(b.x, b.y) > g.board.trays[0].radius * 0.8);
      assert.ok(b.vy < -100);
      break;
    }
  }
  assert.ok(sawTransfer && sawTray);
});
