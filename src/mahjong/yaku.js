import { tileType } from './tiles.js';
import { ORPHANS, enumerateWinningForms, isTerminalOrHonor } from './hand.js';
import { basicPoints } from './score.js';

function nextDora(indicator) {
  const type = tileType(indicator);
  if (type < 0) return -1;
  if (type < 27) return Math.floor(type/9)*9 + (type%9+1)%9;
  if (type < 31) return 27+(type-27+1)%4;
  return 31+(type-31+1)%3;
}
function waitPlacements(form, winningType, concealedGroups) {
  if (form.type !== 'standard') return [{group:-1,wait:0}];
  const placements = [];
  if (form.pair === winningType) placements.push({group:-1,wait:2});
  for (let i=0; i<concealedGroups; i++) {
    const group = form.groups[i];
    if (!group.tiles.includes(winningType)) continue;
    if (group.type !== 'chi') placements.push({group:i,wait:0});
    else {
      const start = group.tiles[0];
      const edge = start%9 === 0 && winningType === start+2 || start%9 === 6 && winningType === start;
      placements.push({group:i,wait:winningType === start+1 || edge ? 2 : 0});
    }
  }
  return placements;
}
function suitYaku(tiles, closed, add) {
  const suits = new Set(tiles.filter(t => t < 27).map(t => Math.floor(t/9)));
  if (suits.size === 1) add(tiles.some(t => t >= 27) ? 'honitsu' : 'chinitsu', tiles.some(t => t >= 27) ? closed ? 3:2 : closed ? 6:5);
  if (tiles.every(isTerminalOrHonor)) add('honroutou',2);
  if (tiles.every(t => !isTerminalOrHonor(t))) add('tanyao',1);
}
function beforeWinningTile(concealed,winningType){
  const remaining=[...concealed],index=remaining.findIndex(tile=>tileType(tile)===winningType);
  if(index>=0)remaining.splice(index,1);
  return remaining;
}
function hasThirteenSidedKokushi(concealed,winningType){
  const before=beforeWinningTile(concealed,winningType),types=before.map(tileType);
  return types.length===13&&ORPHANS.every(type=>types.filter(value=>value===type).length===1);
}
function hasNineSidedChuuren(concealed,winningType){
  const before=beforeWinningTile(concealed,winningType),types=before.map(tileType);
  if(types.length!==13||types.some(type=>type<0||type>=27)||new Set(types.map(type=>Math.floor(type/9))).size!==1)return false;
  const counts=Array(9).fill(0);for(const type of types)counts[type%9]++;
  return counts[0]===3&&counts[8]===3&&counts.slice(1,8).every(count=>count===1);
}
function yakumanFor(context,form, concealed,winningType,tiles, groups, concealedTriplets, closed, add) {
  const tsumo=context.winType==='tsumo';
  if(context.tenhou)add('tenhou',13,1);
  if(context.chiihou)add('chiihou',13,1);
  if (form.type === 'kokushi') add('kokushi',13,hasThirteenSidedKokushi(concealed,winningType)?2:1);
  if (tiles.every(t => t >= 27)) add('tsuuiisou',13,1);
  if (tiles.every(t => t < 27 && isTerminalOrHonor(t))) add('chinroutou',13,1);
  if (tiles.every(t => [19,20,21,23,25,32].includes(t))) add('ryuuiisou',13,1);
  if (form.type !== 'standard') return;
  const trips = groups.filter(g => g.type !== 'chi').map(g => g.tiles[0]);
  if ([31,32,33].every(t => trips.includes(t))) add('daisangen',13,1);
  const winds = [27,28,29,30].filter(t => trips.includes(t)).length;
  if (winds === 4) add('daisuushii',13,2);
  else if (winds === 3 && form.pair >= 27 && form.pair < 31) add('shousuushii',13,1);
  if (concealedTriplets === 4) add('suuankou',13,form.pair===winningType?2:1);
  if (groups.filter(g => g.type === 'kan').length === 4) add('suukantsu',13,1);
  if (closed && groups.every(g => g.type !== 'kan') && tiles.every(t => t < 27 && Math.floor(t/9) === Math.floor(tiles[0]/9))) {
    const counts = Array(9).fill(0);
    for (const t of tiles) counts[t%9]++;
    if (counts[0] >= 3 && counts[8] >= 3 && counts.slice(1,8).every(n => n >= 1)) add('chuuren',13,hasNineSidedChuuren(concealed,winningType)?2:1);
  }
}
function scoreForm(context, form, placement, concealed, closed,winningType) {
  const groups = form.groups ?? [];
  const tsumo = context.winType === 'tsumo';
  const seatWind = 26+(context.seatWind ?? 1);
  const roundWind = 26+(context.roundWind ?? 1);
  const allTiles = [...concealed,...(context.melds ?? []).flatMap(m => m.tiles)].map(tileType);
  const concealedTriplets = groups.filter((g,i) => g.type !== 'chi' && !g.open && (tsumo || i !== placement.group)).length;
  const yaku = [];
  const add = (id,han,yakuman) => yaku.push(yakuman ? {id,han:han*yakuman,yakuman} : {id,han});
  yakumanFor(context,form,concealed,winningType,allTiles,groups,concealedTriplets,closed,add);
  if (yaku.length) return {yaku,han:yaku.reduce((sum,y) => sum+y.han,0),fu:0};
  if (closed && (context.doubleRiichi || context.riichi)) add(context.doubleRiichi ? 'double-riichi':'riichi',context.doubleRiichi ? 2:1);
  if (closed && (context.doubleRiichi || context.riichi) && context.ippatsu) add('ippatsu',1);
  if (closed && tsumo) add('menzen-tsumo',1);
  if (context.rinshan && tsumo) add('rinshan',1);
  if (context.chankan && !tsumo) add('chankan',1);
  if (context.haitei && tsumo && !context.rinshan) add('haitei',1);
  if (context.houtei && !tsumo && !context.chankan) add('houtei',1);
  suitYaku(allTiles,closed,add);
  if (form.type === 'chiitoitsu') add('chiitoitsu',2);
  let fu = form.type === 'chiitoitsu' ? 25 : 20;
  if (form.type === 'standard') {
    const triplets = groups.filter(g => g.type !== 'chi');
    const sequences = groups.filter(g => g.type === 'chi');
    const pairFu = (form.pair >= 31 ? 2:0)+(form.pair === seatWind ? 2:0)+(form.pair === roundWind ? 2:0);
    const pinfu = closed && sequences.length === 4 && pairFu === 0 && placement.wait === 0;
    if (pinfu) add('pinfu',1);
    for (const group of triplets) {
      const type = group.tiles[0];
      if (type >= 31) add(`yakuhai-dragon-${type}`,1);
      if (type === seatWind) add('yakuhai-seat',1);
      if (type === roundWind) add('yakuhai-round',1);
    }
    if (triplets.length === 4) add('toitoi',2);
    if (concealedTriplets >= 3) add('sanankou',2);
    if (triplets.filter(g => g.type === 'kan').length >= 3) add('sankantsu',2);
    if (triplets.filter(g => g.tiles[0] >= 31).length === 2 && form.pair >= 31) add('shousangen',2);
    const starts = sequences.map(g => g.tiles[0]);
    if (closed) {
      const counts = new Map();
      for (const start of starts) counts.set(start,(counts.get(start) ?? 0)+1);
      const pairs = [...counts.values()].reduce((sum,n) => sum+Math.floor(n/2),0);
      if (pairs >= 2) add('ryanpeikou',3);
      else if (pairs === 1) add('iipeikou',1);
    }
    for (let rank=0; rank<7; rank++) if ([rank,rank+9,rank+18].every(t => starts.includes(t))) { add('sanshoku-doujun',closed ? 2:1); break; }
    for (let suit=0; suit<3; suit++) if ([suit*9,suit*9+3,suit*9+6].every(t => starts.includes(t))) { add('ittsu',closed ? 2:1); break; }
    for (let rank=0; rank<9; rank++) if ([rank,rank+9,rank+18].every(t => triplets.some(g => g.tiles[0] === t))) { add('sanshoku-doukou',2); break; }
    if (sequences.length > 0 && isTerminalOrHonor(form.pair) && groups.every(g => g.tiles.some(isTerminalOrHonor))) {
      const honors = allTiles.some(t => t >= 27);
      add(honors ? 'chanta':'junchan',honors ? closed ? 2:1 : closed ? 3:2);
    }
    if (pinfu && tsumo) fu = 20;
    else {
      fu += pairFu + placement.wait + (closed && !tsumo ? 10:0) + (tsumo ? 2:0);
      for (let i=0; i<groups.length; i++) {
        const group = groups[i];
        if (group.type === 'chi') continue;
        const open = group.open || !tsumo && i === placement.group;
        fu += (group.type === 'kan' ? 8:2) * (open ? 1:2) * (isTerminalOrHonor(group.tiles[0]) ? 2:1);
      }
      fu = Math.max(30,Math.ceil(fu/10)*10);
    }
  }
  // Bonus tiles never establish a yaku on their own.
  if (!yaku.length) return null;
  const physical = [...concealed,...(context.melds ?? []).flatMap(m => m.tiles)];
  const aka = physical.filter(t => t >= 34).length;
  if (aka) add('aka-dora',aka);
  const dora = (context.doraIndicators ?? []).reduce((sum,indicator) => sum+allTiles.filter(t => t === nextDora(indicator)).length,0);
  if (dora) add('dora',dora);
  if (closed && (context.riichi || context.doubleRiichi)) {
    const ura = (context.uraIndicators ?? []).reduce((sum,indicator) => sum+allTiles.filter(t => t === nextDora(indicator)).length,0);
    if (ura) add('ura-dora',ura);
  }
  return {yaku,han:yaku.reduce((sum,y) => sum+y.han,0),fu};
}
/** Concealed is normally the complete winning hand. A 13-tile hand may
 * instead supply winningTile separately. Winds are 1..4, starting at East. */
