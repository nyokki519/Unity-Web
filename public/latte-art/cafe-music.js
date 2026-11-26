const MUSIC_KEY = 'unity-mix.latte-art.music';
const VOLUME_KEY = 'unity-mix.latte-art.music-volume';
const DEFAULT_VOLUME = 80;

export function bindCafeMusic({ button, track, slider, readout, status }) {
  let enabled = true;
  let volume = DEFAULT_VOLUME;
  let interacted = false;
  let context;
  let gain;
  try {
    enabled = localStorage.getItem(MUSIC_KEY) !== 'off';
    const saved = Number(localStorage.getItem(VOLUME_KEY));
    if (Number.isInteger(saved) && saved >= 1 && saved <= 100) volume = saved;
  } catch { /* Use the defaults for this tab. */ }

  // Some mobile browsers leave HTMLMediaElement.volume fixed at 1.
  track.volume = .5;
  const nativeVolume = track.volume === .5;

  function applyVolume() {
    const level = enabled ? volume / 100 : 0;
    if (nativeVolume) track.volume = level;
    else if (gain) gain.gain.value = level;
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
    if (enabled && !document.hidden && error.name !== 'AbortError') status.hidden = false;
  }

  function syncPlayback(retry = false) {
    if (!enabled || document.hidden || !interacted) {
      track.pause();
      return;
    }
    if (!nativeVolume) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!gain && AudioContext) {
        try {
          context = new AudioContext();
          const volumeNode = context.createGain();
          context.createMediaElementSource(track).connect(volumeNode).connect(context.destination);
          gain = volumeNode;
          applyVolume();
        } catch { /* Keep native playback available if audio routing is unsupported. */ }
      }
      if (gain && context.state !== 'running') context.resume().catch(playbackFailed);
    }
    if (retry && track.error) track.load();
    if (track.paused) {
      track.play().catch(playbackFailed);
    }
  }

  function start(event) {
    if (event.composedPath().includes(button)) return;
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
  document.addEventListener('pointerup', start, { passive: true, capture: true });
  document.addEventListener('click', start, { capture: true });
  document.addEventListener('keydown', start, { capture: true });
  document.addEventListener('visibilitychange', () => syncPlayback());
  window.addEventListener('pagehide', () => track.pause());
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
