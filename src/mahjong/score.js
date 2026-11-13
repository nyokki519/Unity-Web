/** Capped base points. All score arithmetic uses exact integer operations. */
export function basicPoints({han, fu, yakuman = 0}) {
  if (yakuman > 0) return 8000 * yakuman;
  if (han >= 13) return 8000;
  if (han >= 11) return 6000;
  if (han >= 8) return 4000;
  if (han >= 6) return 3000;
  if (han >= 5) return 2000;
  return Math.min(2000, fu * 2 ** (han + 2));
}
const roundHundred = points => Math.ceil(points / 100) * 100;
const isSeat = seat => Number.isInteger(seat) && seat >= 0 && seat < 4;
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;

/** deltas includes honba and pot; honbaDelta is an informational subset.
 * riichiPot is measured in points, not sticks. Draws leave it on the table. */
export function calculatePayments(context) {
  const {type, honba = 0, riichiPot = 0} = context;
  const deltas = [0,0,0,0];
  const honbaDelta = [0,0,0,0];
  if (type !== undefined && !['win','nagashi','exhaustive','abortive'].includes(type)) throw new RangeError('Invalid result type');
  if (!nonnegative(honba) || !nonnegative(riichiPot)) throw new RangeError('Invalid counters');
  if (type === 'abortive') return {deltas,honbaDelta,riichiPotWinner:null};
  if (type === 'exhaustive') {
    const seats = context.tenpai ?? [];
    if (!Array.isArray(seats) || !seats.every(isSeat) || new Set(seats).size !== seats.length) throw new RangeError('Invalid tenpai seats');
    if (seats.length > 0 && seats.length < 4) {
      for (let seat=0; seat<4; seat++) deltas[seat] = seats.includes(seat) ? 3000 / seats.length : -3000 / (4-seats.length);
    }
    return {deltas,honbaDelta,riichiPotWinner:null};
  }
  const {winner, loser, dealer, yakuman = 0} = context;
  const winType = type === 'nagashi' ? 'tsumo' : context.winType;
  const han = type === 'nagashi' ? 5 : context.han;
  const fu = type === 'nagashi' ? 30 : context.fu;
  if (!isSeat(winner) || !isSeat(dealer) || !['ron','tsumo'].includes(winType) ||
      winType === 'ron' && (!isSeat(loser) || loser === winner) ||
      !Number.isInteger(han) || han < 1 || han > 104 || !nonnegative(fu) || fu > 200 ||
      !nonnegative(yakuman) || yakuman > 8 || han < 5 && fu < 20) throw new RangeError('Invalid scoring context');
  const base = basicPoints({han,fu,yakuman});
  const transfer = (payer, amount, bonus, receiver=winner) => {
    deltas[payer] -= amount + bonus;
    deltas[receiver] += amount + bonus;
    honbaDelta[payer] -= bonus;
    honbaDelta[receiver] += bonus;
  };
  const nagashiWinners=type==='nagashi'?(context.winners??[winner]):[winner];
  if(type==='nagashi'&&(!Array.isArray(nagashiWinners)||!nagashiWinners.length||!nagashiWinners.every(isSeat)||new Set(nagashiWinners).size!==nagashiWinners.length))throw new RangeError('Invalid nagashi winners');
  if (winType === 'ron') transfer(loser, roundHundred(base * (winner === dealer ? 6 : 4)), honba * 300);
  else if(type==='nagashi'){
    for(const nagashiWinner of nagashiWinners)for(let seat=0;seat<4;seat++)if(seat!==nagashiWinner){
      transfer(seat,roundHundred(base*(nagashiWinner===dealer||seat===dealer?2:1)),honba*100,nagashiWinner);
    }
  }else for (let seat=0; seat<4; seat++) if (seat !== winner) {
    transfer(seat, roundHundred(base * (winner === dealer || seat === dealer ? 2 : 1)), honba * 100);
  }
  const riichiPotWinner=type==='nagashi'?nagashiWinners[0]:winner;
  deltas[riichiPotWinner] += riichiPot;
  return {deltas,honbaDelta,riichiPotWinner:riichiPot > 0 ? riichiPotWinner : null};
}
