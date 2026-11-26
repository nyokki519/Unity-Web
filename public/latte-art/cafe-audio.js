// Use one unlocked output for the café soundtrack and equipment sounds.
const Audio = window.AudioContext || window.webkitAudioContext;
let context;

export const cafeAudioSupported = Boolean(Audio);

export function cafeAudioContext() {
  if (!Audio) return null;
  return context ??= new Audio();
}
