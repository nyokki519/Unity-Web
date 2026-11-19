// Some browsers deliver a complete tap after a captured drag without synthesizing a click.
export function bindActivation(button, activate, { requireOwnPress = false } = {}) {
  let pressed = null;
  let handled = null;
  button.addEventListener('pointerdown', event => {
    if (!event.isPrimary) return;
    handled = null;
    const supportedPointer = event.pointerType === 'touch' || (requireOwnPress && event.button === 0);
    pressed = supportedPointer && !button.disabled
      ? { id: event.pointerId, x: event.clientX, y: event.clientY }
      : null;
  });
  button.addEventListener('pointercancel', event => {
    if (pressed?.id === event.pointerId) pressed = null;
  });
  button.addEventListener('pointerup', event => {
    const touch = pressed;
    if (touch?.id !== event.pointerId) return;
    pressed = null;
    const { clientX: x, clientY: y } = event;
    if (button.disabled || Math.hypot(x - touch.x, y - touch.y) > 12) return;
    if (!button.contains(document.elementFromPoint(x, y))) return;
    handled = { x, y, time: performance.now() };
    activate();
  });
  button.addEventListener('click', event => {
    if (requireOwnPress) {
      // A click synthesized after a tap can target a newly opened overlay.
      event.preventDefault();
      if (event.detail > 0) return;
    }
    if (button.disabled) return;
    if (handled && event.detail > 0 && performance.now() - handled.time < 450
      && Math.hypot(event.clientX - handled.x, event.clientY - handled.y) < 14) {
      handled = null;
      return;
    }
    activate();
  });
}
