import test from 'node:test';
import assert from 'node:assert/strict';
import { readDraft, writeDraft } from '../public/latte-art/draft.js';

test('the tab-local draft preserves stroke order and clears with an empty cup', () => {
  const saved = new Map();
  const storage = { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) };
  const stroke = { color: '#4c281b', width: .04, paths: [[{ x: -.3, y: .2 }, { x: .4, y: .6 }]] };
  writeDraft(storage, [stroke]);
  assert.deepEqual(readDraft(storage), [stroke]);
  writeDraft(storage, []);
  assert.deepEqual(readDraft(storage), []);
});

test('invalid coordinates or unavailable storage leave a usable empty drawing', () => {
  const invalid = { color: '#4c281b', width: .04, paths: [[{ x: -.3, y: 1.2 }]] };
  assert.deepEqual(readDraft({ getItem: () => JSON.stringify([invalid]) }), []);
  const disabled = {
    getItem() { throw new Error('disabled'); },
    setItem() { throw new Error('disabled'); },
  };
  assert.deepEqual(readDraft(disabled), []);
  assert.doesNotThrow(() => writeDraft(disabled, [invalid]));
});
