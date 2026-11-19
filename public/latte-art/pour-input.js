import { liquidContains, liquidExit } from './drawing.js';

export class PourInput {
  #milk;
  #time = 0;
  #automaticEnd = 0;
  #lastSample = null;

  constructor(milk) {
    this.#milk = milk;
  }

  start(position, time, duration = 0) {
    if (!this.#milk.start(position)) return false;
    this.#time = time;
    this.#automaticEnd = duration ? time + duration : 0;
    this.#lastSample = duration ? null : { position, time };
    return true;
  }

  advance(stamp, rate, position = this.#milk.position) {
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

  move(position, time, rate, clips) {
    if (!liquidContains(position, clips)) {
      if (this.#milk.pouring) this.end(time, rate, position, clips);
      return false;
    }
    if (!this.#milk.pouring) return this.start(position, time);
    this.advance(time, rate, position);
    this.#lastSample = { position, time };
    return false;
  }

  end(time, rate, position = null, clips = []) {
    if (position && this.#lastSample && !liquidContains(position, clips)) {
      const { position: inside, time: since } = this.#lastSample;
      const { position: rim, fraction } = liquidExit(inside, position, clips);
      const start = Math.min(time, Math.max(since, this.#time));
      this.advance(start + (time - start) * fraction, rate, rim);
    } else if (this.#milk.moving) {
      this.advance(time, rate, position ?? this.#milk.position);
    }
    this.#milk.stop();
    this.#automaticEnd = 0;
    this.#lastSample = null;
  }
}
