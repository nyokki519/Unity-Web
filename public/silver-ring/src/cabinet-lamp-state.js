export const CABINET_PULSE_SECONDS = Object.freeze({
  gate: 0.72,
  bowl: 0.9,
  sink: 0.78,
  jackpot: 1.9,
});

const PULSE_PRIORITY = Object.freeze({ gate: 1, bowl: 2, sink: 3, jackpot: 4 });
const hasPulseKind = (kind) => Object.prototype.hasOwnProperty.call(CABINET_PULSE_SECONDS, kind);

export function chooseCabinetPulse(current, next) {
  if (!next || !hasPulseKind(next.kind)) return current ?? null;
  if (!current || !hasPulseKind(current.kind)) return next;
  const priority = (pulse) => (PULSE_PRIORITY[pulse.kind] ?? 0)
    + (pulse.kind === 'bowl' || pulse.kind === 'sink' ? clamp(Number.isFinite(pulse.tier) ? pulse.tier : 0, 0, 2) * 0.1 : 0)
    + (pulse.kind === 'sink' && pulse.win ? 0.5 : 0);
  return priority(next) >= priority(current) ? next : current;
}

const PALETTE = Object.freeze({
  amber: Object.freeze([0.92, 0.55, 0.22]),
  emerald: Object.freeze([0.18, 0.9, 0.52]),
  champagne: Object.freeze([1, 0.86, 0.58]),
});

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Deterministic, visual-only lamp state; it never reads or mutates game/physics state. */
export function sampleCabinetLampState({ time = 0, mode = 'idle', pulse = null, reduced = false } = {}) {
  const t = Number.isFinite(time) ? Math.max(0, time) : 0;
  let color = 'amber';
  let level = reduced ? 0.25 : 0.25 + Math.sin(t * 1.15) * 0.035;
  let chase = -1;

  if (mode === 'tension') {
    level = reduced ? 0.38 : 0.34 + Math.sin(t * 2.6) * 0.045;
  }

  if (pulse && hasPulseKind(pulse.kind)) {
    const duration = CABINET_PULSE_SECONDS[pulse.kind];
    const age = Number.isFinite(pulse.age) ? Math.max(0, pulse.age) : 0;
    if (age < duration) {
      const progress = age / duration;
      color = pulse.kind === 'jackpot' || (pulse.kind === 'sink' && pulse.win)
        ? 'champagne'
        : pulse.kind === 'sink' ? 'amber' : 'emerald';
      const tier = clamp(Number.isFinite(pulse.tier) ? pulse.tier : 0, 0, 2);
      if (reduced) {
        level = color === 'champagne' ? 0.72 : 0.58;
      } else {
        const attack = smooth(0, 0.12, age);
        const release = 1 - smooth(duration * 0.66, duration, age);
        const tierBoost = pulse.kind === 'bowl' ? tier * 0.055 : 0;
        const strength = pulse.kind === 'jackpot' ? 1.12 : pulse.kind === 'sink' ? 0.82 : 0.68 + tierBoost;
        level = 0.2 + (strength - 0.2) * attack * release;
        if (pulse.kind === 'jackpot') level += Math.sin(age * 13) * 0.045 * release;
        chase = (Math.floor(progress * 18) + (pulse.kind === 'bowl' ? tier * 3 : 0)) % 18;
      }
    }
  } else if (mode === 'jackpot') {
    color = 'champagne';
    level = reduced ? 0.72 : 0.76 + Math.sin(t * 3.4) * 0.08;
  }

  return Object.freeze({ color, rgb: PALETTE[color], level: clamp(level, 0.12, 1.2), chase });
}
