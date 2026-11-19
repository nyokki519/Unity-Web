export const MILK_GRID_SIZE = 80;
export const MILK_CAPACITY = 160;
export const DEFAULT_POUR_RATE = .62;
export const MAX_POUR_RADIUS = .91;

const STEP = 1000 / 60;
const MAX_FLOW = 58;
const APPROACH_TIME = 100;
const OPENING_TIME = 138;
const SETTLE_STEPS = 16;
const STREAM_TAIL_STEPS = 7;
const SIZE = MILK_GRID_SIZE;
const CELL_COUNT = SIZE * SIZE;
const CENTER = { x: 0, y: 0 };
const smooth = value => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};
const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
const coordinate = index => (index + .5) * 2 / SIZE - 1;
const active = Uint8Array.from({ length: CELL_COUNT }, (_, i) =>
  Number(coordinate(i % SIZE) ** 2 + coordinate(Math.floor(i / SIZE)) ** 2 < 1));
const cells = Array.from(active, (inside, index) => {
  if (!inside) return null;
  const column = index % SIZE;
  const row = Math.floor(index / SIZE);
  const neighbors = directions.map(([dx, dy]) => {
    const x = column + dx;
    const y = row + dy;
    const i = y * SIZE + x;
    return x >= 0 && x < SIZE && y >= 0 && y < SIZE && active[i] ? i : -1;
  });
  return { index, x: coordinate(column), y: coordinate(row), neighbors };
}).filter(Boolean);

function boundedPoint({ x, y }) {
  const divisor = Math.max(1, Math.hypot(x, y) / MAX_POUR_RADIUS);
  return { x: x / divisor, y: y / divisor };
}

function decode(state) {
  const bytes = CELL_COUNT * Float32Array.BYTES_PER_ELEMENT;
  if (!state || !Number.isFinite(state.amount) || state.amount <= 0 || state.amount > MILK_CAPACITY
    || typeof state.cells !== 'string' || state.cells.length !== 4 * Math.ceil(bytes / 3)) return null;
  try {
    const buffer = Uint8Array.from(atob(state.cells), char => char.charCodeAt(0));
    const density = new Float32Array(buffer.buffer);
    return density.length === CELL_COUNT && density.every((level, index) =>
      Number.isFinite(level) && level >= 0 && level <= 15000 && (active[index] || level === 0)) ? density : null;
  } catch {
    return null;
  }
}

export class MilkPour {
  #density;
  #scratch = new Float32Array(CELL_COUNT);
  #position = CENTER;
  #accumulator = 0;
  #age = 0;
  #tail = 0;
  #stopFlow = 0;
  #stopRest = 0;
  #settling = 0;
  #pouring = false;
  #flow = 0;
  #amount = 0;
  #revision = 0;
  #legacy;

