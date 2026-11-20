import test from 'node:test';
import assert from 'node:assert/strict';
import { ChocolateDrawing, paintChocolate } from '../public/latte-art/drawing.js';

test('each tap makes a dot that can be undone independently', () => {
  const drawing = new ChocolateDrawing();
  for (const x of [-0.3, 0.3]) {
    assert.ok(drawing.start(1, { x, y: -0.2 }, 0.02));
    drawing.end(1);
  }
  assert.equal(drawing.strokes.length, 2);
  assert.deepEqual(drawing.strokes[0].paths, [[{ x: -0.3, y: -0.2 }]]);
  drawing.undo();
  assert.equal(drawing.strokes.length, 1);
});

test('a fast drag stops at the foam rim and restarts at re-entry without a chord', () => {
  const drawing = new ChocolateDrawing();
  drawing.start(1, { x: -0.5, y: 0 }, 0.025);
  drawing.move(1, [{ x: -1.2, y: 0 }, { x: 0, y: -1.4 }, { x: 1.3, y: 0 }, { x: 0.55, y: 0 }, { x: 0.3, y: 0.1 }]);
  drawing.end(1);
  const [left, right] = drawing.strokes[0].paths;
  assert.equal(left.at(-1).x, -1);
  assert.equal(right[0].x, 1);
  assert.deepEqual(right.at(-1), { x: 0.3, y: 0.1 });
  drawing.undo();
  assert.deepEqual(drawing.strokes, []);
});

test('a second finger and events after release cannot alter the current drawing', () => {
  const drawing = new ChocolateDrawing();
  assert.equal(drawing.start(1, { x: 1.2, y: 0 }, 0.025), false);
  drawing.start(1, { x: 0, y: 0 }, 0.025);
  assert.equal(drawing.start(2, { x: 0.2, y: 0 }, 0.06), false);
  drawing.move(2, [{ x: 0.2, y: 0 }]);
  drawing.end(2);
  drawing.move(1, [{ x: 0.4, y: 0 }]);
  drawing.end(1);
  drawing.move(1, [{ x: 0.9, y: 0 }]);
  assert.deepEqual(drawing.strokes[0].paths, [[{ x: 0, y: 0 }, { x: 0.4, y: 0 }]]);
});

test('painted acute corners go through the finger position', () => {
  const segments = [];
  const context = {
    beginPath() {},
    moveTo() {},
    lineTo: (x, y) => segments.push([x, y]),
    quadraticCurveTo() {},
    stroke() {},
    createRadialGradient: () => ({ addColorStop() {} }),
    arc() {},
    fill() {},
  };
  paintChocolate(context, [{
    paths: [[{ x: -.2, y: .14 }, { x: 0, y: .4 }, { x: .2, y: .14 }]],
    width: .024,
    color: '#4c281b',
  }]);
  assert.ok(segments.some(([x, y]) => x === 0 && y === .4));
});

test('gradual folds keep their rounded brush motion', () => {
  const controls = [];
  const context = {
    beginPath() {},
    moveTo() {},
    lineTo() {},
    quadraticCurveTo: (x, y) => controls.push([x, y]),
    stroke() {},
    createRadialGradient: () => ({ addColorStop() {} }),
    arc() {},
    fill() {},
  };
  paintChocolate(context, [{
    paths: [[{ x: -.2, y: .14 }, { x: 0, y: .30 }, { x: .2, y: .14 }]],
    width: .024,
    color: '#4c281b',
  }]);
  assert.ok(controls.some(([x, y]) => x === 0 && y === .30));
});
