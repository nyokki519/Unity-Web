// Reads a separately obtained reference checkout; never bundles its source/assets.
import { pathToFileURL } from "node:url";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createSimulation } from "../public/js/abyss/si-engine.js";
const out = process.env.CAFE_QA_DIR || "docs/qa/cafe-motor";
mkdirSync(out, { recursive: true });
const dt = 1 / 240,
  shots = Number(process.env.CAFE_SHOTS || 100),
  spacing = 0.6,
  seed = "comparison-20261017";
function rng() {
  let n = 5381;
  for (const c of seed) n = Math.imul(n, 33) ^ c.codePointAt(0);
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
}
let Sim;
if (process.env.REFERENCE_REPO)
  ({ Sim } = await import(
    pathToFileURL(resolve(process.env.REFERENCE_REPO, "src/physics.js"))
  ));
const results = [];
for (const power of [35, 45, 55]) {
  if (Sim) {
    const counts = {
        gate: 0,
        disc: 0,
        pin: 0,
        jackpots: 0,
        entries: [0, 0, 0],
        passes: [0, 0, 0],
        dwell: [0, 0, 0],
      },
      s = new Sim((type, data) => {
        if (type === "gate") counts.gate++;
        if (type === "disc") counts.disc++;
        if (type === "pin") counts.pin++;
        if (type === "jackpot") counts.jackpots++;
        if (type === "bowlenter") counts.entries[data.tier]++;
        if (type === "sink" && data.win) counts.passes[data.tier]++;
      }, rng());
    let fired = 0,
      next = 0;
    const last = new Map(),
      stalled = new Set();
    while (
      s.time < shots * spacing + 120 &&
      (fired < shots || s.balls.length)
    ) {
      if (fired < shots && s.time >= next - 1e-8 && s.launch(power / 100)) {
        fired++;
        next = s.time + spacing;
      }
      for (const b of s.balls) {
        if (b.mode === "bowl") counts.dwell[b.bi] += dt;
        const x = b.mode === "bowl" ? b.px : b.x,
          y = b.mode === "bowl" ? b.pz : b.y,
          prev = last.get(b.id);
        if (!prev || Math.hypot(x - prev.x, y - prev.y) > 0.0026)
          last.set(b.id, { x, y, at: s.time });
        else if (s.time - prev.at > 5) stalled.add(b.id);
      }
      s.step(dt);
    }
    results.push({
      model: "reference",
      power,
      fired,
      elapsed: s.time,
      active: s.balls.length,
      stalledBallIds: [...stalled],
      ...counts,
      meanTrayDwell: counts.dwell.map((n, i) =>
        counts.entries[i] ? n / counts.entries[i] : null,
      ),
    });
  }
  const g = createSimulation({ seed, initialBalls: shots,difficulty:process.env.CAFE_DIFFICULTY||"normal" });
  let next = 0;
  const last = new Map(),
    stalled = new Set();
  while (g.status === "running" && g.elapsed < shots * spacing + 120) {
    if (g.remaining && g.elapsed >= next - 1e-8 && g.fire(power))
      next = g.elapsed + spacing;
    for (const b of g.balls) {
      const prev = last.get(b.id);
      if (
        !prev ||
        Math.hypot(b.x - prev.x, b.y - prev.y, b.z - prev.z) > 0.00055
      )
        last.set(b.id, { x: b.x, y: b.y, z: b.z, at: g.elapsed });
      else if (g.elapsed - prev.at > 5) stalled.add(b.id);
    }
    g.step(dt);
  }
  results.push({
    model: g.physicsVersion,
    power,
    fired: g.fired,
    elapsed: g.elapsed,
    active: g.balls.length,
    gate: g.stats.gatePasses,
    disc: g.stats.contacts.rotor,
    pin: g.stats.contacts.pin,
    jackpots: g.jackpots,
    entries: g.stats.trayEntries,
    passes: g.passes,
    stalledBallIds: [...stalled],
    trayTimeouts: g.stats.trayTimeouts,
    meanTrayDwell: g.stats.dwellTotals
      .slice(1, 4)
      .map((n, i) =>
        g.stats.dwellCounts[i + 1] ? n / g.stats.dwellCounts[i + 1] : null,
      ),
    ledger: g.fired === g.lost + g.jackpots + g.balls.length,
  });
  g.dispose();
  console.log("completed power", power);
}
writeFileSync(
  out + "/comparison.json",
  JSON.stringify(
    {
      conditions: {
        seed,
        independentDifficulty:process.env.CAFE_DIFFICULTY||"normal",
        referenceDifficulty:"single original configuration",
        collisionCounterNote:"Reference impact-speed thresholds differ from independent contact-start counters; not directly equivalent.",
        shotsPerPower: shots,
        powers: [35, 45, 55],
        spacingSeconds: spacing,
        fixedStep: dt,
        referenceCommit: "04d95bccea18ad8579a2773bed343ba67e52666d",
        note: "Normalized input power; different physical scales, RNG consumption and assistance. No debug injections. Five-second displacement below 5% of ball diameter stall detector; not identical trajectories or real-machine odds.",
      },
      results,
    },
    null,
    2,
  ),
);
