import { cafeAudioContext } from './cafe-audio.js';

const MUSIC_KEY = 'unity-mix.latte-art.music';
const VOLUME_KEY = 'unity-mix.latte-art.music-volume';
const DEFAULT_VOLUME = 100;

export function bindCafeMusic({ button, track, slider, readout, status }) {
  let enabled = true;
  let volume = DEFAULT_VOLUME;
  let interacted = false;
  let context;
  let gain;
  let buffer;
  let loading;
  let source;
  let startedAt = 0;
  let offset = 0;
  let nativePlayback = false;
  try {
    enabled = localStorage.getItem(MUSIC_KEY) !== 'off';
    const saved = Number(localStorage.getItem(VOLUME_KEY));
    if (Number.isInteger(saved) && saved >= 1 && saved <= 100) volume = saved;
  } catch { /* Use the defaults for this tab. */ }

  const canPlay = () => enabled && interacted && !document.hidden;

  function applyVolume() {
    const level = enabled ? volume / 100 : 0;
    if (gain) gain.gain.value = level;
    if (nativePlayback) track.volume = level;
  }

  function render() {
    const percent = `${enabled ? volume : 0}%`;
    button.setAttribute('aria-pressed', String(enabled));
    slider.value = enabled ? volume : 0;
    slider.setAttribute('aria-valuetext', percent);
    readout.textContent = percent;
    applyVolume();
  }

  function playbackFailed(error) {
    if (canPlay() && error.name !== 'AbortError') status.hidden = false;
  }

  function stop() {
    if (nativePlayback) track.pause();
    if (!source) return;
    offset = (offset + Math.max(0, context.currentTime - startedAt)) % buffer.duration;
    source.stop();
    source.disconnect();
    source = undefined;
  }

  function playBuffer() {
    if (!canPlay() || nativePlayback || !buffer || source || context.state !== 'running') return;
    const next = context.createBufferSource();
    next.buffer = buffer;
    next.loop = true;
    next.connect(gain);
    startedAt = context.currentTime;
    next.start(startedAt, offset);
    source = next;
    status.hidden = true;
  }

  function useNativePlayback() {
    if (source) stop();
    nativePlayback = true;
    applyVolume();
    if (canPlay() && track.paused) track.play().catch(playbackFailed);
  }

  async function loadBuffer() {
    const response = await fetch(track.src);
    if (!response.ok) throw new Error('BGM download failed');
    buffer = await context.decodeAudioData(await response.arrayBuffer());
  }

  function syncPlayback(retry = false) {
    if (!canPlay()) {
      stop();
      return;
    }
    if (nativePlayback) {
      if (retry && track.error) track.load();
      useNativePlayback();
      return;
    }
    try {
      context ??= cafeAudioContext();
      if (!context) {
        useNativePlayback();
        return;
      }
      if (!gain) {
        gain = context.createGain();
        gain.connect(context.destination);
        applyVolume();
      }
      // Request permission inside the user gesture, before downloading the recording.
      if (context.state !== 'running') context.resume().then(playBuffer).catch(playbackFailed);
      if (!loading) {
        loading = loadBuffer().then(playBuffer).catch(useNativePlayback);
      }
      playBuffer();
    } catch {
      useNativePlayback();
    }
  }

  function start(event) {
    if (!event.isTrusted || event.composedPath().includes(button)) return;
    interacted = true;
    syncPlayback();
  }

  function save() {
    try {
      localStorage.setItem(MUSIC_KEY, enabled ? 'on' : 'off');
      localStorage.setItem(VOLUME_KEY, String(volume));
    } catch { /* Keep the settings in this tab. */ }
    if (!enabled) status.hidden = true;
    render();
    syncPlayback(true);
  }

  render();
  for (const event of ['pointerdown', 'pointerup', 'click', 'keydown']) {
    document.addEventListener(event, start, { passive: true, capture: true });
  }
  document.addEventListener('visibilitychange', () => syncPlayback());
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', () => syncPlayback());
  track.addEventListener('playing', () => { status.hidden = true; });
  button.addEventListener('click', () => {
    interacted = true;
    enabled = !enabled || !status.hidden;
    save();
  });
  slider.addEventListener('input', () => {
    interacted = true;
    const value = Number(slider.value);
    enabled = value > 0;
    if (enabled) volume = value;
    save();
  });
}
