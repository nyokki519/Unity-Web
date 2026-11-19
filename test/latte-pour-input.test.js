import test from 'node:test';
import assert from 'node:assert/strict';
import { MilkPour, MILK_GRID_SIZE } from '../public/latte-art/milk-pour.js';
import { PourInput } from '../public/latte-art/pour-input.js';

const rate = .62;
const left = { x: -.65, y: 0 };
const right = { x: .62, y: 0 };

function concentration(milk, x, y) {
  const idx = coordinate => Math.floor((coordinate + 1) * MILK_GRID_SIZE / 2);
  return milk.density[idx(y) * MILK_GRID_SIZE + idx(x)];
}

test('a short press produces the same dose and foam when the browser queues both pointer events', () => {
  function run(displayTimes) {
    const milk = new MilkPour();
    const input = new PourInput(milk);
    assert.ok(input.start(left, 100));
    for (const time of displayTimes) input.advance(time, rate);
    input.end(366, rate, left);
    milk.settle();
    return milk;
  }
  const scheduled = run([120, 150, 175, 212, 249, 291, 322, 330, 356]);
  const delayed = run([]);
  assert.ok(delayed.amount > 4 && delayed.amount < 6);
  assert.ok(Math.abs(scheduled.amount - delayed.amount) < .00001);
  assert.deepEqual(scheduled.density, delayed.density);
});

test('a swipe that leaves the cup paints up to its first exit and only resumes back inside', () => {
  const milk = new MilkPour();
  const input = new PourInput(milk);
  const clips = [{ x: 0, y: -.08, radius: .97 }];
  assert.ok(input.start(left, 0));
  input.advance(300, rate);
  input.move({ x: 1.06, y: 0 }, 335, rate, clips);
  assert.equal(milk.pouring, false);
  const atRim = milk.amount;
  input.advance(1200, rate);
  assert.equal(milk.amount, atRim);
  for (const x of [-.35, -.13, 0, .30, .55, .75]) assert.ok(concentration(milk, x, 0) > .01, x);
  assert.ok(input.move(right, 1230, rate, clips));
  input.advance(1610, rate);
  input.end(1610, rate);
  assert.ok(milk.amount > atRim + 3);
});

test('the keyboard pour completes its scheduled dose on a delayed frame', () => {
  function run(times) {
    const milk = new MilkPour();
    const input = new PourInput(milk);
    input.start({ x: 0, y: 0 }, 80, 630);
    for (const time of times) input.advance(time, rate);
    assert.equal(milk.pouring, false);
    return milk;
  }
  const scheduled = run([140, 244, 347, 435, 561, 667, 710, 850, 1100]);
  const delayed = run([1100]);
  assert.ok(Math.abs(scheduled.amount - delayed.amount) < .00001);
  assert.deepEqual(scheduled.density, delayed.density);
});
