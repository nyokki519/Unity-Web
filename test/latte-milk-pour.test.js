import test from 'node:test';
import assert from 'node:assert/strict';
import { MilkPour, MILK_GRID_SIZE, MILK_CAPACITY, DEFAULT_POUR_RATE } from '../public/latte-art/milk-pour.js';

function at(cup, x, y) {
  const cell = co => Math.floor((co + 1) * MILK_GRID_SIZE / 2);
  return cup.density[cell(y) * MILK_GRID_SIZE + cell(x)];
}

function takePour(milliseconds, frameMs, from, to = from) {
  const cup = new MilkPour();
  cup.start(from);
  let time = 0;
  while (time < milliseconds) {
    const next = Math.min(milliseconds, time + frameMs);
    const fraction = next / milliseconds;
    cup.advance(next - time, {
      x: from.x + (to.x - from.x) * fraction,
      y: from.y + (to.y - from.y) * fraction,
    }, DEFAULT_POUR_RATE);
    time = next;
  }
  cup.stop();
  cup.settle();
  return cup;
}

test('holding longer builds and spreads the same left-hand pour without whitening the right', () => {
  const point = { x: -.55, y: .05 };
  const short = takePour(230, 15, point);
  const long = takePour(1270, 15, point);

  assert.ok(short.amount > 0 && long.amount > short.amount * 3);
  assert.ok(at(short, -.55, .05) > .08);
  assert.ok(at(long, -.55, .05) > at(short, -.55, .05));
  assert.ok(at(long, -.33, .05) > at(short, -.33, .05));
  assert.ok(at(long, .48, .05) < .02);
  assert.ok(long.density.filter(level => level > .45).length > short.density.filter(level => level > .45).length);
});

test('a lateral pour leaves a continuous shape and deposits the same dose across frame rates', () => {
  const from = { x: -.67, y: -.20 };
  const to = { x: .67, y: -.20 };
  const fast = takePour(1400, 1000 / 120, from, to);
  const slow = takePour(1400, 1000 / 15, from, to);
  assert.ok(Math.abs(fast.amount - slow.amount) < 1e-8);
  for (let i = 0; i < fast.density.length; i++) assert.ok(Math.abs(fast.density[i] - slow.density[i]) < .00015);
  for (const x of [-.5, -.3, -.1, .1, .3, .5]) assert.ok(at(fast, x, -.2) > .14, x);
  assert.ok(at(fast, 0, .42) < .02);
  assert.ok(at(takePour(1400, 25, from), .5, -.20) < .02);
});

test('release only redistributes the milk and reaching the cup limit stops dosing', () => {
  const point = { x: .24, y: -.41 };
  const cup = new MilkPour();
  cup.start(point);
  cup.advance(533, point, .8);
  const dose = cup.amount;
  const deposited = cup.density.reduce((sum, density) => sum + density, 0);
  assert.ok(cup.flow > 0);
  cup.stop();
  assert.ok(cup.moving);
  cup.advance(750);
  assert.equal(cup.amount, dose);
  assert.equal(cup.flow, 0);
  assert.equal(cup.moving, false);
  assert.ok(Math.abs(deposited - cup.density.reduce((sum, density) => sum + density, 0)) < .01);

  cup.start({ x: 2, y: 2 });
  cup.advance(8000, { x: 2, y: 2 }, 1);
  assert.equal(cup.amount, MILK_CAPACITY);
  assert.equal(cup.pouring, false);
  cup.settle();
  assert.equal(cup.flow, 0);
  const total = cup.density.reduce((sum, density) => sum + density, 0);
  assert.ok(total > deposited && cup.density.every(density => Number.isFinite(density) && density >= 0));
});

test('saved milk retains exact cells and can be shared by every drawing presentation', () => {
  const cup = takePour(810, 16, { x: -.34, y: .28 }, { x: .36, y: .19 });
  const snapshot = JSON.parse(JSON.stringify(cup.snapshot()));
  const restored = new MilkPour(snapshot);
  assert.equal(restored.amount, cup.amount);
  assert.deepEqual(restored.density, cup.density);
  restored.reset();
  assert.equal(restored.snapshot(), null);
  assert.ok(restored.density.every(value => value === 0));
  assert.ok(at(cup, -.07, .24) > 0);
  assert.equal(new MilkPour({ ...snapshot, cells: 'garbled' }).amount, 0);
  assert.equal(new MilkPour('legacy').snapshot(), 'legacy');
});

test('the quick handoff settles the same shape as waiting for the stream to finish', () => {
  const origin = { x: -.48, y: -.14 };
  function release() {
    const cup = new MilkPour();
    cup.start(origin);
    cup.advance(458, origin, .72);
    cup.stop();
    return cup;
  }
  const direct = release();
  const waited = release();
  direct.settle();
  for (let i = 0; i < 20; i++) waited.advance(34);
  assert.equal(direct.amount, waited.amount);
  assert.deepEqual(direct.density, waited.density);
});

test('the pitcher reaches the cup smoothly before depositing milk and recovers from a cancelled gesture', () => {
  const origin = { x: -.4, y: 0 };
  const cup = new MilkPour();
  cup.start(origin);
  assert.equal(cup.resting, 1);
  cup.advance(50);
  assert.ok(cup.resting > 0 && cup.resting < 1);
  assert.equal(cup.amount, 0);
  const releasePose = cup.resting;
  cup.stop();
  assert.equal(cup.resting, releasePose);
  cup.settle();
  assert.equal(cup.resting, 1);
  assert.equal(cup.amount, 0);

  cup.start(origin);
  cup.advance(200);
  assert.equal(cup.resting, 0);
  assert.ok(cup.flow > 0 && cup.amount > 0);
});

test('a slow pass lays down more foam than a fast pass on the same stroke', () => {
  const cup = new MilkPour();
  const left = { x: -.72, y: .12 };
  cup.start(left);
  cup.advance(180, left);
  cup.advance(1000, { x: -.05, y: .12 });
  cup.advance(280, { x: .68, y: .12 });
  cup.stop();
  cup.settle();
  const nearby = (x, y) => [-.06, -.03, 0, .03, .06]
    .reduce((sum, delta) => sum + at(cup, x, y + delta), 0);
  assert.ok(nearby(-.39, .12) > nearby(.35, .12) * 1.7);
  assert.ok(nearby(.35, .12) > .07);
});

test('retapping during the return carries the pitcher from its current position to the new point', () => {
  const cup = new MilkPour();
  cup.start({ x: -.55, y: 0 });
  cup.advance(250);
  cup.stop();
  cup.advance(66);
  const from = cup.toolTarget;
  const resting = cup.resting;
  cup.start({ x: .53, y: .12 });
  assert.deepEqual(cup.toolTarget, from);
  assert.equal(cup.resting, resting);
  cup.advance(50);
  assert.ok(cup.toolTarget.x > from.x && cup.toolTarget.x < .53);
  cup.advance(125);
  assert.deepEqual(cup.toolTarget, { x: .53, y: .12 });
});

test('one fast pointer movement paints a thin continuous trail between sampled positions', () => {
  const cup = new MilkPour();
  const left = { x: -.64, y: -.13 };
  const before = cup.amount;
  cup.start(left);
  cup.advance(300, left, .60);
  const atStart = cup.amount;
  cup.advance(17, { x: .64, y: -.13 }, .60);
  assert.ok(cup.amount - atStart < 1.3);
  cup.settle();
  assert.ok(cup.amount > before);
  for (const x of [-.45, -.20, 0, .20, .45]) assert.ok(at(cup, x, -.13) > .025, x);
  assert.ok(at(cup, 0, .11) < .03);
});
