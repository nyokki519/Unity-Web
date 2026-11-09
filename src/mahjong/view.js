import {legalActions} from './match.js';

const copy=value=>value===undefined?undefined:structuredClone(value);
const fields=(value,keys)=>Object.fromEntries(keys.filter(key=>['string','number','boolean'].includes(typeof value?.[key])).map(key=>[key,value[key]]));
const publicResult=result=>{
  if(!result)return null;
  const out=fields(result,['type','title','reason','winner','loser','han','fu','chankan']);
  for(const key of ['winners','deltas','tenpai'])if(Array.isArray(result[key]))out[key]=result[key].filter(v=>typeof v==='number');
  if(Array.isArray(result.yaku))out.yaku=result.yaku.map(y=>fields(y,['id','name','han','yakuman']));
  if(Array.isArray(result.rankings))out.rankings=result.rankings.map(r=>fields(r,['seat','rank','name','points','uma']));
  return out;
};

// Allowlist serialization deliberately does not copy the match, wall, responses,
// history, or private player objects into the client state.
export function view(room,seat,{actions=legalActions}={}){
  if(!room.players[seat])throw new Error('BAD_SESSION');
  const match=room.match;
  const state={code:room.code,selfSeat:seat,seat,hostSeat:room.hostSeat??0,phase:match?.phase||'LOBBY',revision:room.revision,expiresAt:room.expiresAt,
    players:room.players.map((player,index)=>{
      if(!player)return null;
      const p=match?.players[index];
      return {seat:index,name:player.name,ready:player.ready,connected:player.connected,points:p?.points??25000,handCount:p?.hand.length??0,
        discards:copy(p?.discards||[]),melds:(p?.melds||[]).map(m=>({type:m.type,tiles:copy(m.tiles||[]),...(m.from!==undefined?{from:m.from}:{})})),riichi:Boolean(p?.riichi),...(index===seat?{hand:copy(p?.hand||[])}:{})};
    }),legalActions:match?copy(actions(match,seat)):[],deadlineAt:match?.deadlineAt??null};
  if(match){for(const key of ['activeSeat','dealer','round','roundWind','handNumber','honba','riichiPot','doraIndicators','lastDiscard'])if(match[key]!==undefined)state[key]=copy(match[key]);state.remainingTiles=match.liveWall?.length??match.wall?.length??0;
    if(['HAND_RESULT','MATCH_RESULT'].includes(match.phase))state.result=publicResult(match.result);
  }
  return state;
}
