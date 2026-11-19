import * as THREE from '../vendor/three/three.module.js';

export { CUP_PROFILE, FOAM_PLANE, tableCameraFraming } from './foam-geometry.js';

// Two ceramic roots joined by a rounded, tapered strap.
const LEAN = .58;
const rootTop = new THREE.Vector2(1.355, 1.045);
const outside = new THREE.Vector2(2.035, .782);
const rootBottom = new THREE.Vector2(1.075, .515);
const upper = new THREE.CubicBezierCurve(rootTop, new THREE.Vector2(1.665, 1.136),
  new THREE.Vector2(2.040, 1.101), outside);
const lower = new THREE.CubicBezierCurve(outside, new THREE.Vector2(2.026, .414),
  new THREE.Vector2(1.683, .372), rootBottom);

export function handleProfile(t) {
  const curve = t <= .5 ? upper : lower;
  const local = t <= .5 ? t * 2 : (t - .5) * 2;
  const { x, y } = curve.getPoint(local);
  const tangent = curve.getTangent(local);
  const narrow = Math.sin(Math.PI * t);
  return {
    x, y, z: LEAN * (y - outside.y), nx: tangent.y, ny: -tangent.x,
    depth: .094 - .022 * narrow,
    width: .135 - .035 * narrow,
  };
}

export function createHandleGeometry() {
  const segments = 48;
  const sides = 18;
  const positions = [];
  const indices = [];
  for (let ring = 0; ring <= segments; ring++) {
    const profile = handleProfile(ring / segments);
    for (let side = 0; side < sides; side++) {
      const angle = 2 * Math.PI * side / sides;
      const alongNormal = Math.cos(angle) * profile.depth;
      const across = Math.sin(angle) * profile.width;
      positions.push(
        profile.x + profile.nx * alongNormal,
        profile.y + profile.ny * alongNormal - across * .32,
        profile.z + LEAN * profile.ny * alongNormal + across,
      );
      if (ring === segments) continue;
      const a = ring * sides + side;
      const b = ring * sides + (side + 1) % sides;
      indices.push(a, a + sides, b, b, a + sides, b + sides);
    }
  }
  const mesh = new THREE.BufferGeometry();
  mesh.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  mesh.setIndex(indices);
  mesh.computeVertexNormals();
  return mesh;
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

export const PITCHER_LIP = Object.freeze({ x: -.67, y: 1.17, z: 0 });

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

export function sampleFallingMilk(start, end, t) {
  return {
    x: THREE.MathUtils.lerp(start.x, end.x, t),
    y: THREE.MathUtils.lerp(start.y, end.y, t * t),
    z: THREE.MathUtils.lerp(start.z, end.z, t),
  };
}

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

export function updateMilkStream(geometry, start, end, amount, cut = 0) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  const across = new THREE.Vector3(-dz, 0, dx);
  if (across.lengthSq() < 1e-8) across.set(1, 0, 0);
  else across.normalize();
  const tangent = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const vertices = geometry.getAttribute('position');
  const startRadius = .044 * Math.sqrt(amount);
  for (let ring = 0; ring <= STREAM_SEGMENTS; ring++) {
    const t = THREE.MathUtils.lerp(cut, 1, ring / STREAM_SEGMENTS);
    const center = sampleFallingMilk(start, end, t);
    tangent.set(dx, 2 * Math.max(.001, t) * dy, dz).normalize();
    normal.crossVectors(tangent, across).normalize();
    const radius = startRadius / Math.sqrt(1 + 2 * t);
    for (let side = 0; side < STREAM_SIDES; side++) {
      const angle = Math.PI * 2 * side / STREAM_SIDES;
      const a = radius * Math.cos(angle);
      const b = radius * Math.sin(angle);
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
