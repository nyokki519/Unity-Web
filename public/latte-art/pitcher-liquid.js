import * as THREE from '../vendor/three/three.module.js';
import { PITCHER_LIP } from './cup-model.js';

export const PITCHER_LIQUID_SEGMENTS = 56;
const TOP = 1.157;

function innerRadius(height) {
  if (height >= .65) return .47 - .04 * (height - .65) / (TOP - .65);
  if (height >= .20) return .52 - .05 * (height - .20) / .45;
  return .52 * (height - .10) / .10;
}

export function pitcherLiquidLevel(tilt, used, resting) {
  const cosine = Math.cos(tilt);
  const neutral = .94 - .41 * used;
  const lipHeight = PITCHER_LIP.x * Math.sin(tilt) + PITCHER_LIP.y * cosine;
  return Math.min(1.12 * cosine, THREE.MathUtils.lerp(lipHeight + .005, neutral, resting));
}

function sectionCenter(level, tilt) {
  const c = Math.cos(tilt);
  // At a steep tilt the level intersects only the lower, spout-facing wall.
  // Pick a point inside that section rather than the extrapolated center axis.
  if (level / c < .3) return (level * c - .3) / Math.sin(tilt);
  return -level * Math.tan(tilt);
}

export function pitcherLiquidEdge(angle, level, tilt) {
  const cosine = Math.cos(tilt);
  const sine = Math.sin(tilt);
  const center = sectionCenter(level, tilt);
  const dx = Math.cos(angle);
  const dz = Math.sin(angle);
  let low = 0;
  let high = .92;

  // Intersect a world-horizontal ray with the interior walls in pitcher coordinates.
  for (let i = 0; i < 9; i++) {
    const radius = (low + high) / 2;
    const x = center + dx * radius;
    const z = dz * radius;
    const localY = level * cosine - x * sine;
    const localX = x * cosine + level * sine;
    const spout = localX < 0
      ? .18 * THREE.MathUtils.smoothstep(localY, .78, 1.18) * Math.exp(-((Math.atan2(z, -localX) / .34) ** 2))
      : 0;
    if (localY < .11 || localY > TOP || Math.hypot(localX + spout, z) >= innerRadius(localY) - .003) high = radius;
    else low = radius;
  }
  return { x: center + dx * low, y: level, z: dz * low };
}

export function createPitcherLiquid() {
  const geometry = new THREE.BufferGeometry();
  const count = PITCHER_LIQUID_SEGMENTS;
  const positions = new THREE.BufferAttribute(new Float32Array((count + 1) * 3), 3);
  positions.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', positions);
  const normals = Array.from({ length: (count + 1) * 3 }, (_, i) => i % 3 === 1 ? 1 : 0);
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(Array.from({ length: count }, (_, i) => [0, 1 + (i + 1) % count, 1 + i]).flat());
  const material = new THREE.MeshStandardMaterial({ color: '#f4e7d4', roughness: .49 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return {
    mesh,
    update(pitcher, tilt, used, resting) {
      const level = pitcherLiquidLevel(tilt, used, resting);
      positions.setXYZ(0, sectionCenter(level, tilt), level, 0);
      for (let i = 0; i < count; i++) {
        const point = pitcherLiquidEdge(i / count * Math.PI * 2, level, tilt);
        positions.setXYZ(i + 1, point.x, point.y, point.z);
      }
      positions.needsUpdate = true;
      mesh.position.copy(pitcher.position);
    },
  };
}
