let createSimulation;
const engineReady = import("./engine.js").then(module => { createSimulation = module.createSimulation; });
import { FIXED_DT } from "./config.js";
import { summarize } from "./analysis.js";
export function randomFromSeed(seed) {
  let s = 2166136261;
  for (const c of String(seed)) s = Math.imul(s ^ c.charCodeAt(0), 16777619);
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function approximateTrial(random, probabilities, counts) {
  for (let i = 0; i < 5; i++) {
    counts.reached[i]++;
    if (random() >= probabilities[i]) break;
    counts.passed[i]++;
  }
}
let job = null;
function report(type) {
  const j = job;
  if (!j) return;
  j.counts.shots = j.completed;
  postMessage({
    type,
    id: j.id,
    mode: j.mode,
    label:
      j.mode === "approximate"
        ? "近似：ユーザー仮定の独立確率（実測物理成功率ではありません）"
        : "固定刻みの物理試行" +
          (j.timeouts ? "（時間上限で未決着 " + j.timeouts + " 試行）" : ""),
    completed: j.completed,
    total: j.total,
    timeouts: j.timeouts,
    policy:
      j.mode === "physics"
        ? "Independent single-ball trials; seeded launch phase uniformly sampled over gate period; 120 second settling limit"
        : undefined,
    counts: j.counts,
    rows: summarize({ stats: j.counts }),
  });
}
function chunk() {
  const j = job;
  if (!j || j.paused) return;
  try {
    const deadline = performance.now() + 15;
    do {
      if (j.mode === "approximate") {
        for (let i = 0; i < Math.min(500, j.total - j.completed); i++) {
          approximateTrial(j.random, j.probabilities, j.counts);
          j.completed++;
        }
      } else {
        if (!j.sim) {
          j.sim = createSimulation({
            difficulty: j.difficulty,
            config: j.config,
            seed: j.seed + ":" + j.completed,
            initialBalls: 1,
          });
          j.sim.step(j.random() * j.sim.board.gate.period);
          j.startTick = j.sim.tick;
          j.sim.fire(j.power, j.angle);
        }
        for (
          let k = 0;
          k < 240 && j.sim.balls.length && j.sim.tick - j.startTick < 240 * 120;
          k++
        )
          j.sim.step(FIXED_DT);
        if (!j.sim.balls.length || j.sim.tick - j.startTick >= 240 * 120) {
          if (j.sim.balls.length) j.timeouts++;
          const rows = summarize(j.sim);
          rows.slice(0, 5).forEach((r, i) => {
            j.counts.reached[i] += r.reached;
            j.counts.passed[i] += r.passed;
          });
          j.counts.jackpots = (j.counts.jackpots || 0) + j.sim.jackpots;
          j.completed++;
          j.sim.dispose?.();
          j.sim = null;
        }
      }
    } while (j.completed < j.total && performance.now() < deadline);
    report(j.completed === j.total ? "result" : "progress");
    if (j.completed === j.total) job = null;
    else setTimeout(chunk, 0);
  } catch (error) {
    j.sim?.dispose?.();
    postMessage({ type: "error", id: j.id, message: error.message });
    job = null;
  }
}
if (typeof self !== "undefined")
  self.onmessage = async ({ data }) => {
    try {
      await engineReady;
      if (data.type === "pause") {
        if (job) job.paused = true;
        return;
      }
      if (data.type === "resume") {
        if (job && job.paused) {
          job.paused = false;
          setTimeout(chunk, 0);
        }
        return;
      }
      if (data.type === "cancel") {
        report("cancelled");
        job?.sim?.dispose?.();
        job = null;
        return;
      }
      if (data.type !== "start") return;
      if (job) { job.sim?.dispose?.(); job = null; }
      if (![1000, 10000, 100000, 1000000].includes(data.trials))
        throw new Error("Unsupported trial count");
      if (!["approximate", "physics"].includes(data.mode))
        throw new Error("Invalid research mode");
      const probabilities = data.probabilities || [
        1 / 100,
        1 / 5,
        1 / 3,
        1 / 4,
        1 / 5,
      ];
      if (
        !Array.isArray(probabilities) ||
        probabilities.length !== 5 ||
        probabilities.some((p) => !Number.isFinite(p) || p < 0 || p > 1)
      )
        throw new Error("Invalid probabilities");
      job = {
        ...data,
        total: data.trials,
        completed: 0,
        timeouts: 0,
        paused: false,
        probabilities,
        random: randomFromSeed(data.seed),
        counts: { reached: [0, 0, 0, 0, 0], passed: [0, 0, 0, 0, 0] },
      };
      setTimeout(chunk, 0);
    } catch (error) {
      postMessage({ type: "error", id: data.id, message: error.message });
    }
  };
