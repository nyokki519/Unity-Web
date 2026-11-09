import {legalActions, applyAction, advanceTurn} from './match.js';
import {tileType} from './tiles.js';
import {ORPHANS} from './hand.js';

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

function bestDiscard(actions, match, seat, random, distance) {
  const player = match.players[seat];
  const threats = match.players.filter((other, index) => index !== seat && other.riichi);
  let best = Infinity, safety = -1, choices = [];
  for (const action of actions) {
    const score = distance(withoutTiles(player.hand, [action.tile]), player.melds.length);
    const safe = threats.filter(other => other.discards.some(discard => tileType(discard.tile) === tileType(action.tile))).length;
    if (score < best || score === best && safe > safety) {
      best = score; safety = safe; choices = [];
    }
    if (score === best && safe === safety && !choices.some(choice => choice.tile === action.tile)) choices.push(action);
  }
  return pick(choices, random);
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
  const riichi = actions.filter(action => action.type === 'riichi_discard');
  if (riichi.length) return bestDiscard(riichi, match, seat, random, distance);
  const discards = actions.filter(action => action.type === 'discard');
  if (discards.length) return bestDiscard(discards, match, seat, random, distance);

  let best = distance(player.hand, player.melds.length), claims = [];
  for (const action of actions.filter(action => ['chi', 'pon', 'kan', 'ankan'].includes(action.type))) {
    const remaining = withoutTiles(player.hand, action.tiles);
    const melds = player.melds.length + 1;
    // Chi/pon require a discard. A kan's replacement draw is unknown, so
    // compare its hand before that draw without predicting or choosing it.
    const score = action.type === 'kan'||action.type==='ankan' ? distance(remaining, melds) :
      Math.min(...[...new Set(remaining)].map(tile => distance(withoutTiles(remaining, [tile]), melds)));
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
