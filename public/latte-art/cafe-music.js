const MUSIC_KEY = 'unity-mix.latte-art.music';

export function bindCafeMusic(button, track) {
  let enabled = true;
  let interacted = false;
  try { enabled = localStorage.getItem(MUSIC_KEY) !== 'off'; } catch { /* Use the default for this tab. */ }
  button.setAttribute('aria-pressed', String(enabled));

  function syncPlayback() {
    if (!enabled || document.hidden) {
      track.pause();
    } else if (interacted && track.paused) {
      // Browser media settings may require a fresh gesture after a pause.
      track.play().catch(() => {});
    }
  }

  function start(event) {
    if (event.composedPath().includes(button)) return;
    interacted = true;
    syncPlayback();
  }
  document.addEventListener('pointerup', start, { passive: true, capture: true });
  document.addEventListener('keydown', start, { capture: true });
  document.addEventListener('visibilitychange', syncPlayback);
  window.addEventListener('pagehide', () => track.pause());
  window.addEventListener('pageshow', syncPlayback);
  button.addEventListener('click', () => {
    interacted = true;
    enabled = !enabled;
    button.setAttribute('aria-pressed', String(enabled));
    try { localStorage.setItem(MUSIC_KEY, enabled ? 'on' : 'off'); } catch { /* Keep the setting in this tab. */ }
    syncPlayback();
  });
}
