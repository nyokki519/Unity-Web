import { createSimulation as createSIv4 } from "./si-v4/si-engine.js";
import { createSimulation as createSIv3 } from "./si-v3/si-engine.js";
import { createSimulation as createSIv2 } from "./si-v2/si-engine.js";
import { createSimulation as createSIv1 } from "./si-v1/si-engine.js";
import { createSimulation } from "./engine.js";
import { createSimulation as createLegacySimulation } from "./legacy/engine.js";
import { FIXED_DT } from "./config.js";
import { validateImport } from "./storage.js";
export function createReplay(record) {
  const data = validateImport(record);
  if (data.kind) throw new Error("A session is required for replay");
  const game = (
    data.version === 1
      ? createLegacySimulation
      : data.physicsVersion === "si-1"
        ? createSIv1
        : data.physicsVersion === "si-2"
          ? createSIv2
          : data.physicsVersion === "si-3"
            ? createSIv3
            : data.physicsVersion === "si-4"
              ? createSIv4
              : createSimulation
  )(data);
  let cursor = 0,
    playing = false,
    speed = 1,
    accumulator = 0,
    verified = false;
  const totalTicks = Math.round(data.elapsed / FIXED_DT);
  function applyInputs() {
    while (
      cursor < data.inputs.length &&
      data.inputs[cursor].tick <= game.tick
    ) {
      const input = data.inputs[cursor++];
      if (input.type === "end") game.end();
      else if (input.type === "tilt") {
        if (!game.setTilt?.(input.value))
          throw new Error("Replay tilt rejected");
      } else if (!game.fire(input.power, input.angle))
        throw new Error("Replay input rejected at tick " + input.tick);
    }
  }
  function verify() {
    if (verified || game.tick < totalTicks) return;
    for (const key of ["score", "lost", "jackpots", "fired"])
      if (game[key] !== data.result[key])
        throw new Error("Replay result mismatch: " + key);
    if (cursor !== data.inputs.length)
      throw new Error("Replay inputs remain unconsumed");
    verified = true;
  }
  function step(ticks = 1) {
    applyInputs();
    for (
      let i = 0;
      i < Math.min(24000, Math.max(0, Math.floor(ticks))) &&
      game.tick < totalTicks;
      i++
    ) {
      const previous = game.tick;
      game.step(FIXED_DT);
      applyInputs();
      if (game.tick === previous)
        throw new Error("Replay ended before recorded elapsed time");
    }
    verify();
    return game;
  }
  try {
    applyInputs();
    verify();
  } catch (error) {
    game.dispose?.();
    throw error;
  }
  return {
    game,
    dispose() {
      playing = false;
      game.dispose?.();
    },
    play() {
      playing = true;
    },
    pause() {
      playing = false;
    },
    setSpeed(value) {
      if (!Number.isFinite(value) || value < 0.1 || value > 16)
        throw new Error("Invalid replay speed");
      speed = value;
    },
    step,
    advance(seconds) {
      if (playing && Number.isFinite(seconds) && seconds > 0) {
        accumulator += Math.min(seconds, 1) * speed;
        const ticks = Math.floor(accumulator / FIXED_DT);
        accumulator -= ticks * FIXED_DT;
        step(ticks);
      }
      return game;
    },
    get finished() {
      return game.tick >= totalTicks;
    },
    get playing() {
      return playing;
    },
    get status() {
      return this.finished ? "finished" : playing ? "running" : "paused";
    },
  };
}
