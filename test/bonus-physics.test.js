import test from "node:test";
import assert from "node:assert/strict";
const modules = await Promise.allSettled([
  import("../public/js/bonus/model.js"),
  import("../public/js/bonus/physics.js"),
  import("../public/js/bonus/config.js"),
]);
test("bonus modules exist", () =>
  assert.ok(modules.every((m) => m.status === "fulfilled")));
if (modules.every((m) => m.status === "fulfilled")) {
  const [
    { createGame },
    { sweepCircle, moveBoard, moveTray },
    { getBoard, FIXED_DT },
  ] = modules.map((m) => m.value);
  const run = (g, seconds) => {
    for (let i = 0; i < seconds / FIXED_DT; i++) g.step(FIXED_DT);
  };
  test("sweep catches fast crossing and rejects remote path", () => {
    assert.ok(sweepCircle(-100, 0, 100, 0, 0, 0, 5) < 0.5);
    assert.equal(sweepCircle(-100, 20, 100, 20, 0, 0, 5), null);
  });
  test("fast solid pin and wall contacts reflect velocity without tunneling", () => {
    const board = { left: 0, right: 200, pins: [{ x: 100, y: 50, r: 6 }] };
    const pin = { x: 10, y: 50, vx: 3000, vy: 0, r: 4 };
    moveBoard(pin, board, 0.05);
    assert.ok(pin.vx < 0);
    assert.ok(pin.x < 90);
    const wall = { x: 180, y: 100, vx: 3000, vy: 0, r: 4 };
    moveBoard(wall, { ...board, pins: [] }, 0.02);
    assert.ok(wall.vx < 0);
    assert.ok(wall.x <= 196);
  });
  test("fast tray crossing adjudicates earliest visible hole without speed gate", () => {
    const b = { x: -80, y: 0, vx: 5000, vy: 0, r: 4 };
    const tray = {
      radius: 112,
      spring: 0,
      drag: 0,
      tiltX: 0,
      tiltY: 0,
      holes: [
        { x: 20, y: 0, r: 5, win: true },
        { x: -20, y: 0, r: 5, win: false },
      ],
    };
    assert.equal(moveTray(b, tray, 0.04).win, false);
    assert.ok(b.x < 0);
  });
  test("normal and hard use visibly distinct stage winning positions", () => {
    for (const d of ["normal", "hard"]) {
      const holes = getBoard(d).trays.map((t) => t.holes[0]);
      assert.equal(new Set(holes.map((h) => `${h.x},${h.y}`)).size, 3);
    }
  });
  test("all geometry contains one winning hole and a center hole", () => {
    for (const d of ["practice", "normal", "hard"])
      for (const t of getBoard(d).trays) {
        assert.equal(t.holes.filter((h) => h.win).length, 1);
        assert.ok(t.holes.some((h) => h.x === 0 && h.y === 0));
      }
  });
  test("debug physical successes traverse all stages and account exactly once", () => {
    const g = createGame({ debug: true });
    assert.ok(g.debugDrop(1, { outcome: "win" }));
    run(g, 20);
    assert.equal(g.jackpots, 1);
    assert.deepEqual(g.passes, [1, 1, 1]);
    assert.equal(g.fired, g.lost + g.jackpots + g.balls.length);
  });
  test("each tray miss physically removes ball", () => {
    for (let s = 1; s <= 3; s++) {
      const g = createGame({ debug: true });
      g.debugDrop(s, { outcome: "miss" });
      run(g, 0.1);
      assert.equal(g.lost, 1);
      assert.equal(g.balls.length, 0);
    }
  });
  test("pause, rate limit, protected debug and empty live drain", () => {
    const g = createGame();
    assert.equal(g.debugDrop(1), false);
    assert.equal(g.debugEmpty(), false);
    assert.ok(g.fire());
    assert.equal(g.fire(), false);
    g.pause();
    const before = JSON.stringify(g.balls);
    g.step(2);
    assert.equal(JSON.stringify(g.balls), before);
    g.resume();
    const d = createGame({ debug: true });
    d.debugDrop(3, { outcome: "win" });
    d.debugEmpty();
    assert.equal(d.status, "running");
    run(d, 1);
    assert.equal(d.status, "finished");
    assert.equal(d.endReason, "empty");
  });
  test("fixed timestep equivalent chunks and natural cafe three stage win", () => {
    const a = createGame(),
      b = createGame();
    a.fire();
    b.fire();
    for (let i = 0; i < 1200; i++) a.step(1 / 120);
    for (let i = 0; i < 300; i++) b.step(1 / 30);
    assert.deepEqual(a.balls, b.balls);
    assert.equal(a.jackpots, b.jackpots);
    assert.ok(a.jackpots >= 1);
  });
  test("100 balls drain with finite state, bounded events and ledger", () => {
    const g = createGame();
    for (let i = 0; i < 100; i++) {
      while (!g.fire()) run(g, 0.1);
      run(g, 0.5);
      assert.equal(g.fired, g.lost + g.jackpots + g.balls.length);
      assert.ok(g.balls.length <= 12);
      for (const b of g.balls)
        assert.ok(Number.isFinite(b.x + b.y + b.vx + b.vy));
    }
    run(g, 60);
    assert.equal(g.status, "finished");
    assert.equal(g.fired, 100);
    assert.equal(g.lost + g.jackpots, 100);
    assert.ok(g.events.length <= 30);
    assert.ok(g.events.every((e, i) => !i || e.id > g.events[i - 1].id));
  });
  test("launcher scatter is retained by tray entry geometry", () => {
    const a = createGame({ seed: "cafe" }),
      b = createGame({ seed: "other" });
    a.fire();
    b.fire();
    for (let i = 0; i < 1000 && a.balls[0]?.zone === "board"; i++)
      a.step(FIXED_DT);
    for (let i = 0; i < 1000 && b.balls[0]?.zone === "board"; i++)
      b.step(FIXED_DT);
    assert.notEqual(a.balls[0].y, b.balls[0].y);
  });
  test("active cap and stage debug success use normal physics on all difficulties", () => {
    const capped = createGame({ debug: true });
    for (let i = 0; i < 12; i++) assert.ok(capped.debugDrop(1));
    assert.equal(capped.debugDrop(1), false);
    assert.equal(capped.fire(), false);
    for (const difficulty of ["practice", "normal", "hard"])
      for (let stage = 1; stage <= 3; stage++) {
        const g = createGame({ difficulty, debug: true });
        g.debugDrop(stage, { outcome: "win" });
        run(g, 20);
        assert.equal(g.passes[stage - 1], 1);
        assert.equal(g.fired, g.lost + g.jackpots + g.balls.length);
        if (stage === 3) assert.equal(g.jackpots, 1);
      }
  });
  test("normal seed2 and hard seed26 produce natural jackpots and a finite 100-ball session", () => {
    for (const difficulty of ["normal", "hard"]) {
      const seeded = createGame({
        difficulty,
        seed: difficulty === "hard" ? "26" : "2",
      });
      seeded.fire();
      run(seeded, 20);
      assert.equal(seeded.jackpots, 1);
      const g = createGame({ difficulty });
      for (let i = 0; i < 100; i++) {
        assert.ok(g.fire());
        run(g, g.fireInterval);
        assert.equal(g.fired, g.lost + g.jackpots + g.balls.length);
      }
      run(g, 30);
      assert.equal(g.status, "finished");
      assert.ok(g.elapsed >= 148);
      assert.equal(g.lost + g.jackpots, 100);
    }
  });
  test("all visible transfers remain inside the canvas at extreme launch powers", () => {
    for (const power of [0, 20, 55, 80, 100]) {
      const g = createGame({ seed: "1" });
      g.fire(power);
      for (let i = 0; i < 5000 && g.balls.length; i++) {
        g.step(FIXED_DT);
        for (const b of g.balls)
          if (b.zone === "transfer")
            assert.ok(b.screenX >= 4 && b.screenX <= 416);
      }
    }
  });
  test("power zero is a real distinct launch and initial stock is finite bounded", () => {
    const zero = createGame(),
      normal = createGame();
    zero.fire(0);
    normal.fire(55);
    assert.notEqual(zero.balls[0].vx, normal.balls[0].vx);
    for (const value of [NaN, Infinity, -Infinity])
      assert.equal(createGame({ initialBalls: value }).remaining, 100);
    assert.equal(createGame({ initialBalls: -3 }).remaining, 0);
    assert.ok(createGame({ initialBalls: 1e9 }).remaining <= 1000);
  });
  test("stalled and invalid balls recover as one loss with an explicit event", () => {
    for (const invalid of [false, true]) {
      const g = createGame({ debug: true });
      g.debugDrop(1);
      const b = g.balls[0];
      b.x = 90;
      b.y = 0;
      b.vx = b.vy = 0;
      Object.assign(g.board.trays[0], { spring: 0, drag: 0 });
      if (invalid) b.x = NaN;
      g.debugEmpty();
      g.step(invalid ? 0.1 : 61);
      assert.equal(g.lost, 1);
      assert.equal(g.jackpots, 0);
      assert.equal(g.balls.length, 0);
      assert.equal(g.fired, g.lost + g.jackpots + g.balls.length);
      assert.equal(g.events.filter((e) => e.type === "recover").length, 1);
      assert.ok(g.events.find((e) => e.type === "recover").message);
      assert.equal(g.endReason, "empty");
      g.step(100);
      assert.equal(g.lost, 1);
    }
  });
  test("quit retires every active ball", () => {
    const g = createGame();
    g.fire();
    g.end();
    assert.equal(g.endReason, "quit");
    assert.equal(g.lost, 1);
    assert.equal(g.balls.length, 0);
  });
}
