import test from 'node:test';
import assert from 'node:assert/strict';
import { drawingFoamClips } from '../public/latte-art/foam-geometry.js';
import { ChocolateDrawing } from '../public/latte-art/drawing.js';

test('a dot can start on visible foam but not where the cup wall hides it', () => {
  for (const aspect of [320 / 480, 375 / 812, 390 / 844, 1280 / 800]) {
    const bounds = drawingFoamClips(aspect);
    const drawing = new ChocolateDrawing();
    assert.ok(drawing.start(1, { x: .81, y: 0 }, .03, '#4c281b', bounds));
    drawing.end(1);
    assert.equal(drawing.start(2, { x: 0, y: .99 }, .03, '#4c281b', bounds), false);
    assert.ok(drawing.start(3, { x: 0, y: -.95 }, .03, '#4c281b', bounds));
    drawing.end(3);
  }
});

test('a swipe through the obscured edge ends on the first visible boundary and resumes there', () => {
  const bounds = drawingFoamClips(390 / 844);
  const drawing = new ChocolateDrawing();
  drawing.start(1, { x: 0, y: .70 }, .03, '#4c281b', bounds);
  drawing.move(1, [{ x: 0, y: .99 }, { x: .1, y: .98 }, { x: .1, y: .68 }]);
  drawing.end(1);
  const [departure, arrival] = drawing.strokes[0].paths;
  assert.ok(departure.at(-1).y > .70 && departure.at(-1).y < .99);
  assert.ok(arrival[0].y > .68 && arrival[0].y < .98);
  for (const point of [departure.at(-1), arrival[0]]) {
    assert.ok(bounds.some(circle => Math.abs(Math.hypot(point.x-circle.x,point.y-circle.y)-circle.radius) < 1e-9));
  }
});

test('milk raises and widens the surface while leaving room below the lip', async () => {
  const { liquidPlaneAtFill, CUP_PROFILE } = await import('../public/latte-art/foam-geometry.js');
  let previous = liquidPlaneAtFill(0);
  for (let step = 1; step <= 100; step++) {
    const plane = liquidPlaneAtFill(step / 100);
    assert.ok(plane.height > previous.height && plane.radius >= previous.radius);
    previous = plane;
  }
  assert.ok(previous.height < Math.max(...CUP_PROFILE.map(([, height]) => height)));
  assert.deepEqual(liquidPlaneAtFill(2), previous);
  assert.deepEqual(liquidPlaneAtFill(-1), liquidPlaneAtFill(0));
});
