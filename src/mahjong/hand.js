import { tileType } from './tiles.js';

export const ORPHANS = Object.freeze([0,8,9,17,18,26,27,28,29,30,31,32,33]);
export function isTerminalOrHonor(tile) {
  const type = tileType(tile);
  return type >= 27 || type >= 0 && (type % 9 === 0 || type % 9 === 8);
}
function validMeld(meld) {
  if (!meld || !Array.isArray(meld.tiles)) return false;
  const types = meld.tiles.map(tileType).sort((a,b) => a-b);
  if (types.some(t => t < 0)) return false;
  if (meld.type === 'kan') return types.length === 4 && types.every(t => t === types[0]);
  if (meld.type === 'pon') return types.length === 3 && types.every(t => t === types[0]);
  return meld.type === 'chi' && types.length === 3 && types[0] < 27 && Math.floor(types[0]/9) === Math.floor(types[2]/9) && types[1] === types[0]+1 && types[2] === types[0]+2;
}
export function enumerateWinningForms(concealed, melds = []) {
  if (!Array.isArray(concealed) || !Array.isArray(melds) || melds.length > 4 || !melds.every(validMeld) || concealed.length !== 14 - melds.length * 3) return [];
  const counts = Array(34).fill(0);
  for (const tile of [...concealed, ...melds.flatMap(m => m.tiles)]) {
    const type = tileType(tile);
    if (type < 0 || ++counts[type] > 4) return [];
  }
  for (const meld of melds) for (const tile of meld.tiles) counts[tileType(tile)]--;
  const forms = [];
  if (!melds.length) {
    const pairs = counts.flatMap((count, type) => count === 2 ? [type] : []);
    if (pairs.length === 7) forms.push({type:'chiitoitsu', pairs});
    if (ORPHANS.every(type => counts[type] >= 1) && counts.every((n,type) => !n || ORPHANS.includes(type))) {
      forms.push({type:'kokushi', pair:ORPHANS.find(type => counts[type] === 2)});
    }
  }
  const fixed = melds.map(m => ({type:m.type, tiles:m.tiles.map(tileType).sort((a,b) => a-b), open:m.open !== false}));
  function groups(pair, selected) {
    const first = counts.findIndex(n => n > 0);
    if (first === -1) {
      if (selected.length + fixed.length === 4) forms.push({type:'standard', pair, groups:[...selected,...fixed]});
      return;
    }
    if (counts[first] >= 3) {
      counts[first] -= 3;
      groups(pair, [...selected,{type:'pon',tiles:[first,first,first],open:false}]);
      counts[first] += 3;
    }
    if (first < 27 && first % 9 <= 6 && counts[first+1] && counts[first+2]) {
      counts[first]--; counts[first+1]--; counts[first+2]--;
      groups(pair, [...selected,{type:'chi',tiles:[first,first+1,first+2],open:false}]);
      counts[first]++; counts[first+1]++; counts[first+2]++;
    }
  }
  for (let pair=0; pair<34; pair++) {
    if (counts[pair] < 2) continue;
    counts[pair] -= 2;
    groups(pair, []);
    counts[pair] += 2;
  }
  return forms;
}
export function isCompleteHand(concealed, melds = []) {
  return enumerateWinningForms(concealed, melds).length > 0;
}
