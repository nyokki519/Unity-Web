import { milkJetRadius, sampleFallingMilk } from './pour-jet.js';
import * as THREE from '../vendor/three/three.module.js';

export { CUP_PROFILE, FOAM_PLANE, tableCameraFraming } from './foam-geometry.js';

import { handleProfile, handleCrossSection } from './tableware-profile.js';
export { handleProfile } from './tableware-profile.js';

export function createHandleGeometry() {
  const segments = 48;
  const sides = 18;
  const positions = [];
  const colors = [];
  const indices = [];
  for (let ring = 0; ring <= segments; ring++) {
    const profile = handleProfile(ring / segments);
    for (let side = 0; side < sides; side++) {
      const angle = 2 * Math.PI * side / sides;
      const { x, y, z } = handleCrossSection(profile, angle);
      positions.push(x, y, z);
      // The inward face receives less diffuse room light through the narrow opening.
      const occlusion = Math.max(0, Math.cos(angle)) ** 1.5;
      colors.push(1 - .18 * occlusion, 1 - .20 * occlusion, 1 - .23 * occlusion);
      if (ring === segments) continue;
      const a = ring * sides + side;
      const b = ring * sides + (side + 1) % sides;
      indices.push(a, a + sides, b, b, a + sides, b + sides);
    }
  }
  const mesh = new THREE.BufferGeometry();
  mesh.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  mesh.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  mesh.setIndex(indices);
  mesh.computeVertexNormals();
  return mesh;
}

export function createSpoonBowlGeometry() {
  const profile = [
    [0, .035], [.10, .036], [.18, .044], [.24, .069], [.275, .098],
    [.286, .111], [.285, .119], [.275, .124], [.266, .119],
    [.235, .094], [.177, .070], [.093, .055], [0, .051],
  ];
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 80)
    .scale(1.6, 1, 1).translate(-.61, 0, 0);
}

export function createSpoonStemGeometry() {
  const outline = new THREE.Shape();
  outline.moveTo(-.49, 0);
  outline.quadraticCurveTo(-.48, .042, -.41, .043);
  outline.bezierCurveTo(-.22, .04, .11, .027, .38, .052);
  outline.bezierCurveTo(.65, .076, .82, .089, 1.01, .082);
  outline.bezierCurveTo(1.08, .079, 1.11, .052, 1.11, 0);
  outline.bezierCurveTo(1.11, -.052, 1.08, -.079, 1.01, -.082);
  outline.bezierCurveTo(.82, -.089, .65, -.076, .38, -.052);
  outline.bezierCurveTo(.11, -.027, -.22, -.04, -.41, -.043);
  outline.quadraticCurveTo(-.48, -.042, -.49, 0);
  const stem = new THREE.ExtrudeGeometry(outline, {
    depth: .021, bevelThickness: .011, bevelSize: .013, bevelSegments: 3, curveSegments: 12,
  });
  stem.rotateX(-Math.PI / 2);
  const positions = stem.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const along = (positions.getX(i) + .49) / 1.6;
    positions.setY(i, positions.getY(i) + .03 * Math.sin(Math.PI * along));
  }
  stem.computeVertexNormals();
  return stem;
}

export function createChocolatePen() {
  const pen = new THREE.Group();
  const wrapper = new THREE.MeshStandardMaterial({ color: '#8d5f47', roughness: .76 });
  const nozzle = new THREE.MeshStandardMaterial({ color: '#4d3224', metalness: .32, roughness: .44 });
  const paper = new THREE.Mesh(new THREE.LatheGeometry([
    [.021, .14], [.048, .23], [.086, .40], [.123, .65], [.141, .88],
    [.133, .96], [.106, 1.01], [0, 1.04],
  ].map(([x, y]) => new THREE.Vector2(x, y)), 40), wrapper);
  const tip = new THREE.Mesh(new THREE.LatheGeometry([
    [0, 0], [.013, .009], [.021, .095], [.026, .154],
  ].map(([x, y]) => new THREE.Vector2(x, y)), 24), nozzle);
  const fold = new THREE.Mesh(new THREE.BoxGeometry(.25, .055, .037), wrapper);
  fold.position.y = 1;
  fold.rotation.z = -.06;
  pen.add(paper, tip, fold);
  for (const part of pen.children) {
    part.castShadow = true;
    part.receiveShadow = true;
  }
  pen.position.set(.12, .145, 2.59);
  pen.rotation.set(Math.PI / 2, 0, -.94);
  return pen;
}

export { PITCHER_LIP, pourJetPose, sampleFallingMilk } from './pour-jet.js';

export function shapePitcherSpout(geometry) {
  const positions = geometry.getAttribute('position');
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    if (y < .78 || x >= 0) continue;
    const angle = Math.atan2(z, -x);
    const rim = THREE.MathUtils.smoothstep(y, .78, 1.18);
    const pinch = Math.exp(-((angle / .34) ** 2)) * rim;
    positions.setXYZ(index, x - .22 * pinch, y - .014 * pinch, z);
  }
  geometry.computeVertexNormals();
}

const STREAM_SEGMENTS = 20;
const STREAM_SIDES = 8;

export function createMilkStreamGeometry() {
  const geometry = new THREE.BufferGeometry();
  const positions = new THREE.BufferAttribute(new Float32Array((STREAM_SEGMENTS + 1) * STREAM_SIDES * 3), 3);
  positions.setUsage(THREE.DynamicDrawUsage);
  const indices = [];
  for (let ring = 0; ring < STREAM_SEGMENTS; ring++) {
    for (let side = 0; side < STREAM_SIDES; side++) {
      const a = ring * STREAM_SIDES + side;
      const b = ring * STREAM_SIDES + (side + 1) % STREAM_SIDES;
      indices.push(a, b, a + STREAM_SIDES, b, b + STREAM_SIDES, a + STREAM_SIDES);
    }
  }
  geometry.setAttribute('position', positions);
  geometry.setIndex(indices);
  return geometry;
}

export function updateMilkStream(geometry, start, end, amount, cut = 0, head = 1) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  const across = new THREE.Vector3(-dz, 0, dx);
  if (across.lengthSq() < 1e-8) across.set(1, 0, 0);
  else across.normalize();
  const tangent = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const vertices = geometry.getAttribute('position');
  for (let ring = 0; ring <= STREAM_SEGMENTS; ring++) {
    const t = THREE.MathUtils.lerp(cut, head, ring / STREAM_SEGMENTS);
    const center = sampleFallingMilk(start, end, t);
    tangent.set(dx, 2 * Math.max(.001, t) * dy, dz).normalize();
    normal.crossVectors(tangent, across).normalize();
    const radius = milkJetRadius(amount, t, cut, head, Math.max(0, -dy));
    // At the lip the stream is a short ribbon that gathers into a round jet.
    const spread = 1 + .45 * (1 - THREE.MathUtils.smoothstep(t, 0, .26));
    for (let side = 0; side < STREAM_SIDES; side++) {
      const angle = Math.PI * 2 * side / STREAM_SIDES;
      const a = radius * spread * Math.cos(angle);
      const b = radius / spread * Math.sin(angle);
      vertices.setXYZ(
        ring * STREAM_SIDES + side,
        center.x + across.x * a + normal.x * b,
        center.y + across.y * a + normal.y * b,
        center.z + across.z * a + normal.z * b,
      );
    }
  }
  vertices.needsUpdate = true;
  geometry.computeVertexNormals();
}
