export const MIN_ESPRESSO_ML = 18;
export const MIN_MILK_TEMPERATURE = 32;
export const MAX_STEAM_TEMPERATURE = 78;
export const ESPRESSO_DENSITY = 0.95;

export const MAX_ESPRESSO_ML = 52;
const BASE_MILK_ML = 120;
const HEATING_RATE = 8.1;
const MAX_FOAM = 0.4375;
const clamp = (number, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, number));

export function createExtraction({ grind = 2, dose = 18, preheat = true } = {}) {
  return { grind, dose, preheat, time: 0, phase: 'infusion', volume: 0, quality: 0, blonding: 0, temperature: 22 };
}

export function advanceExtraction(shot, seconds) {
  const infusion = 1.8 + (2 - shot.grind) * 0.24 + (shot.dose - 18) * 0.08;
  const dripSeconds = 0.85;
  const flow = 6.55 + (shot.grind - 2) * 0.91 - (shot.dose - 18) * 0.22;
  const dropVolume = dripSeconds * flow * 0.32;
  const time = Math.min(shot.time + seconds, infusion + dripSeconds + (MAX_ESPRESSO_ML - dropVolume) / flow);
  const dripProgress = clamp((time - infusion) / dripSeconds);
  const volume = clamp(dropVolume * dripProgress ** 2 + flow * Math.max(0, time - infusion - dripSeconds), 0, MAX_ESPRESSO_ML);
  const targetVolume = shot.dose * 2 / ESPRESSO_DENSITY;
  const blonding = clamp((volume - targetVolume * 0.71) / (MAX_ESPRESSO_ML - Math.min(targetVolume, 48) * 0.71));
  const balance = 1 - clamp(Math.abs(volume / targetVolume - 1) * 1.33);
  const grindBalance = 1 - Math.abs(shot.grind - 2) * 0.105;
  const temperature = 22 + (shot.preheat ? 48 : 35) * (1 - Math.exp(-volume / 9));
  const quality = clamp(balance * grindBalance * (shot.preheat ? 1 : 0.88));
  const phase = volume >= MAX_ESPRESSO_ML - 0.001 ? 'full'
    : dripProgress >= 1 ? 'flow'
      : dripProgress > 0 ? 'drops' : 'infusion';
  return { ...shot, time, volume: phase === 'full' ? MAX_ESPRESSO_ML : volume, phase, blonding, temperature, quality };
}

const aerationRate = { surface: 0.36, air: 0.29, roll: 0, deep: 0 };
const refinement = { surface: 0.12, air: 0.37, roll: 0.96, deep: 0.28 };
const refinementRate = { surface: 1.55, air: 0.84, roll: 0.53, deep: 0.19 };
const layers = { surface: 0.68, air: 0.24, roll: 0.025, deep: 0.58 };
const layerRate = { surface: 1.04, air: 0.63, roll: 0.52, deep: 0.47 };
const approach = (initial, target, rate, seconds) => target + (initial - target) * Math.exp(-rate * seconds);

export function createSteam() {
  return { temperature: 5, foam: 0, fineness: 0.86, separation: 0, milkMl: BASE_MILK_ML };
}

export function advanceSteam(milk, seconds, depth) {
  const elapsed = Math.min(seconds, (MAX_STEAM_TEMPERATURE - milk.temperature) / HEATING_RATE);
  if (elapsed <= 0) return milk;
  const temperature = Math.min(MAX_STEAM_TEMPERATURE, milk.temperature + elapsed * HEATING_RATE);
  const beforeOverheat = Math.min(elapsed, Math.max(0, (65 - milk.temperature) / HEATING_RATE));
  const hotSeconds = elapsed - beforeOverheat;
  // Cold milk takes in air more readily. The whirlpool refines the existing
  // air while adding none of its own.
  const coolSeconds = clamp((38 - milk.temperature) / HEATING_RATE, 0, elapsed);
  const aerationSeconds = coolSeconds + (elapsed - coolSeconds) * .45;
  const foam = approach(milk.foam, MAX_FOAM, aerationRate[depth], aerationSeconds);
  const texturedFineness = foam > 0.001
    ? approach(milk.fineness, refinement[depth], refinementRate[depth], beforeOverheat)
    : milk.fineness;
  const fineness = approach(texturedFineness, 0.29, 0.58, hotSeconds);
  const blended = foam > 0.001
    ? approach(milk.separation, layers[depth], layerRate[depth], beforeOverheat)
    : milk.separation;
  const separation = approach(blended, 0.87, 0.53, hotSeconds);
  return { temperature, milkMl: BASE_MILK_ML / (1 - foam), foam, fineness, separation };
}

export function getPreparedIngredients(shot, milk) {
  if (shot.volume < MIN_ESPRESSO_ML || milk.temperature < MIN_MILK_TEMPERATURE) return null;
  const seed = (
    Math.round(shot.volume * 1024) * 2654435761
    ^ Math.round(milk.temperature * 128) * 1597334677
    ^ Math.round(milk.foam * 4096) * 3812015801
    ^ Math.round(milk.fineness * 4096) * 1664525
  ) >>> 0;
  return {
    espressoMl: shot.volume,
    milkMl: milk.milkMl,
    espressoTemperature: shot.temperature,
    temperature: milk.temperature,
    foam: milk.foam,
    fineness: milk.fineness,
    separation: milk.separation,
    extraction: shot.quality,
    seed,
  };
}
