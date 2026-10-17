export const challengeFunds = (g) =>
  Math.max(0, (g.initialBalls - g.fired) * 10 + g.jackpots * 5000);
export const launchAllowed = (g) =>
  !!g &&
  g.status === "running" &&
  g.remaining > 0 &&
  g.balls.length < g.board.maxBalls;
export function createLaunchPolicy(seed = "abyss") {
  let state = 2166136261;
  for (const c of String(seed))
    state = Math.imul(state ^ c.codePointAt(0), 16777619) >>> 0;
  const next = () => (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return {
    peek: (base, random) =>
      random ? 35 + Math.floor((next() / 4294967296) * 31) : base,
    commit(accepted) {
      if (accepted) state = next();
    },
  };
}
