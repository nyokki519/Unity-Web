import test from 'node:test';
import assert from 'node:assert/strict';
import * as geometry from '../public/latte-art/foam-geometry.js';
import { FOAM_DENSITY_PER_ML, MilkPour, MILK_GRID_SIZE } from '../public/latte-art/milk-pour.js';
import { PourInput } from '../public/latte-art/pour-input.js';

const left = { x: -.42, y: .03 };
const right = { x: .55, y: .03 };
const prepared = {
  espressoMl: 36, milkMl: 93, temperatureC: 61,
  aeration: .23, coarseness: .13, separation: .05, crema: .76, seed: 25,
};
const sum = levels => levels.reduce((total, level) => total + level, 0);

function at(levels, { x, y }) {
  const cell = coordinate => Math.floor((coordinate + 1) * MILK_GRID_SIZE / 2);
  return levels[cell(y) * MILK_GRID_SIZE + cell(x)];
}

function pour(height, profile = prepared) {
  const milk = new MilkPour(null, profile);
  milk.setSpoutHeightCm(height);
  milk.start(left);
  milk.advance(950, left, .62);
  milk.settle();
  return milk;
}

test('a high pour mixes the same volume locally while a low pour builds floating foam', () => {
  const high = pour(8);
  const middle = pour(3.4);
  const low = pour(1);
  assert.equal(high.amount, low.amount);
  for (const milk of [high, middle, low]) {
    assert.equal(milk.amount, milk.landedAmount);
    const representedVolume = (sum(milk.density) + sum(milk.mixedDensity)) / FOAM_DENSITY_PER_ML;
    assert.ok(Math.abs(representedVolume - milk.landedAmount) < .0001);
  }
  assert.ok(sum(low.density) > sum(middle.density));
  assert.ok(sum(middle.density) > sum(high.density));
  assert.ok(sum(low.density) > sum(high.density) * 7);
  assert.ok(at(low.density, left) > 6);
  assert.ok(at(high.density, left) < 1);
  assert.ok(at(high.mixedDensity, left) > 2);
  assert.ok(at(high.mixedDensity, right) < .001);
});

test('returning to automatic height keeps the earlier high jet visible through its last landing', () => {
  const milk = new MilkPour(null, prepared);
  milk.setSpoutHeightCm(8);
  milk.start(left);
  milk.advance(350, left, .62);
  milk.setSpoutHeightCm(null);
  milk.stop();
  milk.advance(1000 / 60 * 4);
  assert.ok(milk.landedAmount < milk.amount);
  assert.ok(milk.streamCut < 1);
  milk.settle();
  assert.equal(milk.landedAmount, milk.amount);
  assert.equal(milk.streamCut, 1);
});

test('coarse and cool milk leave less dense floating foam at the same height and volume', () => {
  const fine = pour(1);
  const rough = pour(1, { ...prepared, coarseness: .91, separation: .68 });
  const cool = pour(1, { ...prepared, temperatureC: 32 });
  assert.equal(fine.amount, rough.amount);
  assert.equal(fine.amount, cool.amount);
  assert.ok(sum(rough.density) < sum(fine.density) * .7);
  assert.ok(sum(cool.density) < sum(fine.density) * .95);
});

test('a prepared cup respects both cup capacity and pitcher stock', () => {
  const byStock = new MilkPour(null, prepared);
  assert.equal(byStock.espressoMl, 36);
  assert.equal(byStock.milkMl, 93);
  assert.equal(byStock.capacity, 93);
  byStock.start(left);
  byStock.advance(2500, left, 1);
  byStock.settle();
  assert.equal(byStock.landedAmount, 93);
  assert.equal(byStock.remaining, 0);
  assert.ok(byStock.full);
  assert.equal(byStock.start(right), false);
  byStock.reset();
  assert.equal(byStock.remaining, 93);
  byStock.configure(null);
  assert.equal(byStock.profile, null);
  assert.equal(byStock.espressoMl, 60);
  assert.equal(byStock.capacity, 160);

  const byCup = new MilkPour(null, { ...prepared, espressoMl: 52, milkMl: 200 });
  byCup.start(left);
  byCup.advance(4000, left, 1);
  byCup.settle();
  assert.equal(byCup.landedAmount, 168);
  assert.equal(byCup.remaining, 32);
  assert.ok(byCup.full);
});

test('the higher jet lands later and lowering an active spout changes new milk only', () => {
  const high = new MilkPour(null, prepared);
  const low = new MilkPour(null, prepared);
  high.setSpoutHeightCm(8);
  low.setSpoutHeightCm(1);
  for (const milk of [high, low]) {
    milk.start(left);
    milk.advance(150, left, .62);
    assert.ok(milk.amount > 0);
  }
  assert.equal(high.landedAmount, 0);
  assert.ok(high.streamHead > 0 && high.streamHead < 1);
  assert.ok(low.landedAmount > 0);
  assert.equal(low.streamHead, 1);
  high.setSpoutHeightCm(1);
  high.advance(1000 / 60, right, .62);
  high.stop();
  const dose = high.amount;
  high.advance(1000 / 60);
  assert.ok(high.streamCut > 0 && high.streamCut < 1);
  high.settle();
  assert.equal(high.landedAmount, dose);
  assert.ok(at(high.mixedDensity, left) > at(high.mixedDensity, right) * 10);
});

test('preview rollback and save restore keep local mixed crema and prepared art', () => {
  const milk = new MilkPour(null, prepared);
  milk.setSpoutHeightCm(8);
  const input = new PourInput(milk);
  input.start(left, 0);
  input.preview(402, .62);
  input.preview(500, .62);
  input.end(442, .62, left);
  milk.settle();
  const direct = new MilkPour(null, prepared);
  direct.setSpoutHeightCm(8);
  direct.start(left);
  direct.advance(442, left, .62);
  direct.settle();
  assert.ok(Math.abs(milk.amount - direct.amount) < 1e-9);
  assert.deepEqual(milk.density, direct.density);
  assert.deepEqual(milk.mixedDensity, direct.mixedDensity);

  const restored = new MilkPour(JSON.parse(JSON.stringify(milk.snapshot())));
  assert.deepEqual(restored.profile, prepared);
  assert.equal(restored.amount, milk.amount);
  assert.deepEqual(restored.density, milk.density);
  assert.deepEqual(restored.mixedDensity, milk.mixedDensity);
});

test('the liquid plane follows the combined landed volume with the previous default calibration', () => {
  const { liquidPlaneAtFill, liquidPlaneAtVolume } = geometry;
  assert.equal(typeof liquidPlaneAtVolume, 'function');
  assert.ok(liquidPlaneAtVolume(0).height < liquidPlaneAtVolume(36).height);
  assert.ok(liquidPlaneAtVolume(36).radius < liquidPlaneAtVolume(60).radius);
  assert.deepEqual(liquidPlaneAtVolume(60), liquidPlaneAtFill(0));
  assert.deepEqual(liquidPlaneAtVolume(220), liquidPlaneAtFill(1));
  assert.deepEqual(liquidPlaneAtVolume(300), liquidPlaneAtVolume(220));
  assert.ok(liquidPlaneAtVolume(36 + 24).height > liquidPlaneAtVolume(36).height);
});
