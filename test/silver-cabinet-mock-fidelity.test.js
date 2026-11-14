import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const scene = await readFile(new URL('../public/silver-ring/src/scene.js', import.meta.url), 'utf8');
const shell = await readFile(new URL('../public/silver-ring/src/cabinet-envelope.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../public/silver-ring/presentation.css', import.meta.url), 'utf8');
const framePng = await readFile(new URL('../public/silver-ring/assets/cabinet-frame.png', import.meta.url));
const { createCabinetEnvelope, CABINET_ENVELOPE_SPEC } = await import('../public/silver-ring/src/cabinet-envelope.js');
const THREE = await import('../public/vendor/three/three.module.js');

test('the cabinet has a substantial recessed bezel and arched crest around the unchanged playfield', () => {
  assert.match(shell, /cabinetOuterBezel/);
  assert.match(shell, /cabinetInnerBezel/);
  assert.match(shell, /cabinetTopCrest/);
  assert.match(scene, /createCabinetEnvelope\(THREE\)/);
  assert.match(scene, /cabinetPillarLights/);
  assert.match(scene, /machineG\.add\(cabinetEnvelope\)/);
  assert.doesNotMatch(scene, /boardG\.add\(cabinetEnvelope\)/);
  const envelope = createCabinetEnvelope(THREE);
  const outer = envelope.getObjectByName('cabinetOuterBezel');
  const bounds = outer.geometry.boundingBox;
  assert.ok(CABINET_ENVELOPE_SPEC.opening.width > 1.24, 'opening clears the 1.24m board width');
  assert.ok(CABINET_ENVELOPE_SPEC.opening.bottom < 0.62, 'opening clears the board lower edge');
  assert.ok(CABINET_ENVELOPE_SPEC.opening.crown > 3.01, 'opening clears the marquee top');
  assert.ok(bounds.min.x <= -0.89 && bounds.max.x >= 0.89, 'bezel has enough side depth to read as a cabinet');
  assert.ok(bounds.max.y < 3.58, 'new enclosure remains inside the widened portrait camera framing');
});

test('the mobile control dock reads as an inset cabinet console instead of a flat viewport footer', () => {
  assert.match(styles, /\.play-dock::before/);
  assert.match(styles, /\.play-dock::after/);
  assert.match(styles, /linear-gradient\([^;]*#[0-9a-f]{3,8}[^;]*#[0-9a-f]{3,8}/i);
  assert.match(styles, /inset 0 0 0 2px/);
});

test('the high-detail frame artwork has an alpha window and is composited in front of live gameplay', () => {
  assert.equal(framePng.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(framePng.readUInt32BE(16), 1086);
  assert.equal(framePng.readUInt32BE(20), 1448);
  assert.equal(framePng[25], 6, 'RGBA PNG is needed for the live gameplay opening');
  assert.match(scene, /cabinetFrameArt/);
  assert.match(scene, /cabinet-frame\.png/);
  assert.match(scene, /transparent:\s*true/);
});
