import test from 'node:test';
import assert from 'node:assert/strict';
import { StrokePaintCache } from '../public/latte-art/stroke-paint-cache.js';

function painter() {
  const calls = [];
  const cache = new StrokePaintCache({
    clear: () => calls.push('clear'),
    append: strokes => calls.push(strokes.slice()),
  });
  return { cache, calls };
}

test('only newly finished strokes are drawn into the cache', () => {
  const { cache, calls } = painter();
  const model = [{ paths: [] }, { paths: [] }, { paths: [] }];
  cache.sync(model, model[2]);
  model[2].paths.push([1, 2]);
  cache.sync(model, model[2]);
  cache.sync(model, null);
  assert.deepEqual(calls, [[model[0], model[1]], [model[2]]]);
});

test('undo, replacement at the same count, and clear rebuild the cached prefix', () => {
  const { cache, calls } = painter();
  const first = {};
  const second = {};
  const replacement = {};
  cache.sync([first, second], null);
  cache.sync([first, replacement], null);
  cache.sync([first], null);
  cache.sync([], null);
  assert.deepEqual(calls, [[first, second], 'clear', [first, replacement], 'clear', [first], 'clear']);
});
