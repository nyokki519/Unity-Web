/** Tile values: man 0..8, pin 9..17, sou 18..26, honors 27..33;
 * red fives 34..36. Values identify a tile face, not a physical copy. */
export function tileType(tile) {
  if (!Number.isInteger(tile) || tile < 0 || tile > 36) return -1;
  return tile < 34 ? tile : [4, 13, 22][tile - 34];
}
export function tileSuit(tile) {
  const type = tileType(tile);
  return type < 0 ? null : ['m', 'p', 's', 'z'][Math.floor(type / 9)];
}
export function tileRank(tile) {
  const type = tileType(tile);
  return type < 0 ? null : type < 27 ? type % 9 + 1 : type - 26;
}
export function sortHand(tiles) {
  return [...tiles].sort((a, b) => tileType(a) - tileType(b) || a - b);
}
export function createWall(seed = 0) {
  let state = 2166136261;
  for (const char of String(seed)) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
  const random = () => {
    state = state + 0x6d2b79f5 | 0;
    let value = Math.imul(state ^ state >>> 15, 1 | state);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
  const wall = [];
  for (let type = 0; type < 34; type++) {
    for (let copy = 0; copy < 4; copy++) wall.push(copy === 0 && [4,13,22].includes(type) ? 34 + Math.floor(type / 9) : type);
  }
  for (let i = wall.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [wall[i], wall[j]] = [wall[j], wall[i]];
  }
  return wall;
}
