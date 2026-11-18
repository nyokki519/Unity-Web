import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandleGeometry, handleProfile, createMilkStreamGeometry, sampleFallingMilk, updateMilkStream } from '../public/latte-art/cup-model.js';

test('handle opens around a ceramic grip without crossing into milk', () => {
  const rings = Array.from({ length: 49 }, (_, i) => handleProfile(i / 48));
  const upper = rings[0];
  const lower = rings.at(-1);
  assert.ok(upper.y - lower.y > .46);
  assert.ok(Math.abs(upper.z - lower.z) > .21, 'the strap leans enough to show the opening from above');
  assert.ok(Math.max(...rings.map(r => r.x)) > 1.94);
  assert.ok(rings[24].width < upper.width, 'the grip tapers from the upper root');
  const geometry = createHandleGeometry();
  const positions = geometry.getAttribute('position');
  for (let index = 0; index < positions.count; index++) {
    if (positions.getY(index) < 1.17) continue;
    assert.ok(Math.hypot(positions.getX(index), positions.getZ(index)) >= 1.332);
  }
  geometry.dispose();
});

test('the milk stream falls toward the same surface and narrows as it accelerates', () => {
  const start = { x: 1.7, y: 2.65, z: -.45 };
  const end = { x: -.42, y: 1.17, z: .22 };
  const middle = sampleFallingMilk(start, end, .5);
  assert.ok(Math.abs(middle.y - 2.28) < 1e-9);
  const arrival = sampleFallingMilk(start, end, 1);
  assert.ok(Math.abs(arrival.y - end.y) < 1e-9);
  assert.ok(Math.abs(arrival.x - end.x) < 1e-9);
  const geometry = createMilkStreamGeometry();
  updateMilkStream(geometry, start, end, .65);
  const vertices = geometry.getAttribute('position');
  const thickness = index => Math.hypot(
    vertices.getX(index) - vertices.getX(index + 4),
    vertices.getY(index) - vertices.getY(index + 4),
    vertices.getZ(index) - vertices.getZ(index + 4),
  );
  assert.ok(thickness(vertices.count - 8) < thickness(0));
  geometry.dispose();
});
