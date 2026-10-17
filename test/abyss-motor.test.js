import test from "node:test";
import assert from "node:assert/strict";
import { createSimulation } from "../public/js/abyss/si-engine.js";
import { exportSession, validateImport } from "../public/js/abyss/storage.js";
import { createReplay } from "../public/js/abyss/replay.js";
test("two physical rotors rotate in opposite directions and share visible poses", () => {
  const g = createSimulation({ initialBalls: 2 });
  try {
    assert.equal(g.physicsVersion, "si-5");
    assert.equal(g.board.rotors.length, 2);
    g.step(0.5);
    assert.equal(g.rotorPoses.length, 2);
    assert.ok(g.rotorPoses[0].angle * g.rotorPoses[1].angle < 0);
    assert.ok(g.board.parts.filter((p) => p.tag === "rotor").length >= 10);
  } finally {
    g.dispose();
  }
});
test("tilt is bounded, locks at warning limit, releases and rejects paused input", () => {
  const g = createSimulation({ initialBalls: 2 });
  try {
    assert.equal(typeof g.setTilt, "function");
    assert.equal(g.setTilt(2), false);
    assert.equal(g.setTilt(1), true);
    g.step(6);
    assert.equal(g.tilt, 0);
    assert.ok(g.tiltLockUntil > g.elapsed);
    assert.equal(g.setTilt(-1), false);
    g.step(7);
    assert.equal(g.setTilt(-1), true);
    g.pause();
    assert.equal(g.setTilt(1), false);
  } finally {
    g.dispose();
  }
});
test("recorded tilt and fire reproduce exact physical state", () => {
  const g = createSimulation({ seed: "tilt-record", initialBalls: 3 });
  let r;
  try {
    assert.equal(typeof g.setTilt, "function");
    g.setTilt(1);
    g.fire(35);
    g.step(0.8);
    g.setTilt(0);
    g.step(0.3);
    g.fire(45);
    g.step(3);
    const data = exportSession(g);
    assert.doesNotThrow(() => validateImport(data));
    r = createReplay(data);
    r.step(g.tick);
    assert.deepEqual(r.game.snapshot(), g.snapshot());
  } finally {
    r?.dispose();
    g.dispose();
  }
});
test("rotating studs transfer motion through contacts rather than moving ball positions", () => {
  const gs = [true, false].map((moving) => {
    const g = createSimulation({ initialBalls: 1, debug: true });
    if (!moving) g.board.rotors.forEach((r) => (r.omega = 0));
    const r = g.board.rotors[0],
      b = g.debugDrop(0);
    b.zone = "board";
    g.debugSetBall(b.id, {
      position: { x: r.x + 0.03, y: r.y + 0.01, z: 0.007 },
      velocity: { x: 0, y: -0.05, z: 0 },
    });
    return g;
  });
  try {
    gs.forEach((g) => g.step(0.18));
    assert.ok(gs[0].stats.contacts.rotor > 0);
    assert.ok(
      Math.hypot(
        gs[0].balls[0].x - gs[1].balls[0].x,
        gs[0].balls[0].y - gs[1].balls[0].y,
      ) > 0.001,
    );
  } finally {
    gs.forEach((g) => g.dispose());
  }
});
test("SI-4 archived sessions preserve their exact original snapshot", async () => {
  const { createSimulation: previous } = await import(
    "../public/js/abyss/si-v4/si-engine.js"
  );
  const g = previous({ initialBalls: 2, seed: "frozen4" });
  let r;
  try {
    g.fire(35);
    g.step(3);
    r = createReplay(exportSession(g));
    r.step(g.tick);
    assert.deepEqual(r.game.snapshot(), g.snapshot());
  } finally {
    r?.dispose();
    g.dispose();
  }
});
test('pausing releases tilt as a recorded input so resume and replay stay neutral',()=>{
 const g=createSimulation({initialBalls:2,seed:'pause-tilt'});let r;try{g.setTilt(1);g.fire(35);g.step(.2);g.pause();assert.equal(g.tilt,0);g.resume();g.step(.2);r=createReplay(exportSession(g));r.step(g.tick);assert.deepEqual(r.game.snapshot(),g.snapshot());}finally{r?.dispose();g.dispose();}
});
test('ending a session records tilt release before the end command',()=>{
 const g=createSimulation({initialBalls:1});let r;try{g.setTilt(-1);g.end();assert.equal(g.tilt,0);r=createReplay(exportSession(g));assert.deepEqual(r.game.snapshot(),g.snapshot());}finally{r?.dispose();g.dispose();}
});
test('normal natural entry can reach the first winning aperture instead of a fixed losing route',()=>{
 const g=createSimulation({difficulty:'normal',initialBalls:40,seed:'comparison-20261017'});let next=0;try{while(g.status==='running'&&g.elapsed<100){if(g.remaining&&g.elapsed>=next-1e-8&&g.fire(35))next=g.elapsed+.6;g.step(1/240);}assert.ok(g.stats.trayEntries[0]>8);assert.ok(g.passes[0]>0,'normal tray must have a naturally reachable winning route');assert.equal(g.balls.length,0);assert.deepEqual(g.stats.trayTimeouts,[0,0,0]);}finally{g.dispose();}
});
test('recorded dish orientation uses shared geometry and validates physical tuning bounds',()=>{
 const preset={version:2,physicsVersion:'si-5',kind:'preset',difficulty:'custom',seed:'dish',config:{cradleOrientation:60,cradleTilt:.025,cradleFriction:.012}};assert.doesNotThrow(()=>validateImport(preset));assert.throws(()=>validateImport({...preset,config:{cradleOrientation:361}}));
 const a=createSimulation(),b=createSimulation({config:preset.config});try{assert.notEqual(a.board.trays[0].holes[0].x,b.board.trays[0].holes[0].x);}finally{a.dispose();b.dispose();}
});
