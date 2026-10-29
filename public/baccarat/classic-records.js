import {
  payout
} from './rules.js';
export function classicRecord(state, marker = null) {
  const after = marker?.id === state.id && Number.isSafeInteger(marker.after) && marker.after >= 0 && marker.after <= state.stats.rounds ? marker.after : 0;
  const history = state.history.filter(h => h.number > after),
    sums = {
      player: [0, 0],
      banker: [0, 0],
      tie: [0, 0],
      total: [0, 0]
    };
  for (const h of history)
    for (const line of payout(h.bets, h.winner).lines) {
      sums[line.side][0] += line.stake;
      sums[line.side][1] += line.returned;
      sums.total[0] += line.stake;
      sums.total[1] += line.returned;
    }
  return {
    rounds: state.stats.rounds - after,
    ratios: Object.fromEntries(Object.entries(sums).map(([key, [bet, returned]]) => [key, bet ? (returned / bet).toFixed(2) : '0.00'])),
    limited: state.stats.rounds - after > history.length
  };
}
