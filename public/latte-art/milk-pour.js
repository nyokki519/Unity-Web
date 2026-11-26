import { CUP_CAPACITY_ML, DEFAULT_ESPRESSO_ML } from './foam-geometry.js';

export const MILK_GRID_SIZE = 80;
export const MILK_CAPACITY = CUP_CAPACITY_ML - DEFAULT_ESPRESSO_ML;
export const DEFAULT_POUR_RATE = .62;
export const MAX_POUR_RADIUS = .91;

const STEP = 1000 / 60;
const MAX_FLOW = 58;
export const FOAM_DENSITY_PER_ML = 69;
const MAX_SURFACE_DRIFT = .26; // Grid cells per timestep at full flow.
const JET_REACH_SQUARED = .26;
const APPROACH_TIME = 82;
const OPENING_TIME = 111;
const SETTLE_STEPS = 16;
// Four simulation steps approximate a 2 cm fall. The same clock drives the
// visible head, the detached tail and the arrival of each emitted milk dose.
const FLIGHT_STEPS = 4;
const SIZE = MILK_GRID_SIZE;
const CELL_COUNT = SIZE * SIZE;
const CENTER = { x: 0, y: 0 };
const bounded = (value, low, high, fallback) => Number.isFinite(value)
  ? Math.max(low, Math.min(high, value)) : fallback;
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

function preparation(profile) {
  if (!profile || typeof profile !== 'object') return null;
  return Object.freeze({
    espressoMl: bounded(profile.espressoMl, 0, CUP_CAPACITY_ML, DEFAULT_ESPRESSO_ML),
    milkMl: bounded(profile.milkMl, 0, 320, MILK_CAPACITY),
    temperatureC: bounded(profile.temperatureC, 4, 95, 60),
    aeration: bounded(profile.aeration, 0, 1, .23),
    coarseness: bounded(profile.coarseness, 0, 1, .13),
    separation: bounded(profile.separation, 0, 1, .05),
    crema: bounded(profile.crema, 0, 1, .72),
    seed: bounded(profile.seed, 0, 0xffffffff, 6529) >>> 0,
  });
}

export function spoutFlightSteps(heightCm) {
  const height = bounded(heightCm, .5, 12, 2);
  return Math.round(FLIGHT_STEPS * Math.sqrt(height / 2));
}

function decode(cells) {
  const bytes = CELL_COUNT * Float32Array.BYTES_PER_ELEMENT;
  if (typeof cells !== 'string' || cells.length !== 4 * Math.ceil(bytes / 3)) return null;
  try {
    const buffer = Uint8Array.from(atob(cells), char => char.charCodeAt(0));
    const density = new Float32Array(buffer.buffer);
    return density.length === CELL_COUNT && density.every((level, index) =>
      Number.isFinite(level) && level >= 0 && level <= 15000 && (active[index] || level === 0)) ? density : null;
  } catch {
    return null;
  }
}

function encode(density) {
  const bytes = new Uint8Array(density.buffer);
  return btoa(String.fromCharCode(...bytes));
}

export class MilkPour {
  #density;
  #mixedDensity = null;
  #scratch = new Float32Array(CELL_COUNT);
  #kernelX = new Float64Array(SIZE);
  #kernelY = new Float64Array(SIZE);
  #position = CENTER;
  #previousTick = CENTER;
  #approachFrom = CENTER;
  #returnTarget = CENTER;
  #accumulator = 0;
  #age = 0;
  #tail = 0;
  #tailSteps = FLIGHT_STEPS;
  #flight = [];
  #tickIndex = 0;
  #startTick = 0;
  #firstArrival = Infinity;
  #impactPosition = CENTER;
  #impactFlow = 0;
  #impactMix = null;
  #stopFlow = 0;
  #startRest = 1;
  #stopRest = 0;
  #settling = 0;
  #pouring = false;
  #flow = 0;
  #amount = 0;
  #revision = 0;
  #legacy;
  #profile = null;
  #foamRetention = 1;
  #spoutHeightCm = null;

