import * as THREE from '../vendor/three/three.module.js';

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

export function updateMilkStream(geometry, start, end, amount) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  const across = new THREE.Vector3(-dz, 0, dx);
  if (across.lengthSq() < 1e-8) across.set(1, 0, 0);
  else across.normalize();
  const tangent = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const vertices = geometry.getAttribute('position');
  const startRadius = .041 * Math.sqrt(.12 + .88 * amount);
  for (let ring = 0; ring <= STREAM_SEGMENTS; ring++) {
    const t = ring / STREAM_SEGMENTS;
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