  constructor(saved) {
    const density = decode(saved);
    this.#legacy = saved === 'legacy';
    this.#density = density ?? new Float32Array(CELL_COUNT);
    if (this.#legacy) this.#amount = MILK_CAPACITY;
    else if (density) this.#amount = saved.amount;
  }

  get density() { return this.#density; }
  get amount() { return this.#amount; }
  get revision() { return this.#revision; }
  get legacy() { return this.#legacy; }
  get position() { return this.#position; }
  get flow() { return this.#flow; }
  get resting() {
    if (this.#pouring) return 1 - smooth(this.#age / APPROACH_TIME);
    return 1 - (1 - this.#stopRest) * smooth(this.#settling / SETTLE_STEPS);
  }
  get pouring() { return this.#pouring; }
  get moving() { return this.#pouring || this.#settling > 0; }

  start(position) {
    if (this.#pouring || this.#amount >= MILK_CAPACITY) return false;
    this.#position = boundedPoint(position);
    this.#accumulator = 0;
    this.#age = 0;
    this.#tail = this.#settling = 0;
    this.#flow = 0;
    this.#pouring = true;
    return true;
  }

  // Temporal interpolation keeps the deposited path and amount independent of the render cadence.
  advance(milliseconds, position = this.#position, rate = DEFAULT_POUR_RATE) {
    if (!this.moving) return;
    const target = boundedPoint(position);
    const offset = STEP - this.#accumulator;
    this.#accumulator += milliseconds;
    let time = offset;
    while (this.#accumulator >= STEP - 1e-7 && this.moving) {
      this.#accumulator -= STEP;
      const fraction = Math.min(1, time / (milliseconds || STEP));
      const point = {
        x: this.#position.x + (target.x - this.#position.x) * fraction,
        y: this.#position.y + (target.y - this.#position.y) * fraction,
      };
      this.#tick(point, rate);
      time += STEP;
    }
    this.#position = target;
    if (!this.moving) this.#accumulator = 0;
  }

  stop() {
    if (!this.#pouring) return;
    this.#stopRest = this.resting;
    this.#pouring = false;
    this.#stopFlow = this.#flow;
    this.#tail = STREAM_TAIL_STEPS;
    this.#settling = this.#age > 0 ? SETTLE_STEPS : 0;
    if (!this.#settling) this.#flow = 0;
  }

  settle() {
    this.stop();
    while (this.#settling > 0) this.#tick(this.#position, 0);
    this.#accumulator = 0;
  }

  reset() {
    this.#pouring = this.#legacy = false;
    this.#amount = this.#flow = this.#accumulator = this.#tail = this.#settling = 0;
    this.#position = CENTER;
    this.#density.fill(0);
    this.#revision++;
  }

  snapshot() {
    if (this.#legacy) return 'legacy';
    if (!this.#amount) return null;
    const bytes = new Uint8Array(this.#density.buffer);
    return { amount: this.#amount, cells: btoa(String.fromCharCode(...bytes)) };
  }

  #tick(point, rate) {
    if (this.#pouring) {
      this.#age += STEP;
      this.#flow = rate * smooth((this.#age - APPROACH_TIME) / OPENING_TIME);
      const dose = Math.min(MILK_CAPACITY - this.#amount, STEP / 1000 * MAX_FLOW * this.#flow);
      this.#spread(point, this.#flow);
      if (dose > 0) this.#deposit(point, dose);
      this.#amount += dose;
      if (this.#amount >= MILK_CAPACITY) this.stop();
    } else {
      this.#settling--;
      this.#tail = Math.max(0, this.#tail - 1);
      this.#flow = this.#stopFlow * (this.#tail / STREAM_TAIL_STEPS) ** 2;
      this.#spread(point, 0);
    }
    this.#revision++;
  }

  #spread(point, pressure) {
    const current = this.#density;
    const result = this.#scratch;
    result.fill(0);
    for (const { index, x, y, neighbors } of cells) {
      const level = current[index];
      if (!level) continue;
      let remain = level;
      const diffusion = level / (1 + .16 * level);
      for (let direction = 0; direction < neighbors.length; direction++) {
        const neighbor = neighbors[direction];
        if (neighbor === -1) continue;
        const share = diffusion * (direction < 4 ? .048 : .022);
        result[neighbor] += share;
        remain -= share;
      }

      // A jet spreads the foam already on the surface. Shares that reach the ceramic stay in the cup.
      const dx = x - point.x;
      const dy = y - point.y;
      const distance = dx * dx + dy * dy;
      const push = pressure * .28 * Math.max(0, 1 - distance / .26);
      if (push > 0 && distance > 0) {
        const length = Math.sqrt(distance);
        const alongX = Math.abs(dx) / length;
        const alongY = Math.abs(dy) / length;
        const left = Number(dx < 0);
        const up = Number(dy < 0);
        const xNeighbor = neighbors[left];
        const yNeighbor = neighbors[2 + up];
        const diagonal = neighbors[4 + left + 2 * up];
        const mobile = level * push;
        if (xNeighbor !== -1) {
          const share = mobile * alongX * (1 - alongY);
          result[xNeighbor] += share;
          remain -= share;
        }
        if (yNeighbor !== -1) {
          const share = mobile * alongY * (1 - alongX);
          result[yNeighbor] += share;
          remain -= share;
        }
        if (diagonal !== -1) {
          const share = mobile * alongX * alongY;
          result[diagonal] += share;
          remain -= share;
        }
      }
      result[index] += remain;
    }
    this.#density = result;
    this.#scratch = current;
  }

  #deposit(point, dose) {
    const sigma = .037 + this.#flow * .029;
    const extent = sigma * 3;
    const left = Math.max(0, Math.floor((1 + point.x - extent) * SIZE / 2));
    const right = Math.min(SIZE - 1, Math.floor((1 + point.x + extent) * SIZE / 2));
    const top = Math.max(0, Math.floor((1 + point.y - extent) * SIZE / 2));
    const bottom = Math.min(SIZE - 1, Math.floor((1 + point.y + extent) * SIZE / 2));
    const weights = [];
    let sum = 0;
    for (let row = top; row <= bottom; row++) {
      const dy = coordinate(row) - point.y;
      for (let column = left; column <= right; column++) {
        const index = row * SIZE + column;
        if (!active[index]) continue;
        const dx = coordinate(column) - point.x;
        const weight = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
        weights.push([index, weight]);
        sum += weight;
      }
    }
    const scale = dose * 69 / sum;
    for (const [index, weight] of weights) this.#density[index] += weight * scale;
  }
}