  constructor(saved, profile = saved?.profile) {
    this.configure(profile);
    this.#legacy = saved === 'legacy';
    const limit = saved?.profile ? CUP_CAPACITY_ML : MILK_CAPACITY;
    const density = Number.isFinite(saved?.amount) && saved.amount > 0 && saved.amount <= limit
      ? decode(saved.cells) : null;
    this.#density = density ?? new Float32Array(CELL_COUNT);
    if (this.#legacy) this.#amount = MILK_CAPACITY;
    else if (density) {
      this.#amount = saved.amount;
      this.#mixedDensity = decode(saved.mixedCells);
    }
  }

  get density() { return this.#density; }
  get mixedDensity() { return this.#mixedDensity; }
  get profile() { return this.#profile; }
  get espressoMl() { return this.#profile?.espressoMl ?? DEFAULT_ESPRESSO_ML; }
  get milkMl() { return this.#profile?.milkMl ?? MILK_CAPACITY; }
  get capacity() { return Math.min(this.milkMl, CUP_CAPACITY_ML - this.espressoMl); }
  get remaining() { return Math.max(0, this.milkMl - this.#amount); }
  get full() { return this.#amount >= this.capacity; }
  get spoutHeightCm() { return this.#spoutHeightCm; }
  get amount() { return this.#amount; }
  get landedAmount() { return this.#amount - this.#flight.reduce((sum, packet) => sum + packet.dose, 0); }
  get revision() { return this.#revision; }
  get legacy() { return this.#legacy; }
  get position() { return this.#position; }
  get toolTarget() {
    if (!this.#pouring) return this.#returnTarget;
    const progress = smooth(this.#age / APPROACH_TIME);
    if (progress === 1) return this.#position;
    return {
      x: this.#approachFrom.x + progress * (this.#position.x - this.#approachFrom.x),
      y: this.#approachFrom.y + progress * (this.#position.y - this.#approachFrom.y),
    };
  }
  get flow() { return this.#flow; }
  // The oldest airborne packet begins at the last landing, except when a new
  // stream starts elsewhere and none of its milk has reached the surface yet.
  get streamTarget() {
    const current = this.#flight.find(packet => packet.emitted >= this.#startTick);
    if (this.#pouring && this.#firstArrival > this.#tickIndex) return current?.from ?? this.#position;
    return this.#flight[0]?.from ?? this.#impactPosition;
  }
  get impactPosition() { return this.#impactPosition; }
  get impactFlow() { return this.#impactFlow; }
  get streamHead() {
    const time = this.#age - APPROACH_TIME;
    const flight = this.#spoutHeightCm === null ? FLIGHT_STEPS :
      (this.#firstArrival < Infinity ? this.#firstArrival - this.#startTick - APPROACH_TIME / STEP
        : spoutFlightSteps(this.#spoutHeightCm));
    return Math.min(1, Math.max(0, time / (flight * STEP)));
  }
  get streamCut() { return this.#pouring ? 0 : 1 - this.#tail / this.#tailSteps; }
  get motionTime() { return this.#age; }
  get resting() {
    if (this.#pouring) return this.#startRest * (1 - smooth(this.#age / APPROACH_TIME));
    return 1 - (1 - this.#stopRest) * smooth(this.#settling / SETTLE_STEPS);
  }
  get pouring() { return this.#pouring; }
  get moving() { return this.#pouring || this.#settling > 0; }

  configure(profile) {
    this.#profile = preparation(profile);
    const recipe = this.#profile;
    if (recipe) {
      const foam = .58 + .49 * smooth(recipe.aeration / .23) - .14 * smooth((recipe.aeration - .30) / .28);
      const temperature = 1 - .22 * smooth((Math.abs(recipe.temperatureC - 60) - 6) / 22);
      this.#foamRetention = foam * temperature * (1 - .39 * recipe.coarseness) * (1 - .26 * recipe.separation);
    } else {
      this.#foamRetention = 1;
    }
    this.#revision++;
  }

  setSpoutHeightCm(height) {
    this.#spoutHeightCm = bounded(height, .5, 12, null);
  }

  start(position) {
    if (this.#pouring || this.full) return false;
    this.#approachFrom = this.toolTarget;
    this.#startRest = this.resting;
    this.#position = boundedPoint(position);
    this.#previousTick = this.#position;
    if (!this.#flight.length) this.#impactPosition = this.#position;
    this.#accumulator = 0;
    this.#age = 0;
    this.#startTick = this.#tickIndex;
    this.#firstArrival = Infinity;
    this.#tail = this.#settling = 0;
    this.#flow = 0;
    this.#pouring = true;
    return true;
  }

  savePreviewCheckpoint(saved = { density: new Float32Array(CELL_COUNT) }) {
    saved.density.set(this.#density);
    if (this.#mixedDensity) {
      saved.mixedBuffer ??= new Float32Array(CELL_COUNT);
      saved.mixedBuffer.set(this.#mixedDensity);
    }
    return Object.assign(saved, {
      hasMixed: this.#mixedDensity !== null, flight: this.#flight.slice(), tickIndex: this.#tickIndex,
      startTick: this.#startTick, firstArrival: this.#firstArrival,
      impactPosition: this.#impactPosition, impactFlow: this.#impactFlow, impactMix: this.#impactMix,
      position: this.#position, previousTick: this.#previousTick, returnTarget: this.#returnTarget,
      accumulator: this.#accumulator, age: this.#age, amount: this.#amount,
      flow: this.#flow, tail: this.#tail, tailSteps: this.#tailSteps,
      stopFlow: this.#stopFlow, stopRest: this.#stopRest,
      settling: this.#settling, pouring: this.#pouring,
    });
  }

  restorePreviewCheckpoint(saved) {
    this.#density.set(saved.density);
    if (saved.hasMixed) {
      this.#mixedDensity ??= new Float32Array(CELL_COUNT);
      this.#mixedDensity.set(saved.mixedBuffer);
    } else {
      this.#mixedDensity = null;
    }
    this.#flight = saved.flight.slice();
    this.#tickIndex = saved.tickIndex;
    this.#startTick = saved.startTick;
    this.#firstArrival = saved.firstArrival;
    this.#impactPosition = saved.impactPosition;
    this.#impactFlow = saved.impactFlow;
    this.#impactMix = saved.impactMix;
    this.#position = saved.position;
    this.#previousTick = saved.previousTick;
    this.#returnTarget = saved.returnTarget;
    this.#accumulator = saved.accumulator;
    this.#age = saved.age;
    this.#amount = saved.amount;
    this.#flow = saved.flow;
    this.#tail = saved.tail;
    this.#tailSteps = saved.tailSteps;
    this.#stopFlow = saved.stopFlow;
    this.#stopRest = saved.stopRest;
    this.#settling = saved.settling;
    this.#pouring = saved.pouring;
    this.#revision++;
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

  stop(target = this.toolTarget) {
    if (!this.#pouring) return;
    // Complete the part of the final step before release or before the stream crosses the rim.
    const endMs = Math.max(0, Math.min(STEP, this.#accumulator));
    const dose = Math.min(this.capacity - this.#amount, endMs / 1000 * MAX_FLOW * this.#flow);
    if (dose > 1e-6) {
      this.#emit(this.#position, dose);
      this.#revision++;
    }
    this.#accumulator = 0;
    this.#returnTarget = target;
    this.#stopRest = this.resting;
    this.#pouring = false;
    this.#stopFlow = this.#flow;
    const lastArrival = this.#flight.at(-1)?.arrival ?? this.#tickIndex + FLIGHT_STEPS;
    this.#tailSteps = this.#tail = Math.max(1, lastArrival - this.#tickIndex);
    this.#settling = this.#age > 0 || this.#flight.length ? SETTLE_STEPS : 0;
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
    this.#position = this.#previousTick = this.#approachFrom = this.#returnTarget = CENTER;
    this.#flight.length = 0;
    this.#impactPosition = CENTER;
    this.#impactFlow = 0;
    this.#impactMix = null;
    this.#mixedDensity = null;
    this.#density.fill(0);
    this.#revision++;
  }

  snapshot() {
    if (this.#legacy) return 'legacy';
    if (!this.#amount) return null;
    return { amount: this.#amount, cells: encode(this.#density),
      ...(this.#profile && { profile: this.#profile }),
      ...(this.#mixedDensity && { mixedCells: encode(this.#mixedDensity) }),
    };
  }

  #tick(point, rate) {
    this.#age += STEP;
    this.#tickIndex++;
    this.#impactFlow = 0;
    while (this.#flight.length && this.#flight[0].arrival <= this.#tickIndex) {
      const { from, to, dose, surfaceDose, flow, mix } = this.#flight.shift();
      this.#impactPosition = to;
      this.#impactFlow = flow;
      this.#impactMix = mix;
      this.#deposit(from, to, surfaceDose, .026 + flow * .047, this.#density);
      if (mix !== null) {
        this.#mixedDensity ??= new Float32Array(CELL_COUNT);
        this.#deposit(from, to, dose - surfaceDose, .105 + .085 * mix, this.#mixedDensity);
      }
    }
    this.#spread(this.#impactPosition, this.#impactFlow, this.#impactMix);
    if (this.#pouring) {
      this.#flow = rate * smooth((this.#age - APPROACH_TIME) / OPENING_TIME);
      const dose = Math.min(this.capacity - this.#amount, STEP / 1000 * MAX_FLOW * this.#flow);
      if (dose > 0) this.#emit(point, dose);
      if (this.full) this.stop(point);
    } else {
      this.#settling--;
      this.#tail = Math.max(0, this.#tail - 1);
      this.#flow = this.#tail ? this.#stopFlow : 0;
    }
    this.#previousTick = point;
    this.#revision++;
  }

  #spread(point, pressure, impactMix) {
    const current = this.#density;
    const result = this.#scratch;
    result.fill(0);
    const mixing = impactMix === null
      ? .20 * smooth(pressure / .16) * (1 - smooth((pressure - .32) / .22))
      : (.003 + .21 * impactMix) * smooth(pressure / .46);
    const localMix = impactMix !== null && mixing > 0 ? this.#mixedDensity : null;
    const centralPool = .45 * smooth((pressure - .55) / .45);
    const mobility = this.#pouring ? 1 : smooth(this.#settling / SETTLE_STEPS);
    for (const { index, x, y, neighbors } of cells) {
      if (!current[index]) continue;
      const dx = x - point.x;
      const dy = y - point.y;
      const distance = dx * dx + dy * dy;
      // A penetrating jet incorporates some of the existing foam at impact.
      const core = Math.max(0, 1 - distance / .037);
      const level = current[index] * (1 - mixing * core * core);
      if (localMix && core > 0) localMix[index] += current[index] - level;
      let remain = level;
      const diffusion = level / (1 + .16 * level);
      const mobile = level * pressure * .82 * (1 - centralPool * core * core) * Math.max(0, 1 - distance / JET_REACH_SQUARED);
      const drift = mobile && distance ? MAX_SURFACE_DRIFT / Math.sqrt(distance) : 0;
      const vx = dx * drift;
      const vy = dy * drift;
      const radialBase = 1 - 1.5 * (vx * vx + vy * vy);
      for (let direction = 0; direction < neighbors.length; direction++) {
        // The cup wall retains shares that would leave the liquid.
        const neighbor = neighbors[direction];
        if (neighbor === -1) continue;
        const cardinal = direction < 4;
        let share = diffusion * mobility * (cardinal ? .048 : .022);
        if (mobile) {
          // Isotropic nine-point transport. Axial and diagonal steps have the same spreading moments.
          const [axisX, axisY] = directions[direction];
          const alongFlow = vx * axisX + vy * axisY;
          share += mobile * (radialBase + 3 * alongFlow + 4.5 * alongFlow ** 2) / (cardinal ? 9 : 36);
        }
        result[neighbor] += share;
        remain -= share;
      }
      result[index] += remain;
    }
    this.#density = result;
    this.#scratch = current;
  }

  #emit(point, dose) {
    const height = this.#spoutHeightCm;
    const mix = height !== null ? smooth((height - 1) / 6.5) : null;
    const floating = mix === null
      ? .29 + .54 * smooth((this.#flow - .26) / .34) + .14 * smooth((this.#flow - .62) / .32)
      : (.82 + .13 * smooth(this.#flow / .75)) * (1 - .966 * mix);
    const arrival = this.#tickIndex + spoutFlightSteps(height);
    const packet = { arrival, emitted: this.#tickIndex, from: this.#previousTick, to: point,
      dose, surfaceDose: dose * Math.min(.985, floating * this.#foamRetention), flow: this.#flow, mix,
    };
    // Lowering the spout can bring newly emitted milk to the cup before older
    // milk. Keep every dose on its own flight clock.
    const index = this.#flight.findLastIndex(previous => previous.arrival <= arrival);
    this.#flight.splice(index + 1, 0, packet);
    if (this.#firstArrival > this.#tickIndex) this.#firstArrival = Math.min(this.#firstArrival, arrival);
    this.#amount += dose;
  }

  #deposit(from, point, dose, sigma, density) {
    if (!(dose > 0)) return;
    const dx = point.x - from.x;
    const dy = point.y - from.y;
    const samples = Math.ceil(Math.hypot(dx, dy) / .042);
    if (samples <= 1) {
      this.#stamp(point, dose, sigma, density);
      return;
    }
    // Treat a fast movement as one thin continuous jet path with the same volume.
    for (let i = 0; i < samples; i++) {
      const fraction = (i + .5) / samples;
      this.#stamp({ x: from.x + dx * fraction, y: from.y + dy * fraction }, dose / samples, sigma, density);
    }
  }

  #stamp(point, dose, sigma, density) {
    const extent = sigma * 3;
    const left = Math.max(0, Math.floor((1 + point.x - extent) * SIZE / 2));
    const right = Math.min(SIZE - 1, Math.floor((1 + point.x + extent) * SIZE / 2));
    const top = Math.max(0, Math.floor((1 + point.y - extent) * SIZE / 2));
    const bottom = Math.min(SIZE - 1, Math.floor((1 + point.y + extent) * SIZE / 2));
    const divisor = 2 * sigma * sigma;
    for (let column = left; column <= right; column++) {
      this.#kernelX[column] = Math.exp(-((coordinate(column) - point.x) ** 2) / divisor);
    }
    for (let row = top; row <= bottom; row++) {
      this.#kernelY[row] = Math.exp(-((coordinate(row) - point.y) ** 2) / divisor);
    }
    let sum = 0;
    for (let row = top; row <= bottom; row++) {
      for (let column = left; column <= right; column++) {
        if (active[row * SIZE + column]) sum += this.#kernelX[column] * this.#kernelY[row];
      }
    }
    const scale = dose * FOAM_DENSITY_PER_ML / sum;
    for (let row = top; row <= bottom; row++) {
      for (let column = left; column <= right; column++) {
        const index = row * SIZE + column;
        if (active[index]) density[index] += this.#kernelX[column] * this.#kernelY[row] * scale;
      }
    }
  }
}
