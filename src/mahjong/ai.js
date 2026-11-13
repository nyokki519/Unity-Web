import {legalActions, applyAction, advanceTurn} from './match.js';
import {tileType} from './tiles.js';
import {ORPHANS, isCompleteHand} from './hand.js';
import {evaluateYaku} from './yaku.js';
import {referenceAction} from './reference-ai.js';

// Count the fewest tile improvements needed, considering every way to divide
// the concealed hand into melds, partial melds, a pair and unused tiles.
function shanten(hand, openMelds = 0) {
  const counts = Array(34).fill(0);
  for (const tile of hand) counts[tileType(tile)]++;
  let best = 8;
  if (openMelds === 0) {
    const pairs = counts.filter(count => count >= 2).length;
    const unique = counts.filter(Boolean).length;
    const orphans = ORPHANS.filter(type => counts[type]).length;
    best = Math.min(6 - pairs + Math.max(0, 7 - unique),
      13 - orphans - Number(ORPHANS.some(type => counts[type] >= 2)));
  }
  function visit(start, melds, partials, pair) {
    while (start < 34 && !counts[start]) start++;
    if (start === 34) {
      best = Math.min(best, 8 - 2 * melds - Math.min(partials, 4 - melds) - pair);
      return;
    }
    if (melds < 4 && counts[start] >= 3) {
      counts[start] -= 3;
      visit(start, melds + 1, partials, pair);
      counts[start] += 3;
    }
    if (melds < 4 && start < 27 && start % 9 <= 6 && counts[start + 1] && counts[start + 2]) {
      counts[start]--; counts[start + 1]--; counts[start + 2]--;
      visit(start, melds + 1, partials, pair);
      counts[start]++; counts[start + 1]++; counts[start + 2]++;
    }
    if (counts[start] >= 2) {
      counts[start] -= 2;
      if (!pair) visit(start, melds, partials, 1);
      if (partials < 4 - melds) visit(start, melds, partials + 1, pair);
      counts[start] += 2;
    }
    if (start < 27 && partials < 4 - melds) {
      for (const gap of [1, 2]) {
        if (start % 9 + gap > 8 || !counts[start + gap]) continue;
        counts[start]--; counts[start + gap]--;
        visit(start, melds, partials + 1, pair);
        counts[start]++; counts[start + gap]++;
      }
    }
    counts[start]--;
    visit(start, melds, partials, pair);
    counts[start]++;
  }
  visit(0, openMelds, 0, 0);
  return best;
}

function withoutTiles(hand, tiles) {
  const remaining = [...hand];
  for (const tile of tiles) remaining.splice(remaining.indexOf(tile), 1);
  return remaining;
}

function pick(actions, random) {
  if (actions.length < 2) return actions[0];
  return actions[Math.min(actions.length - 1, Math.max(0, Math.floor(random() * actions.length)))];
}

function doraType(indicator) {
  const type=tileType(indicator);if(type<0)return -1;
  if(type<27)return Math.floor(type/9)*9+(type%9+1)%9;
  if(type<31)return 27+(type-26)%4;
  return 31+(type-30)%3;
}
export function countPublicTiles(match, seat) {
  const counts=Array(34).fill(0);
  for(const [index,player] of match.players.entries()){
    if(index===seat)for(const tile of player.hand||[])counts[tileType(tile)]++;
    for(const discard of player.discards||[])if(!discard?.called)counts[tileType(discard.tile??discard)]++;
    for(const meld of player.melds||[])for(const tile of meld.tiles||[])counts[tileType(tile)]++;
  }
  // `kanDoraIndicators` stores unrevealed future indicators too. Only the
  // currently revealed doraIndicators belong to the public information set.
  for(const tile of match.doraIndicators||[])counts[tileType(tile)]++;
  return counts;
}
function isSuji(type, river) {
  return type < 27 && river.some(value => value < 27 &&
    Math.floor(value/9) === Math.floor(type/9) && Math.abs(value%9-type%9) === 3);
}
function dangerFor(tile, threats) {
  const type=tileType(tile);if(!threats.length)return 0;
  let risk=0;
  for(const opponent of threats){
    const discards=opponent.discards||[],declaration=discards.findIndex(discard=>discard.riichi);
    const river=discards.map(discard=>tileType(discard.tile??discard));
    const after=declaration<0?[]:river.slice(declaration);
    // Any tile in a riichi player's river is genbutsu, including discards
    // made before the declaration. Later discards also define suji clues.
    if(river.includes(type))continue;
    if(type>=27){risk+=Math.max(.12,1-after.filter(value=>value===type).length*.28);continue;}
    const suji=isSuji(type,after);
    risk+=suji?.42:1;
  }
  return risk;
}

// An open tenpai is only useful if at least one wait has a real yaku. Check
// that against the local scorer, using the called tile and public round data.
// This is deliberately limited to calls that immediately reach tenpai; a
// heuristic over unfinished hands would incorrectly reject plausible yaku.
function openTenpaiHasYaku(match, seat, action, handAfterCall, meldsAfterCall) {
  const waits = Array.from({length:34},(_,type)=>type).filter(type => {
    return isCompleteHand([...handAfterCall,type],meldsAfterCall);
  });
  return waits.some(type => {
    const winningTile=type;
    const common={concealed:[...handAfterCall,winningTile],melds:meldsAfterCall,
      seatWind:((seat-match.dealer+4)%4)+1,roundWind:match.roundWind,
      doraIndicators:match.doraIndicators||[]};
    return !!evaluateYaku({...common,winningTile,winType:'ron'}) ||
      !!evaluateYaku({...common,winningTile,winType:'tsumo'});
  });
}

