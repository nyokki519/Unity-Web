/** Display policy only. These functions never modify simulation state. */
export function createAutoCamera() {
  let lastStage = 0,
    holdUntil = -Infinity,
    lastTime = -Infinity;
  return {
    reset() {
      lastStage = 0;
      holdUntil = -Infinity;
      lastTime = -Infinity;
    },
    choose(game, { camera = "auto", reducedMotion = false } = {}) {
      if (game.elapsed < lastTime) this.reset();
      lastTime = game.elapsed;
      if (camera !== "auto") return camera;
      if (reducedMotion) return "overview";
      const occupied = (game.balls || [])
        .filter((b) => b.zone === "tray" && b.stage > 0)
        .sort((a, b) => b.stage - a.stage || a.id - b.id)[0];
      if (occupied) {
        lastStage = occupied.stage;
        holdUntil = game.elapsed + 2;
        return `cradle${lastStage}`;
      }
      if (lastStage && game.elapsed < holdUntil) return `cradle${lastStage}`;
      return game.balls?.some(
        (b) => b.zone === "board" || b.zone === "rail" || b.zone === "gate",
      )
        ? "forest"
        : "overview";
    },
  };
}
export function renderPixelRatio(quality, nativeRatio, width, height) {
  if (quality === "low") return 1;
  const native = Math.max(1, Math.min(3, Number(nativeRatio) || 1)),
    budget = quality === "high" ? 6000000 : 3000000;
  return Math.max(
    1,
    Math.min(native, Math.sqrt(budget / Math.max(1, width * height))),
  );
}
export const transitionWeight = (seconds) =>
  1 - Math.exp(-Math.max(0, Math.min(1, seconds)) / 0.18);
