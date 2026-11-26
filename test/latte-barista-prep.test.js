import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advanceExtraction,
  advanceSteam,
  createExtraction,
  createSteam,
  getPreparedIngredients,
} from '../public/latte-art/barista-prep-model.js';

function advance(state, update, seconds, hz = 60, ...inputs) {
  for (let i = 0; i < Math.round(seconds * hz); i++) {
    state = update(state, 1 / hz, ...inputs);
  }
  return state;
}

test('pre-infusion releases no espresso and ends in a drop phase before steady flow', () => {
  const soaked = advance(createExtraction(), advanceExtraction, 1);
  const drops = advance(soaked, advanceExtraction, 1.25);
  const flow = advance(drops, advanceExtraction, 2);
  assert.equal(soaked.phase, 'infusion');
  assert.equal(soaked.volume, 0);
  assert.equal(drops.phase, 'drops');
  assert.ok(drops.volume > 0 && drops.volume < 4);
  assert.equal(flow.phase, 'flow');
  assert.ok(flow.volume > drops.volume + 8);
});

test('overrunning the shot blondes and lowers extraction quality', () => {
  const balanced = advance(createExtraction(), advanceExtraction, 8);
  const long = advance(balanced, advanceExtraction, 15);
  assert.ok(balanced.volume >= 30 && balanced.volume <= 43);
  assert.ok(long.volume > balanced.volume);
  assert.ok(long.blonding > 0.8);
  assert.ok(long.quality < balanced.quality);
  assert.equal(long.volume, 52);
});

test('grind changes flow and shot quality while preheat affects cup temperature', () => {
  const fine = advance(createExtraction({ grind: 0, preheat: true }), advanceExtraction, 7);
  const coarse = advance(createExtraction({ grind: 4, preheat: false }), advanceExtraction, 7);
  assert.ok(fine.volume < coarse.volume);
  assert.ok(fine.temperature > coarse.temperature);
});

test('adding air then rolling makes finer microfoam at the same temperature and similar foam volume', () => {
  const cold = createSteam();
  const fine = advance(advance(cold, advanceSteam, 2, 60, 'air'), advanceSteam, 5, 60, 'roll');
  const rough = advance(advance(cold, advanceSteam, 2, 60, 'surface'), advanceSteam, 5, 60, 'deep');
  const flat = advance(cold, advanceSteam, 7, 60, 'deep');
  assert.equal(Math.round(fine.temperature), Math.round(rough.temperature));
  assert.ok(Math.abs(fine.foam - rough.foam) < 0.075);
  assert.ok(fine.fineness > rough.fineness + 0.44);
  assert.ok(fine.separation < rough.separation);
  assert.equal(flat.foam, 0);
});

test('overheating degrades milk without increasing its quantity above the pitcher limit', () => {
  const aerated = advance(createSteam(), advanceSteam, 2, 60, 'air');
  const warm = advance(aerated, advanceSteam, 5, 60, 'roll');
  const hot = advance(warm, advanceSteam, 15, 60, 'roll');
  assert.equal(hot.temperature, 78);
  assert.ok(hot.milkMl <= 220);
  assert.ok(hot.fineness < warm.fineness);
  assert.ok(hot.separation > warm.separation);
});

test('air added after the milk is warm yields less foam than the same time spent aerating while cold', () => {
  const cold = createSteam();
  const correct = advance(advance(cold, advanceSteam, 2, 60, 'air'), advanceSteam, 5, 60, 'roll');
  const late = advance(advance(cold, advanceSteam, 5, 60, 'roll'), advanceSteam, 2, 60, 'air');
  assert.ok(Math.abs(correct.temperature - late.temperature) < .001);
  assert.ok(correct.foam > late.foam * 1.7);
  assert.ok(correct.fineness > late.fineness);
});

test('preparation advances independently of the display refresh rate, even when several frames are missed', () => {
  for (const hz of [2, 30, 120]) {
    const shot = advance(createExtraction(), advanceExtraction, 7, hz);
    const reference = advance(createExtraction(), advanceExtraction, 7);
    assert.ok(Math.abs(shot.volume - reference.volume) < 0.08);
    const milk = advance(createSteam(), advanceSteam, 7, hz, 'roll');
    const milk60 = advance(createSteam(), advanceSteam, 7, 60, 'roll');
    assert.ok(Math.abs(milk.temperature - milk60.temperature) < 0.001);
    assert.ok(Math.abs(milk.fineness - milk60.fineness) < 0.002);
  }
});

test('only a usable shot and warm milk hand off their actual measured state to pour', () => {
  const cold = createSteam();
  const shot = advance(createExtraction(), advanceExtraction, 8);
  const warm = advance(advance(cold, advanceSteam, 2, 60, 'air'), advanceSteam, 5, 60, 'roll');
  assert.equal(getPreparedIngredients(createExtraction(), warm), null);
  assert.equal(getPreparedIngredients(shot, cold), null);
  const ingredients = getPreparedIngredients(shot, warm);
  assert.equal(ingredients.espressoMl, shot.volume);
  assert.equal(ingredients.milkMl, warm.milkMl);
  assert.ok(ingredients.milkMl >= 3.5 * ingredients.espressoMl);
  assert.equal(ingredients.temperature, warm.temperature);
  assert.equal(ingredients.foam, warm.foam);
  assert.equal(ingredients.fineness, warm.fineness);
  assert.equal(ingredients.separation, warm.separation);
  assert.equal(ingredients.extraction, shot.quality);
});
