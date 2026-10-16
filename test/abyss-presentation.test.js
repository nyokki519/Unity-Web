import test from "node:test";
import assert from "node:assert/strict";
import {
  createAutoCamera,
  renderPixelRatio,
  transitionWeight,
} from "../public/js/abyss/presentation.js";
test("a departing deeper ball cannot hide an occupied cradle", () => {
  const camera = createAutoCamera();
  assert.equal(
    camera.choose({
      elapsed: 1,
      balls: [
        { id: 2, stage: 3, zone: "out" },
        { id: 1, stage: 1, zone: "tray" },
      ],
    }),
    "cradle1",
  );
});
test("automatic close view follows progression and holds through a physical transfer", () => {
  const camera = createAutoCamera();
  assert.equal(
    camera.choose({ elapsed: 1, balls: [{ id: 1, stage: 1, zone: "tray" }] }),
    "cradle1",
  );
  assert.equal(
    camera.choose({
      elapsed: 1.5,
      balls: [{ id: 1, stage: 1, zone: "transfer" }],
    }),
    "cradle1",
  );
  assert.equal(
    camera.choose({ elapsed: 1.6, balls: [{ id: 1, stage: 2, zone: "tray" }] }),
    "cradle2",
  );
  assert.equal(camera.choose({ elapsed: 5, balls: [] }), "overview");
});
test("manual views and reduced motion stay under user control", () => {
  const camera = createAutoCamera();
  const game = { elapsed: 1, balls: [{ id: 1, stage: 3, zone: "tray" }] };
  assert.equal(camera.choose(game, { camera: "overview" }), "overview");
  assert.equal(camera.choose(game, { reducedMotion: true }), "overview");
  assert.equal(
    camera.choose(game, { camera: "cradle2", reducedMotion: true }),
    "cradle2",
  );
});
test("native-density portrait screens remain crisp and quality reductions are explicit", () => {
  assert.equal(renderPixelRatio("auto", 3, 390, 624), 3);
  assert.equal(renderPixelRatio("high", 3, 390, 624), 3);
  assert.equal(renderPixelRatio("low", 3, 390, 624), 1);
  assert.ok(renderPixelRatio("auto", 3, 1800, 2800) < 3);
});
test("camera easing settles equally at 30 and 120 rendered frames per second", () => {
  const run = (fps) => {
    let remaining = 1;
    for (let i = 0; i < fps; i++) remaining *= 1 - transitionWeight(1 / fps);
    return remaining;
  };
  assert.ok(Math.abs(run(30) - run(120)) < 1e-8);
  assert.ok(run(30) < 0.02);
});
