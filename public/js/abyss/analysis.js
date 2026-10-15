/** Wilson score interval, 95%, including honest zero-sample bounds. */
export function wilson(passed, reached) {
  if (!Number.isFinite(reached) || reached <= 0) return { low: 0, high: 1 };
  const p = Math.min(reached, Math.max(0, passed)) / reached,
    z = 1.959963984540054,
    d = 1 + (z * z) / reached;
  const center = (p + (z * z) / (2 * reached)) / d,
    half =
      (z *
        Math.sqrt(
          (p * (1 - p)) / reached + (z * z) / (4 * reached * reached),
        )) /
      d;
  return { low: Math.max(0, center - half), high: Math.min(1, center + half) };
}
export function summarize(game) {
  const s = game.stats || {},
    reached = s.reached || [
      s.forestAttempts || 0,
      s.gateReached ?? s.gateAttempts ?? 0,
      ...(s.trayEntries || [0, 0, 0]),
    ],
    passed = s.passed || [
      s.forestPasses || 0,
      s.gatePasses || 0,
      ...(s.trayPasses || [0, 0, 0]),
    ];
  const rows = ["入口", "周期ゲート", "1段目", "2段目", "3段目"].map(
    (name, i) => {
      const n = Number(reached[i]) || 0,
        k = Number(passed[i]) || 0;
      return {
        label: name + (n < 30 ? "（標本不足）" : ""),
        reached: n,
        passed: k,
        rate: n ? k / n : null,
        ...wilson(k, n),
      };
    },
  );
  const n =
      Number(game.fired ?? s.shots ?? s.reached?.[0] ?? s.forestAttempts) || 0,
    k =
      Number(
        game.jackpots ?? s.jackpots ?? s.passed?.[4] ?? s.trayPasses?.[2],
      ) || 0;
  rows.push({
    label:
      "全体（発射あたり）" +
      (game.balls?.length ? "（進行中）" : "") +
      (n < 30 ? "（標本不足）" : ""),
    reached: n,
    passed: k,
    rate: n ? k / n : null,
    ...wilson(k, n),
  });
  return rows;
}
export function toCSV(rows) {
  const keys = ["label", "reached", "passed", "rate", "low", "high"];
  const quote = (v) => '"' + String(v ?? "").replaceAll('"', '""') + '"';
  return (
    "\uFEFF" +
    [
      keys.join(","),
      ...rows.map((r) => keys.map((k) => quote(r[k])).join(",")),
    ].join("\r\n")
  );
}
