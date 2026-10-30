const values = [5000, 1000, 500, 100, 10, 1];

function change(cents) {
  const coins = [];
  let amount = Math.round(cents / 100);
  for (const value of values) {
    const count = Math.floor(amount / value);
    for (let i = 0; i < count; i++) coins.push(value);
    amount -= count * value;
  }
  return coins;
}
/** Presentation only. Rebuild committed coin placements from the Session undo ledger. */
export function coinPiles(bets, undo = []) {
  const piles = {
    player: [],
    banker: [],
    tie: []
  };
  let previous = {};
  for (const next of [...undo, bets]) {
    for (const side of Object.keys(piles)) {
      const amount = next[side] || 0,
        delta = amount - (previous[side] || 0);
      if (delta > 0) piles[side].push(...change(delta));
      else if (delta < 0) piles[side] = change(amount);
    }
    previous = next;
  }
  return piles;
}
