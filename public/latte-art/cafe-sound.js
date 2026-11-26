import { cafeAudioContext, cafeAudioSupported } from './cafe-audio.js';

const SOUND_KEY = 'unity-mix.latte-art.sound';
const STEAM_TONES = {
  surface: { frequency: 5600, level: .18 },
  air: { frequency: 3000, level: .14 },
  roll: { frequency: 4300, level: .12 },
  deep: { frequency: 710, level: .085 },
};

export function createCafeSound() {
  let enabled = false;
  try { enabled = cafeAudioSupported && localStorage.getItem(SOUND_KEY) === 'on'; } catch { /* Audio stays optional. */ }
  let context;
  let filter;
  let volume;
  let lastFrequency;
  let lastLevel;

  function unlock() {
    if (!enabled || !cafeAudioSupported) return;
    try {
      if (!context) {
        context = cafeAudioContext();
        const frames = Math.round(context.sampleRate * 2);
        const buffer = context.createBuffer(1, frames, context.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < frames; i++) {
          const pump = Math.sin(2 * Math.PI * 48 * i / context.sampleRate) * .16;
          samples[i] = (Math.random() * 2 - 1) * .7 + pump;
        }
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        filter = context.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = .8;
        filter.frequency.value = 350;
        volume = context.createGain();
        volume.gain.value = 0;
        source.connect(filter).connect(volume).connect(context.destination);
        source.start();
      }
      if (context.state !== 'running') context.resume().catch(() => {});
    } catch { /* Restricted audio must leave the controls usable. */ }
  }

  function update({ kind = 'off', depth = 'air', flow = 0 } = {}) {
    if (!volume || !filter) return;
    if (!enabled || document.hidden) kind = 'off';
    let frequency = lastFrequency ?? 350;
    let level = 0;
    if (kind === 'extract') {
      frequency = flow > 0 ? 185 : 125;
      level = flow > 0 ? .11 : .08;
    } else if (kind === 'steam') {
      ({ frequency, level } = STEAM_TONES[depth] ?? STEAM_TONES.air);
    } else if (kind === 'pour' && flow > .025) {
      frequency = Math.round((560 + 430 * flow) / 80) * 80;
      level = Math.round(flow * 10) * .006;
    }
    const time = context.currentTime;
    if (frequency !== lastFrequency) filter.frequency.setTargetAtTime(frequency, time, .085);
    if (level !== lastLevel) volume.gain.setTargetAtTime(level, time, level ? .036 : .025);
    lastFrequency = frequency;
    lastLevel = level;
  }

  function toggle() {
    enabled = !enabled;
    try { localStorage.setItem(SOUND_KEY, enabled ? 'on' : 'off'); } catch { /* Use in-memory setting. */ }
    if (enabled) unlock();
    else update();
  }

  return { supported: cafeAudioSupported, get enabled() { return enabled; }, unlock, update, toggle };
}
