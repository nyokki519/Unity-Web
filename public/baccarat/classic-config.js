// Geometry and tween definitions measured from the authorized mobile source.
export const SIZE = {
  width: 640,
  height: 960,
  cardWidth: 86.4,
  cardHeight: 120
};
export const DENOMS = [1, 10, 50, 100, 500, 1000, 5000, 10000];
export const LIMITS = {
  player: 50000,
  banker: 50000,
  tie: 5000
};
export const CHIP_POINTS = [
  [300, 568],
  [365, 568],
  [430, 568],
  [495, 568],
  [300, 631],
  [365, 631],
  [430, 631],
  [495, 631]
];
export const FONT = "'Hiragino Kaku Gothic ProN', 'ヒラギノ角ゴ ProN W3', Meiryo, メイリオ, Osaka, 'MS PGothic', arial, helvetica, sans-serif";
export function roundTimeline(plan) {
  const count = {
      player: 0,
      banker: 0
    },
    cards = [];
  for (const [index, c] of plan.cards.entries()) {
    const slot = count[c.side]++,
      third = index >= 4,
      start = third ? 1900 + (index - 4) * 500 : 200 + index * 400;
    cards.push({
      ...c,
      index,
      slot,
      x: (c.side === 'player' ? 150 : 417) + slot * 36,
      y: 120,
      fromX: 400,
      fromY: -900,
      start,
      duration: third && c.side === 'player' ? 500 : 200
    });
  }
  const end = Math.max(...cards.map(c => c.start + c.duration));
  return {
    cards,
    openingPoints: 1600,
    finalPoints: end,
    result: end + 300,
    prompt: end + 1300,
    openingDelay: 200,
    wait: 300,
    promptDelay: 1000
  };
}