/** Diagnostic ranking for the legal discard choices. Public information is
 * limited to the acting hand, visible rivers/melds, dora indicators and riichi. */
export function rankDiscardCandidates(match, seat, actions) {
  const player=match.players[seat],distanceCache=new Map();
  const distance=hand=>{const key=`${player.melds.length}:${hand.map(tileType).sort((a,b)=>a-b).join(',')}`;if(!distanceCache.has(key))distanceCache.set(key,shanten(hand,player.melds.length));return distanceCache.get(key);};
  const visible=countPublicTiles(match,seat),unknown=visible.map(count=>Math.max(0,4-count));
  const indicators=(match.doraIndicators||[]).map(doraType).filter(type=>type>=0);
  const doraTypes=new Set(indicators),threats=match.players.filter((other,index)=>index!==seat&&other.riichi),minimum=Math.min(...actions.map(action=>distance(withoutTiles(player.hand,[action.tile]))));
  const style={moka:{bonus:.9,risk:1.25},sumire:{bonus:1.1,risk:1},houma:{bonus:1.15,risk:.75},kona:{bonus:1,risk:1}}[player.characterId]||{bonus:1,risk:1};
  const rows=actions.filter(action=>distance(withoutTiles(player.hand,[action.tile]))===minimum).map(action=>{
    const hand=withoutTiles(player.hand,[action.tile]),ukeire=unknown.reduce((sum,copies,type)=>copies>0&&distance([...hand,type])<minimum?sum+copies:sum,0);
    const tileTypeValue=tileType(action.tile),discardValue=(doraTypes.has(tileTypeValue)?1:0)+(action.tile>=34?.5:0);
    const danger=dangerFor(action.tile,threats);
    return {action,shanten:minimum,ukeire,doraLoss:discardValue,danger,styleCost:discardValue*style.bonus+danger*style.risk};
  });
  return rows.sort((a,b)=>a.shanten-b.shanten||b.ukeire-a.ukeire||a.styleCost-b.styleCost||a.doraLoss-b.doraLoss||a.danger-b.danger);
}

function bestDiscard(actions, match, seat, random) {
  const ranked=rankDiscardCandidates(match,seat,actions);if(!ranked.length)return undefined;
  const best=ranked[0],ties=ranked.filter(row=>row.shanten===best.shanten&&row.ukeire===best.ukeire&&row.styleCost===best.styleCost).map(row=>row.action);
  return pick(ties,random);
}

/** Entry-level policy. Decisions use only legal actions, our own hand and
 * opponents' public riichi/discard information; the wall is never inspected. */
export function chooseAction(match, seat, random = Math.random) {
  const actions = legalActions(match, seat);
  const win = actions.find(action => action.type === 'tsumo' || action.type === 'ron');
  if (win) return win;
  if (!actions.length) return undefined;
  const player = match.players[seat], cache = new Map();
  const distance = (hand, melds) => {
    const key = `${melds}:${hand.map(tileType).sort((a,b) => a-b).join(',')}`;
    if (!cache.has(key)) cache.set(key, shanten(hand, melds));
    return cache.get(key);
  };
  const nineTerminals=actions.find(action=>action.type==='nine_terminals');
  if(nineTerminals&&shanten(player.hand,player.melds.length)>=3)return nineTerminals;
  const reference=referenceAction(match,seat,actions);
  if(reference)return reference;
  const riichi = actions.filter(action => action.type === 'riichi_discard');
  const discards = actions.filter(action => action.type === 'discard');
  if (riichi.length) return bestDiscard(riichi, match, seat, random);
  if (discards.length) return bestDiscard(discards, match, seat, random);

  let best = distance(player.hand, player.melds.length), claims = [];
  for (const action of actions.filter(action => ['chi', 'pon', 'kan', 'ankan'].includes(action.type))) {
    const remaining = withoutTiles(player.hand, action.tiles);
    const melds = player.melds.length + 1;
    // Chi/pon require a discard. A kan's replacement draw is unknown, so
    // compare its hand before that draw without predicting or choosing it.
    const score = action.type === 'kan'||action.type==='ankan' ? distance(remaining, melds) :
      Math.min(...[...new Set(remaining)].map(tile => distance(withoutTiles(remaining, [tile]), melds)));
    if (score === 0 && ['chi','pon'].includes(action.type)) {
      const calledTile=match.lastDiscard?.tile;
      const meld={type:action.type,tiles:[...action.tiles,calledTile],open:true};
      const handMelds=[...player.melds,meld];
      const tenpaiDiscards=[...new Set(remaining)].filter(tile => distance(withoutTiles(remaining,[tile]),melds)===0);
      if (!tenpaiDiscards.some(tile=>openTenpaiHasYaku(match,seat,action,withoutTiles(remaining,[tile]),handMelds))) continue;
    }
    if (score < best) { best = score; claims = [action]; }
    else if (score === best && claims.length) claims.push(action);
  }
  return claims.length ? pick(claims, random) : actions.find(action => action.type === 'pass');
}

/** Execute one action or advance the hand-result screen through the match API. */
export function runCpuTurn(match, seat, random = Math.random, now = Date.now()) {
  if (match.phase === 'HAND_RESULT') return advanceTurn(match, now);
  const action = chooseAction(match, seat, random);
  return action ? applyAction(match, seat, action, match.revision, now) : match;
}
