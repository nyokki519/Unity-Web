import test from 'node:test';
import assert from 'node:assert/strict';
import { Euler, LatheGeometry, PerspectiveCamera, Vector2, Vector3 } from '../public/vendor/three/three.module.js';
import { HANDLE_ANGLE, SPOON_REST, saucerHeightAt } from '../public/latte-art/tableware-profile.js';
import { CUP_PROFILE, liquidPlaneAtFill } from '../public/latte-art/foam-geometry.js';
import {
  createHandleGeometry, handleProfile, createMilkStreamGeometry, createSpoonBowlGeometry, createSpoonStemGeometry,
  FOAM_PLANE, PITCHER_LIP, pourJetPose, sampleFallingMilk, shapePitcherSpout, tableCameraFraming, updateMilkStream,
} from '../public/latte-art/cup-model.js';

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
    if (positions.getY(index) < FOAM_PLANE.height) continue;
    assert.ok(Math.hypot(positions.getX(index), positions.getZ(index)) >= FOAM_PLANE.radius);
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

test('an established pour lowers the pitcher lip and tips farther over the same point', () => {
  const firstDrops = pourJetPose(.04, .1);
  const steadyPour = pourJetPose(.62, .1);
  const nearEmpty = pourJetPose(.62, .94);
  assert.ok(firstDrops.height > steadyPour.height + .15);
  assert.ok(steadyPour.height >= .4 && steadyPour.height < .69);
  assert.ok(steadyPour.angle > firstDrops.angle && nearEmpty.angle > steadyPour.angle);
  assert.ok(nearEmpty.angle < Math.PI / 2);
});

test('after release the last part of the stream clears the spout and reaches the original landing point', () => {
  const start = { x: 1.3, y: 2.32, z: -.1 };
  const end = { x: 1.1, y: 1.06, z: .18 };
  const geometry = createMilkStreamGeometry();
  updateMilkStream(geometry, start, end, .20, .55);
  const positions = geometry.getAttribute('position');
  const firstY = (positions.getY(0) + positions.getY(4)) * .5;
  const lastY = (positions.getY(positions.count - 8) + positions.getY(positions.count - 4)) * .5;
  assert.ok(firstY < start.y - .33);
  assert.ok(Math.abs(lastY - end.y) < .001);
  geometry.dispose();
});

test('the spoon stem has a flat cross-section and widens at the grip', () => {
  const stem = createSpoonStemGeometry();
  stem.computeBoundingBox();
  const { min, max } = stem.boundingBox;
  assert.ok(max.x - min.x > 1.55);
  assert.ok(max.y - min.y < .08);
  const positions = stem.getAttribute('position');
  let neck = 0;
  let grip = 0;
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const radius = Math.abs(positions.getZ(index));
    if (x > -.2 && x < .18) neck = Math.max(neck, radius);
    if (x > .72 && x < 1.04) grip = Math.max(grip, radius);
  }
  assert.ok(neck > 0 && grip > neck * 1.5);
  stem.dispose();
});

test('passing through the old portrait boundary keeps table framing continuous', () => {
  const before = tableCameraFraming('draw', 599 / 800);
  const after = tableCameraFraming('draw', 601 / 800);
  assert.ok(Math.abs(before.distance - after.distance) < .15);
  assert.ok(Math.abs(before.elevation - after.elevation) < .2);
  assert.ok(Math.abs(before.shiftY - after.shiftY) < .005);
  assert.deepEqual(tableCameraFraming('photo', .6), tableCameraFraming('photo', 1));
});

test('the cup rim has breathing room on narrow portrait screens without trimming the painting surface', () => {
  for (const [width, height] of [[320, 568], [375, 812], [390, 844], [414, 896]]) {
    const aspect = width / height;
    const framing = tableCameraFraming('pour', aspect);
    const camera = new PerspectiveCamera(28, aspect, .1, 80);
    camera.setViewOffset(width, height, width * framing.shiftX, height * framing.shiftY, width, height);
    camera.position.copy(framing.eye);
    camera.lookAt(framing.targetX, framing.targetY, framing.targetZ);
    camera.updateMatrixWorld();
    for (const [radius, level] of CUP_PROFILE) {
      for (let sample = 0; sample < 48; sample++) {
        const angle = sample * Math.PI / 24;
        const { x } = new Vector3(radius * Math.cos(angle), level, radius * Math.sin(angle)).project(camera);
        assert.ok(Math.abs(x) * width / 2 < width / 2 - 6, `rim meets the edge at ${width}px`);
      }
    }
  }
});

