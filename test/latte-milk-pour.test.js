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
