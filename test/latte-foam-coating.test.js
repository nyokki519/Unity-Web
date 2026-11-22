import test from 'node:test';
import assert from 'node:assert/strict';
import { joinedFoamLevels } from '../public/latte-art/foam-coating.js';
import { MilkPour, MILK_GRID_SIZE } from '../public/latte-art/milk-pour.js';

function pourBear(separation, height) {
  const milk = new MilkPour();
  for (const [x, y, duration] of [[0, .08, 960], [-separation, height, 520], [separation, height, 520]]) {
    const point = { x, y };
    milk.start(point);
    milk.advance(duration, point, .62);
    milk.settle();
  }
  const density = milk.density;
  const visible = new Float32Array(density.length);
  const saved = milk.snapshot();
  joinedFoamLevels(density, MILK_GRID_SIZE, new Float32Array(density.length), visible);
  assert.deepEqual(milk.snapshot(), saved);
  const indexAt = (x, y) => Math.floor((y + 1) * MILK_GRID_SIZE / 2) * MILK_GRID_SIZE
    + Math.floor((x + 1) * MILK_GRID_SIZE / 2);
  return (x, y) => {
    const i = indexAt(x, y);
    return { before: density[i], after: visible[i] };
  };
}

test('foam joins both ears to the face and keeps the notch between them', () => {
  const at = pourBear(.29, -.28);
  for (const x of [-.15, .15]) {
    const { before, after } = at(x, -.10);
    assert.ok(after > before + .45);
  }
  const notch = at(0, -.28);
  assert.ok(notch.after < at(.15, -.10).after * .6);
  const background = at(.65, .42);
  assert.equal(background.after, background.before);
});

test('the coffee between intentionally separated pools keeps its contrast', () => {
  const at = pourBear(.46, -.39);
  for (const [x, y] of [[0, -.39], [-.24, -.15], [.24, -.15]]) {
    const { before, after } = at(x, y);
    assert.ok(after <= before + .04);
  }
});
