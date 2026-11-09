import {teamGameView} from './team-games.js';
import {games,teamGame} from './catalog.js';
import {guessView} from './guessing.js';

export function eventView(room,id,now){
 const e=room.event;if(!e)return null;
 const grouped=teamGame(e.gameId),team=e.teams.find(t=>t.memberIds.includes(id)),answerKey=grouped?team?.id:id;
 let own=e.passes?.[id]||e.answers[answerKey]||null;
 if(grouped&&own?.value!==undefined&&e.submittedBy?.[answerKey]!==id&&(!e.result||!['TALK','FINAL'].includes(e.phase)))own={teamSubmitted:true};
 const publicTruth=['TALK','FINAL'].includes(e.phase),revealRooms=['CLOSED','REVEAL','TALK','FINAL'].includes(e.phase),question=e.question&&e.gameId==='RATING'?((({correct,explanation,source,...publicQuestion})=>publicTruth?{...publicQuestion,correct,explanation}:{...publicQuestion})(e.question)):e.question;
 let waitingRooms=null,distribution=null;if(e.gameId==='RATING'&&revealRooms){distribution={A:0,B:0};waitingRooms={A:[],B:[]};for(const playerId of e.participants){const choice=e.answers[playerId]?.value?.choice;if(choice){distribution[choice]++;waitingRooms[choice].push(room.players[playerId]?.name||'参加者');}}}
 return{gameId:e.gameId,name:games[e.gameId].name,rule:games[e.gameId].rule,phase:e.phase,revision:e.revision,roundId:e.roundId,roundIndex:e.roundIndex,options:e.options,question,deadlineAt:e.deadlineAt,revealAt:e.gameId==='RATING'&&e.phase==='REVEAL'?e.revealAt:null,serverTime:now,participating:e.participants.includes(id),...teamGameView(room,id),ownAnswer:own,answeredCount:Object.keys(e.answers).length+(grouped?0:Object.keys(e.passes||{}).length),participantCount:grouped?e.teams.length:e.participants.length,result:(e.phase==='TALK'||e.phase==='FINAL')?e.result:null,waitingRooms,distribution,categoryLabel:e.gameId==='RATING'?(e.categoryLabel||e.question?.category):null,guess:guessView(room,id),
  teamModeration:room.hostId===id&&e.phase==='CLOSED'&&grouped?e.teams.map(t=>({id:t.id,name:t.name,answer:e.answers[t.id]||{missing:true}})):[],
  moderation:room.hostId===id&&e.phase==='CLOSED'?e.items?.filter(i=>!i.hidden).map(i=>({id:i.id,title:i.title,text:i.text}))||[]:[],used:e.used,completed:e.history.length,questions:room.hostId===id&&e.phase==='RULES'?(e.gameId==='RATING'?e.questions.map(({correct,explanation,source,...publicQuestion})=>publicQuestion):e.questions):null};
}