export function evaluateYaku(context) {
  if (!context || !['ron','tsumo'].includes(context.winType)) return null;
  if (context.winType === 'ron' && (context.furiten || context.temporaryFuriten || context.riichiFuriten)) return null;
  const melds = context.melds ?? [];
  let concealed = context.concealed;
  if (!Array.isArray(concealed)) return null;
  if (concealed.length === 13-melds.length*3 && tileType(context.winningTile) >= 0) concealed = [...concealed,context.winningTile];
  const winningType = tileType(context.winningTile ?? concealed.at(-1));
  if (winningType < 0 || !concealed.some(t => tileType(t) === winningType)) return null;
  const closed = melds.every(m => m.open === false);
  const candidates = [];
  for (const form of enumerateWinningForms(concealed,melds)) {
    for (const placement of waitPlacements(form,winningType,4-melds.length)) {
      const result = scoreForm(context,form,placement,concealed,closed,winningType);
      if (result) candidates.push(result);
    }
  }
  candidates.sort((a,b) => {
    const points = result => basicPoints({...result,yakuman:result.yaku.reduce((sum,y) => sum+(y.yakuman ?? 0),0)});
    return points(b)-points(a) || b.han-a.han || b.fu-a.fu;
  });
  return candidates[0] ?? null;
}
