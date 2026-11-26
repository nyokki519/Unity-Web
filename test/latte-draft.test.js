import test from 'node:test';
import assert from 'node:assert/strict';
import { cupNotes, milkProfile, readRecipe } from '../public/latte-art/barista-profile.js';
import { readDraft, writeDraft } from '../public/latte-art/draft.js';
import { MilkPour } from '../public/latte-art/milk-pour.js';

const stroke = { color: '#4c281b', width: .04, paths: [[{ x: -.3, y: .2 }, { x: .4, y: .6 }]] };
const fresh = { stage: 'pour', milk: null, strokes: [] };

function tabStorage() {
  const saved = new Map();
  return { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) };
}

test('the draft preserves the milk after removing the chocolate and resets with a new cup', () => {
  const storage = tabStorage();
  const milk = new MilkPour();
  milk.start({ x: -.5, y: .1 });
  milk.advance(400);
  milk.settle();
  const complete = { stage: 'draw', milk: milk.snapshot(), strokes: [stroke] };
  writeDraft(storage, complete);
  assert.deepEqual(readDraft(storage), complete);

  const noChocolate = { ...complete, strokes: [] };
  writeDraft(storage, noChocolate);
  assert.deepEqual(readDraft(storage), noChocolate);
  writeDraft(storage, fresh);
  assert.deepEqual(readDraft(storage), fresh);
  assert.equal(storage.getItem('unity-mix.latte-art.draft.v1'), undefined);
});

test('a draft saved before milk pouring was implemented opens with its original white foam', () => {
  const storage = tabStorage();
  storage.setItem('unity-mix.latte-art.draft.v1', JSON.stringify([stroke]));
  assert.deepEqual(readDraft(storage), { stage: 'draw', milk: 'legacy', strokes: [stroke] });
});

test('invalid coordinates or unavailable storage leave a usable empty cup', () => {
  const invalid = { ...stroke, paths: [[{ x: -.3, y: 1.2 }]] };
  assert.deepEqual(readDraft({ getItem: () => JSON.stringify([invalid]) }), fresh);
  const disabled = {
    getItem() { throw new Error('disabled'); },
    setItem() { throw new Error('disabled'); },
  };
  assert.deepEqual(readDraft(disabled), fresh);
  assert.doesNotThrow(() => writeDraft(disabled, { ...fresh, strokes: [stroke] }));
});

const prepared = {
  espressoMl: 34.5, milkMl: 105, temperature: 62.3, foam: .2,
  fineness: .75, extraction: .84, separation: .03, espressoTemperature: 70, seed: 241,
};

test('the prepared recipe and chosen height survive a reload before pouring', () => {
  const storage = tabStorage();
  const preparation = { ...fresh, recipe: prepared, pourHeight: 8 };
  writeDraft(storage, preparation);
  assert.deepEqual(readDraft(storage), preparation);
  assert.deepEqual(milkProfile(readDraft(storage).recipe), {
    espressoMl: 34.5, milkMl: 105, temperatureC: 62.3, aeration: .2,
    coarseness: .25, crema: .84, separation: .03, seed: 241,
  });
  writeDraft(storage, fresh);
  assert.deepEqual(readDraft(storage), fresh);
});

test('invalid preparation fields fall back to direct pouring while valid recipes give specific feedback', () => {
  const storage = tabStorage();
  writeDraft(storage, { ...fresh, recipe: { ...prepared, temperature: 120 }, pourHeight: 2 });
  assert.deepEqual(readDraft(storage), fresh);
  assert.equal(readRecipe({ ...prepared, milkMl: '105' }), null);
  assert.equal(cupNotes(prepared, 60).foamLabel, 'なめらか');
  assert.match(cupNotes({ ...prepared, temperature: 71 }, 60).tip, /60〜65℃/);
});
