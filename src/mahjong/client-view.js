import {legalActions} from './match.js';

/** A non-authoritative local CPU-game view. Opponent hands are never included. */
export function view(match,seat=0,{actions=legalActions}={}){
  const players=match.players.map((player,index)=>({seat:index,id:player.id,name:player.name||String(player.id),points:player.points,
    handCount:player.hand.length,discards:structuredClone(player.discards),melds:structuredClone(player.melds),riichi:!!player.riichi,
    ...(index===seat?{hand:[...player.hand]}:{})}));
  const result=match.result?structuredClone(match.result):null;
  return {phase:match.phase,revision:match.revision,activeSeat:match.activeSeat,dealer:match.dealer,
    round:`東${match.handNumber}局`,handNumber:match.handNumber,honba:match.honba,riichiPot:match.riichiPot,
    remainingTiles:match.liveWall.length,doraIndicators:[...match.doraIndicators],lastDiscard:match.lastDiscard?structuredClone(match.lastDiscard):null,
    ...(match.phase==='DISCARD'&&match.activeSeat===seat&&match.drawnTile!==null?{drawnTile:match.drawnTile}:{}),
    players,legalActions:actions(match,seat),deadlineAt:match.deadlineAt,result};
}
