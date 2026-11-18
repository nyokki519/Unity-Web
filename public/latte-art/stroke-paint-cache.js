// The drawing model appends finished strokes and only removes them from the end.
export class StrokePaintCache {
  #rendered = 0;
  #last = null;

  constructor({ clear, append }) {
    this.clearLayer = clear;
    this.appendStrokes = append;
  }

  sync(strokes, active) {
    const count = strokes.length - (active && strokes.at(-1) === active ? 1 : 0);
    if (count < this.#rendered || (this.#rendered && strokes[this.#rendered - 1] !== this.#last)) {
      this.clearLayer();
      this.#rendered = 0;
      this.#last = null;
    }
    if (count > this.#rendered) {
      this.appendStrokes(strokes.slice(this.#rendered, count));
      this.#rendered = count;
      this.#last = strokes[count - 1];
    }
  }
}
