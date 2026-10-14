import {teamGameView} from './team-games.js';
import {games,teamGame} from './catalog.js';
import {guessView} from './guessing.js';

export function eventView(room,id,now){
 const e=room.event;if(!e)return null;
 const grouped=teamGame(e.gameId),team=e.teams.find(t=>t.memberIds.includes(id)),answerKey=grouped?team?.id:id;
 let own=e.passes?.[id]||e.answers[answerKey]||null;
 if(grouped&&own?.value!==undefined&&e.submittedBy?.[answerKey]!==id&&(!e.result||!['TALK','FINAL'].includes(e.phase)))own={teamSubmitted:true};
 return{gameId:e.gameId,name:games[e.gameId].name,rule:games[e.gameId].rule,phase:e.phase,revision:e.revision,roundId:e.roundId,roundIndex:e.roundIndex,options:e.options,question:e.question,deadlineAt:e.deadlineAt,serverTime:now,participating:e.participants.includes(id),...teamGameView(room,id),ownAnswer:own,answeredCount:Object.keys(e.answers).length,participantCount:grouped?e.teams.length:e.participants.length,result:e.phase==='TALK'?e.result:null,guess:guessView(room,id),
  teamModeration:room.hostId===id&&e.phase==='CLOSED'&&grouped?e.teams.map(t=>({id:t.id,name:t.name,answer:e.answers[t.id]||{missing:true}})):[],
  moderation:room.hostId===id&&e.phase==='CLOSED'?e.items?.filter(i=>!i.hidden).map(i=>({id:i.id,title:i.title,text:i.text}))||[]:[],used:e.used,completed:e.history.length,questions:room.hostId===id&&e.phase==='RULES'?e.questions:null};
}
