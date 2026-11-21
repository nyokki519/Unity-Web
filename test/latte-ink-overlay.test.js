import test from 'node:test';
import assert from 'node:assert/strict';
import { Matrix4, PerspectiveCamera, Vector3 } from '../public/vendor/three/three.module.js';
import { projectInkPlane } from '../public/latte-art/ink-overlay.js';

test('the ink canvas projection puts its points on the exact same 3D foam plane', () => {
  const radius = 1.304;
  const height = 1.06;
  const size = 1024;
  const viewport = { width: 390, height: 844 };
  const camera = new PerspectiveCamera(28, viewport.width / viewport.height, .1, 80);
  camera.position.set(0, 15, 8);
  camera.lookAt(.02, .69, .22);
  camera.setViewOffset(viewport.width, viewport.height, -43, 92, viewport.width, viewport.height);
  camera.updateMatrixWorld(true);
  const cameraMatrix = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  const css = projectInkPlane(cameraMatrix.elements, viewport, { radius, height }, size);
  for (const [x, y] of [[0, 0], [1024, 1024], [320, 680], [512, 512], [800, 141]]) {
    const cssW = css[3]*x + css[7]*y + css[15];
    const renderedX = (css[0]*x + css[4]*y + css[12]) / cssW;
    const renderedY = (css[1]*x + css[5]*y + css[13]) / cssW;
    const projected = new Vector3(radius*(2*x/size-1), height, radius*(2*y/size-1)).project(camera);
    assert.ok(Math.abs(renderedX - (projected.x+1)*viewport.width/2) < 1e-9);
    assert.ok(Math.abs(renderedY - (1-projected.y)*viewport.height/2) < 1e-9);
  }
});

test('lightweight liquid bounds agree with the perspective camera as the cup fills', async () => {
  const { liquidPlaneAtFill, projectedLiquidEllipse, tableCameraFraming } = await import('../public/latte-art/foam-geometry.js');
  for (const [width, height, view] of [[375, 844, 'pour'], [390, 844, 'draw'], [1200, 1200, 'photo']]) {
    const framing = tableCameraFraming(view, width / height);
    const camera = new PerspectiveCamera(28, width / height, .1, 80);
    camera.setViewOffset(width, height, width * framing.shiftX, height * framing.shiftY, width, height);
    camera.position.copy(framing.eye);
    camera.lookAt(framing.targetX, framing.targetY, framing.targetZ);
    camera.updateMatrixWorld(true);
    for (const fraction of [0, .25, .75, 1]) {
      const plane = liquidPlaneAtFill(fraction);
      const ellipse = projectedLiquidEllipse(width, height, view, plane);
      const x = [], y = [];
      for (let i = 0; i < 360; i++) {
        const a = i * Math.PI / 180;
        const p = new Vector3(Math.cos(a) * plane.radius, plane.height, Math.sin(a) * plane.radius).project(camera);
        x.push((1 + p.x) * width / 2);
        y.push((1 - p.y) * height / 2);
      }
      assert.ok(Math.abs(ellipse.x - ellipse.r - Math.min(...x)) < 1);
      assert.ok(Math.abs(ellipse.x + ellipse.r - Math.max(...x)) < 1);
      assert.ok(Math.abs(ellipse.y - ellipse.ry - Math.min(...y)) < 1);
      assert.ok(Math.abs(ellipse.y + ellipse.ry - Math.max(...y)) < 1);
    }
  }
});
