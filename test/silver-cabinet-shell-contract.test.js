import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const scene = await readFile(new URL('../public/silver-ring/src/scene.js', import.meta.url), 'utf8');
const lamps = await readFile(new URL('../public/silver-ring/src/cabinet-lamp-state.js', import.meta.url), 'utf8');
const main = await readFile(new URL('../public/silver-ring/src/main.js', import.meta.url), 'utf8');
const fx = await readFile(new URL('../public/silver-ring/src/fx.js', import.meta.url), 'utf8');

test('exterior trim and lamp instances are attached to the cabinet, outside board geometry', () => {
  assert.match(scene, /const cabMat = new THREE\.MeshStandardMaterial\(\{ color: 0x123b2c, roughness: 0\.31, metalness: 0\.58, envMapIntensity: 1\.0 \}\)/);
  assert.doesNotMatch(scene, /cabinetEnamelTexture/);
  assert.match(scene, /cabinetLampSprite/);
  assert.match(scene, /machineG\.add\(cabinetLampSprite\)/);
  assert.doesNotMatch(scene, /cabinetLampGlow|cabinetLampHousings|cabinetLampBezels/);
  assert.match(scene, /const cabinetLampN = 18/);
  assert.match(scene, /const badgeN = 2/);
  assert.match(scene, /const cabinetBadges = new THREE\.InstancedMesh\(/);
  assert.match(scene, /machineG\.add\(cabinetBadges\)/);
  assert.doesNotMatch(scene, /badgeFaces|badgeRings|cupBadges/);
  assert.doesNotMatch(scene, /boardG\.add\(cabinetLamp/);
});

test('decorative lamp state is deterministic and has no gameplay dependencies', () => {
  assert.doesNotMatch(lamps, /Math\.random|from ['"].*(physics|config|sim)/);
  assert.doesNotMatch(lamps, /CFG\.|\.launch\(|\.step\(/);
});

test('lamp pulses are wired only to existing physical progression events', () => {
  for (const event of ["pulseCabinet('gate')", "pulseCabinet('bowl', d.tier)", "pulseCabinet('sink', d.tier, d.win)", "pulseCabinet('jackpot', 2, true)"]) {
    assert.ok(main.includes(event), `missing presentation event ${event}`);
  }
});

test('lamp pulses use presentation priority and wall time, not simulation speed', () => {
  assert.match(fx, /chooseCabinetPulse\(this\.cabinetPulse/);
  assert.match(fx, /this\.cabinetPulse\.age \+= wallDt/);
  assert.match(fx, /sampleCabinetLampState\(\{/);
  assert.doesNotMatch(lamps, /CFG\./);
});
