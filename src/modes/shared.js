export function requireValue(condition) { if (!condition) throw new Error('INVALID_ANSWER'); }
export const average = items => items.length ? Math.round(items.reduce((a, b) => a + b, 0) / items.length) : 0;
export function tagged(tags, score) { return Object.fromEntries((tags || []).map(tag => [tag, score])); }
export function choiceScores(q, key) {
  const selected = q.valueTags[key] || [];
  return Object.fromEntries([...new Set(Object.values(q.valueTags).flat())].map(t => [t, selected.includes(t) ? 100 : 0]));
}
export const entries = (round, players) => Object.entries(round.answers).filter(([id, a]) => round.participants.includes(id) && !a.skip).map(([id, a]) => ({ id, name: players[id]?.name || '参加者', value: a.value }));
