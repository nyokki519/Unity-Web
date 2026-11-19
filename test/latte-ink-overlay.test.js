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
