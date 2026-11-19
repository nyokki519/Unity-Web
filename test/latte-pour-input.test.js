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

test('a release queued behind drawing frames removes any milk previewed after its hardware timestamp', () => {
  function run(previewTimes) {
    const milk = new MilkPour();
    const input = new PourInput(milk);
    input.start(left, 100);
    for (const time of previewTimes) input.preview(time, rate);
    input.end(305, rate, left);
    milk.settle();
    return milk.snapshot();
  }
  const deliveredImmediately = run([145, 180, 260]);
  assert.ok(deliveredImmediately.amount > 2 && deliveredImmediately.amount < 5);
  for (const times of [[145, 180, 260, 342, 486, 780], [145, 180, 260, 8000]]) {
    const late = run(times);
    assert.ok(Math.abs(late.amount - deliveredImmediately.amount) < 1e-9);
    assert.ok(late.cells === deliveredImmediately.cells, 'the settled foam should be identical');
  }
});

test('a delayed position sample corrects the foam path before the next frame, including the rim', () => {
  function run(previewTimes) {
    const milk = new MilkPour();
    const input = new PourInput(milk);
    input.start(left, 100);
    for (const time of previewTimes) input.preview(time, rate);
    input.move({ x: 0, y: 0 }, 290, rate, []);
    for (const time of previewTimes) input.preview(time + 350, rate);
    input.move({ x: 1.08, y: 0 }, 630, rate, []);
    input.end(800, rate);
    milk.settle();
    return milk;
  }
  const immediate = run([]);
  for (const frames of [[170, 245, 278], [170, 245, 278, 400, 500]]) {
    const rendered = run(frames);
    assert.ok(Math.abs(rendered.amount - immediate.amount) < 1e-9);
    assert.deepEqual(rendered.density, immediate.density);
    assert.ok(concentration(rendered, .7, 0) > .01);
  }
});

test('preview rollback preserves the flow-rate boundary and settled milk from earlier gestures', () => {
  function run(preview) {
    const milk = new MilkPour();
    const input = new PourInput(milk);
    input.start(left, 10);
    input.end(500, .82);
    milk.settle();
    const previousAmount = milk.amount;

    input.start(right, 900);
    if (preview) input.preview(1500, .40);
    input.advance(1220, .40);
    if (preview) input.preview(10000, .90);
    input.end(1595, .90, right);
    milk.settle();
    assert.ok(milk.amount > previousAmount && milk.amount < previousAmount + 29);
    assert.ok(concentration(milk, left.x, left.y) > 1);
    return milk;
  }
  const immediate = run(false);
  const delayed = run(true);
  assert.ok(Math.abs(delayed.amount - immediate.amount) < 1e-9);
  assert.deepEqual(delayed.density, immediate.density);
});

test('moving after a long hold keeps frame-independent foam without replaying the entire hold', () => {
  class MeasuredMilk extends MilkPour {
    advanced = 0;
    advance(elapsed, position, flowRate) {
      this.advanced += elapsed;
      super.advance(elapsed, position, flowRate);
    }
  }
  function run(displayInterval) {
    const milk = new MeasuredMilk();
    const input = new PourInput(milk);
    input.start(left, 0);
    if (displayInterval) {
      for (let time = displayInterval; time <= 4000; time += displayInterval) input.preview(time, rate);
    }
    milk.advanced = 0;
    input.move({ x: -.4, y: .12 }, 4021, rate, []);
    if (displayInterval) assert.ok(milk.advanced < 230, milk.advanced);
    input.end(4100, rate, { x: -.4, y: .12 });
    milk.settle();
    return milk;
  }
  const expected = run(0);
  for (const frame of [16.67, 33.33, 64]) {
    const actual = run(frame);
    assert.ok(Math.abs(actual.amount - expected.amount) < 1e-9);
    assert.deepEqual(actual.density, expected.density);
  }
});