test('the milk stream starts at the flared pitcher lip with an unchanged base', () => {
  const geometry = new LatheGeometry([new Vector2(.58, .2), new Vector2(.45, 1.18)], 144);
  shapePitcherSpout(geometry);
  const positions = geometry.getAttribute('position');
  let tipDistance = Infinity;
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    if (y < .3) assert.ok(Math.abs(Math.hypot(x, z) - .58) < 1e-6);
    else tipDistance = Math.min(tipDistance, Math.hypot(x - PITCHER_LIP.x, y - PITCHER_LIP.y, z));
  }
  assert.ok(tipDistance < .01);
  geometry.dispose();
});


test('a moving pitcher remains above the rim and its lip stays inside the opening', () => {
  const rim = Math.max(...CUP_PROFILE.map(([, height]) => height));
  for (const flow of [.05, .35, .62, 1]) {
    for (const used of [0, .5, 1]) {
      const plane = liquidPlaneAtFill(used);
      for (let angle = 0; angle < Math.PI * 2; angle += .2) {
        const position = { x: .91 * Math.cos(angle), y: .91 * Math.sin(angle) };
        const jet = pourJetPose(flow, used, position, plane);
        const lip = plane.height + jet.height;
        for (const [radius, y] of [[.51, 0], [.58, .07], [.60, .22], [.54, .72], [.45, 1.18]]) {
          const bottom = lip + .84 * ((-radius - PITCHER_LIP.x) * Math.sin(jet.angle)
            + (y - PITCHER_LIP.y) * Math.cos(jet.angle));
          assert.ok(bottom >= rim + .018);
        }
        assert.ok(Math.hypot(position.x * plane.radius + jet.reach,
          position.y * plane.radius + jet.depth) < plane.radius - .025);
      }
    }
  }
});

test('the grip opening remains visible from the serving camera', () => {
  const top = handleProfile(.08);
  const bottom = handleProfile(.92);
  const elevation = tableCameraFraming('photo', 1).elevation * Math.PI / 180;
  const projectedDepth = -(top.x - bottom.x) * Math.sin(HANDLE_ANGLE) + (top.z - bottom.z) * Math.cos(HANDLE_ANGLE);
  const opening = (top.y - bottom.y) * Math.cos(elevation) - projectedDepth * Math.sin(elevation);
  assert.ok(opening > top.depth + bottom.depth + .08);
});

test('the rolled rim leaves a shallow headspace above the foam', () => {
  const rimHeight = Math.max(...CUP_PROFILE.map(([, height]) => height));
  assert.ok(rimHeight - FOAM_PLANE.height < FOAM_PLANE.radius * .18);
  assert.ok(rimHeight - FOAM_PLANE.height > FOAM_PLANE.radius * .10);
});


test('the bowl and the grip of the spoon both rest on the saucer', () => {
  const { x, y, z, yaw, pitch, scale } = SPOON_REST;
  const rotation = new Euler(0, yaw, pitch);
  const origin = new Vector3(x, y, z);
  const bowl = createSpoonBowlGeometry();
  const stem = createSpoonStemGeometry().translate(.24, .085, 0);
  for (const part of [bowl, stem]) {
    let gap = Infinity;
    const vertices = part.getAttribute('position');
    const point = new Vector3();
    for (let i = 0; i < vertices.count; i++) {
      point.fromBufferAttribute(vertices, i).multiplyScalar(scale).applyEuler(rotation).add(origin);
      gap = Math.min(gap, point.y - saucerHeightAt(Math.hypot(point.x, point.z)));
    }
    assert.ok(Math.abs(gap) < .002, `spoon clearance ${gap}`);
    part.dispose();
  }
});
