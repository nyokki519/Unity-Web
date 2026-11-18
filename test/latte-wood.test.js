import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleWalnut } from '../public/latte-art/walnut.js';

test('walnut texture wraps on both axes without introducing seams', () => {
  for (const [u, v] of [[.19, .47], [.98, .013], [.44, .31]]) {
    const base = sampleWalnut(u, v);
    for (const other of [sampleWalnut(u + 1, v), sampleWalnut(u, v - 1)]) {
      assert.ok(Math.abs(base.tone - other.tone) < 1e-9);
      assert.ok(Math.abs(base.fiber - other.fiber) < 1e-9);
    }
  }
});

test('walnut fine fibers are elongated along the grain', () => {
  let along = 0;
  let across = 0;
  for (let n = 0; n < 39; n++) {
    const u = (n * .137) % 1;
    const v = (n * .377) % 1;
    const base = sampleWalnut(u, v).fiber;
    along += Math.abs(base - sampleWalnut(u + .004, v).fiber);
    across += Math.abs(base - sampleWalnut(u, v + .004).fiber);
  }
  assert.ok(across > 2 * along);
});
