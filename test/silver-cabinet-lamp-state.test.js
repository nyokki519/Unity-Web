import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleCabinetLampState, chooseCabinetPulse } from '../public/silver-ring/src/cabinet-lamp-state.js';

test('idle lamps use restrained amber and emerald values', () => {
  const state = sampleCabinetLampState({ time: 4.2, mode: 'idle', pulse: null });
  assert.equal(state.color, 'amber');
  assert.ok(state.level >= 0.18 && state.level <= 0.34);
  assert.equal(state.chase, -1);
});

test('event pulse moves upward through the cabinet with bounded brightness', () => {
  const early = sampleCabinetLampState({ time: 1, mode: 'idle', pulse: { kind: 'bowl', tier: 1, age: 0.04 } });
  const late = sampleCabinetLampState({ time: 1, mode: 'idle', pulse: { kind: 'bowl', tier: 1, age: 0.38 } });
  assert.equal(early.color, 'emerald');
  assert.ok(late.chase > early.chase);
  assert.ok(late.level > early.level);
  assert.ok(early.level >= 0.18 && early.level <= 1.2);
  assert.ok(late.level >= 0.18 && late.level <= 1.2);
});

test('successful sink gets champagne while a miss stays emerald', () => {
  const win = sampleCabinetLampState({ time: 2, pulse: { kind: 'sink', tier: 2, win: true, age: 0.2 } });
  const miss = sampleCabinetLampState({ time: 2, pulse: { kind: 'sink', tier: 1, win: false, age: 0.2 } });
  assert.equal(win.color, 'champagne');
  assert.equal(miss.color, 'amber');
});

test('deeper bowl entries advance the light path and gently increase emphasis', () => {
  const first = sampleCabinetLampState({ time: 0, pulse: { kind: 'bowl', tier: 0, age: 0.2 } });
  const final = sampleCabinetLampState({ time: 0, pulse: { kind: 'bowl', tier: 2, age: 0.2 } });
  assert.equal(first.color, 'emerald');
  assert.equal(final.color, 'emerald');
  assert.notEqual(first.chase, final.chase);
  assert.ok(final.level > first.level);
});

test('lower-priority events cannot replace an active jackpot lamp pulse', () => {
  const jackpot = { kind: 'jackpot', tier: 2, win: true, age: 0.35 };
  assert.equal(chooseCabinetPulse(jackpot, { kind: 'gate', tier: 0, win: false, age: 0 }), jackpot);
  assert.equal(chooseCabinetPulse(jackpot, { kind: 'sink', tier: 2, win: true, age: 0 }), jackpot);
  assert.equal(chooseCabinetPulse(jackpot, { kind: 'jackpot', tier: 2, win: true, age: 0 }).age, 0);
});

test('newer equal-priority pulses replace stale pulses', () => {
  const prior = { kind: 'bowl', tier: 0, win: false, age: 0.25 };
  const next = { kind: 'bowl', tier: 2, win: false, age: 0 };
  assert.equal(chooseCabinetPulse(prior, next), next);
});

test('jackpot is a short champagne crescendo then returns to idle', () => {
  const flash = sampleCabinetLampState({ time: 2, mode: 'idle', pulse: { kind: 'jackpot', tier: 2, age: 0.12 } });
  const tail = sampleCabinetLampState({ time: 2, mode: 'idle', pulse: { kind: 'jackpot', tier: 2, age: 2.0 } });
  assert.equal(flash.color, 'champagne');
  assert.ok(flash.level > 0.8);
  assert.equal(tail.color, 'amber');
  assert.ok(tail.level <= 0.34);
});

test('reduced motion removes chasing and strobing without hiding state', () => {
  const regular = sampleCabinetLampState({ time: 7.3, mode: 'tension', pulse: { kind: 'gate', tier: 0, age: 0.12 }, reduced: false });
  const reduced = sampleCabinetLampState({ time: 7.3, mode: 'tension', pulse: { kind: 'gate', tier: 0, age: 0.12 }, reduced: true });
  const reducedLater = sampleCabinetLampState({ time: 9.3, mode: 'tension', pulse: { kind: 'gate', tier: 0, age: 0.3 }, reduced: true });
  assert.equal(reduced.color, regular.color);
  assert.equal(reduced.chase, -1);
  assert.equal(reduced.level, reducedLater.level);
});
