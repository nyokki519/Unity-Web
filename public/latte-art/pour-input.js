import { liquidContains, liquidExit } from './drawing.js';

// After a stationary hold, a new position should taper only the end of the hold.
const MOTION_WINDOW_MS = 85;
const CHECKPOINT_INTERVAL_MS = 100;

export class PourInput {
  #milk;
  #time = 0;
  #automaticEnd = 0;
  #lastSample = null;
  #previewOrigin = { time: -Infinity };
  #recentPreviews = [{ time: -Infinity }, { time: -Infinity }];
  #lastCheckpoint = -Infinity;

  constructor(milk) {
    this.#milk = milk;
  }

  start(position, time, duration = 0) {
    if (!this.#milk.start(position)) return false;
    this.#time = time;
    this.#automaticEnd = duration ? time + duration : 0;
    this.#lastSample = duration ? null : { position, time };
    this.#clearPreviewTimes();
    return true;
  }

  #advance(stamp, rate, position = this.#milk.position) {
    const now = Math.max(this.#time, stamp);
    if (this.#automaticEnd && now >= this.#automaticEnd) {
      this.#milk.advance(this.#automaticEnd - this.#time, position, rate);
      this.#milk.stop();
      this.#time = this.#automaticEnd;
      this.#automaticEnd = 0;
    }
    this.#milk.advance(now - this.#time, position, rate);
    this.#time = now;
  }

  preview(stamp, rate) {
    if (this.#lastSample && stamp > this.#time) {
      if (this.#previewOrigin.time === -Infinity) {
        this.#savePreview(this.#previewOrigin);
      } else if (this.#time - this.#lastCheckpoint >= CHECKPOINT_INTERVAL_MS) {
        const oldest = this.#recentPreviews.shift();
        this.#savePreview(oldest);
        this.#recentPreviews.push(oldest);
      }
    }
    this.#advance(stamp, rate);
  }

  #savePreview(checkpoint) {
    checkpoint.time = this.#lastCheckpoint = this.#time;
    checkpoint.milk = this.#milk.savePreviewCheckpoint(checkpoint.milk);
  }

  #clearPreviewTimes() {
    this.#previewOrigin.time = this.#lastCheckpoint = -Infinity;
    for (const item of this.#recentPreviews) item.time = -Infinity;
  }

  #reconcile(stamp, position = null) {
    const previous = this.#lastSample;
    const moved = position && previous && (position.x !== previous.position.x || position.y !== previous.position.y);
    const motionStart = moved ? Math.max(previous.time, stamp - MOTION_WINDOW_MS) : stamp;
    // Preview assumes a stationary pitcher. Rebuild from the last input when the
    // reported position changes or when a delayed event precedes the preview.
    const origin = this.#previewOrigin;
    if (origin.time !== -Infinity && stamp >= origin.time && motionStart < this.#time) {
      const checkpoint = this.#recentPreviews.findLast(item => item.time !== -Infinity && item.time <= motionStart) ?? origin;
      this.#milk.restorePreviewCheckpoint(checkpoint.milk);
      this.#time = checkpoint.time;
    }
    this.#clearPreviewTimes();
    return motionStart;
  }

  advance(stamp, rate) {
    this.#reconcile(stamp);
    this.#advance(stamp, rate);
  }

  move(position, time, rate, clips) {
    if (!liquidContains(position, clips)) {
      if (this.#lastSample) this.end(time, rate, position, clips);
      return false;
    }
    const motionStart = this.#reconcile(time, position);
    if (!this.#milk.pouring) return this.start(position, time);
    this.#advance(motionStart, rate);
    this.#advance(time, rate, position);
    this.#lastSample = { position, time };
    return false;
  }

  end(time, rate, position = null, clips = []) {
    const motionStart = this.#reconcile(time, position);
    if (position && this.#lastSample && !liquidContains(position, clips)) {
      const { position: inside, time: since } = this.#lastSample;
      const { position: rim, fraction } = liquidExit(inside, position, clips);
      const start = Math.min(time, Math.max(since, this.#time, motionStart));
      this.#advance(start, rate);
      this.#advance(start + (time - start) * fraction, rate, rim);
    } else if (this.#milk.moving) {
      this.#advance(motionStart, rate);
      this.#advance(time, rate, position ?? this.#milk.position);
    }
    this.#milk.stop();
    this.#automaticEnd = 0;
    this.#lastSample = null;
  }
}
