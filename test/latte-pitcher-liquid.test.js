import test from 'node:test';
import assert from 'node:assert/strict';
import { pitcherLiquidLevel, pitcherLiquidEdge, PITCHER_LIQUID_SEGMENTS } from '../public/latte-art/pitcher-liquid.js';

test('the milk inside a tilted pitcher lies on a level plane with a bounded outline', () => {
  for (const tilt of [.08, .39, .67]) {
    const level = pitcherLiquidLevel(tilt, .4, .2);
    const edges = Array.from({ length: PITCHER_LIQUID_SEGMENTS }, (_, index) =>
      pitcherLiquidEdge(index / PITCHER_LIQUID_SEGMENTS * Math.PI * 2, level, tilt));
    assert.ok(edges.every(point => point.y === level && Math.hypot(point.x, point.z) < 2));
    assert.ok(edges[0].x > edges[PITCHER_LIQUID_SEGMENTS / 2].x);
    assert.ok(edges[PITCHER_LIQUID_SEGMENTS / 4].z > .1);
  }
});

test('the level of a resting pitcher drops as milk enters the cup', () => {
  assert.ok(pitcherLiquidLevel(.08, 0, 1) > pitcherLiquidLevel(.08, .6, 1));
  assert.ok(pitcherLiquidLevel(.08, .6, 1) > pitcherLiquidLevel(.08, 1, 1));
});
