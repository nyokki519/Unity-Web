import {assignTeams,prepareTeams,refreshCaptains,captainTeam} from './teams.js';
import {validateTeamAnswer,teamResult} from './team-games.js';
import {randomUUID,randomInt} from 'node:crypto';
import {fail} from '../errors.js';
import {eventQuestions,optionsFor,questionsFor,teamGame,guessGame,validateEventQuestion} from './catalog.js';
import {validateNarrative,collectGuessItems,openGuess,closeGuess,revealSolution,nextGuessItem,vote} from './guessing.js';
import {validateIndividual,individualResult} from './individual.js';
export function createEvent(gameId,options={},questions=eventQuestions){return{gameId,options:optionsFor(gameId,options),questions:structuredClone(questions),revision:0,phase:'RULES',roundId:randomUUID(),roundIndex:0,deadlineAt:null,answers:{},passes:{},submittedBy:{},participants:[],teams:[],history:[],used:[],question:null,result:null};}
function rules(e){e.phase='RULES';e.roundId=randomUUID();e.deadlineAt=null;e.answers={};e.passes={};e.submittedBy={};e.result=null;e.question=null;e.items=[];e.votes={};e.itemIndex=0;}
function end(room,now){room.event.phase='FINAL';room.event.deadlineAt=null;room.phase='FINAL';room.endedAt=now;room.expiresAt=now+3600000;}
export function executeEvent(room,id,msg,now){
 const e=room.event;if(!e)fail('BAD_PHASE');
 if(msg.roundId!==e.roundId)fail('STALE_ROUND');
 if(msg.action==='event_vote'){vote(e,id,msg,now);return;}
 if(msg.action==='event_cafe_draft'){
  if(e.gameId!=='CAFE'||e.phase!=='CONSULT'||now>=e.deadlineAt)fail('BAD_PHASE');if(!e.participants.includes(id))fail('SPECTATING');const t=captainTeam(room,id);if(e.answers[t.id])fail('ALREADY_ANSWERED');t.draft=validateTeamAnswer(e.gameId,e.question,msg.value,true);return;
 }
 if(msg.action==='event_answer'){
  if(!['ANSWER','CONSULT'].includes(e.phase)||now>=e.deadlineAt)fail('NOT_ANSWERING');if(!e.participants.includes(id))fail('SPECTATING');if(teamGame(e.gameId)&&msg.skip&&e.teams.find(t=>t.memberIds.includes(id))?.captainId!==id){if(e.passes?.[id])fail('ALREADY_ANSWERED');(e.passes||={})[id]={skip:true};return;}const key=teamGame(e.gameId)?captainTeam(room,id).id:id;if(Object.hasOwn(e.answers,key))fail('ALREADY_ANSWERED');
  let value;if(!msg.skip){try{value=teamGame(e.gameId)?validateTeamAnswer(e.gameId,e.question,msg.value):guessGame(e.gameId)?validateNarrative(e.gameId,msg.value):validateIndividual(e.question,msg.value);}catch(error){if(error.code==='BUDGET_EXCEEDED')throw error;fail('INVALID_ANSWER');}}e.answers[key]=msg.skip?{skip:true}:{value};if(teamGame(e.gameId))(e.submittedBy||={})[key]=id;return;
 }
 if(room.hostId!==id)fail('HOST_ONLY');if(msg.revision!==e.revision)fail('STALE_STATE');
 switch(msg.action){
  case 'event_teams':if(e.phase!=='RULES')fail('BAD_PHASE');e.teams=assignTeams(room,msg.count,msg.assignments);e.options.teamCount=msg.count;break;
  case 'event_kick':{const p=room.players[msg.playerId];if(!p||p.left||p.id===room.hostId)fail('BAD_COMMAND');p.left=true;p.connected=false;p.ready=false;refreshCaptains(room);break;}
  case 'event_approve':if(e.phase!=='TALK'||e.gameId!=='QUEST')fail('BAD_PHASE');{const t=e.result.teams.find(t=>t.id===msg.teamId);if(!t)fail('BAD_COMMAND');t.approved=true;}break;
  case 'event_question':{
   if(e.phase!=='RULES')fail('BAD_PHASE');if(e.questions.length>=200&&!e.questions.some(q=>q.id===msg.question?.id))fail('BAD_SETTINGS');const q=validateEventQuestion(msg.question);const i=e.questions.findIndex(v=>v.id===q.id);if(i<0)e.questions.push(q);else e.questions[i]=q;break;
  }
  case 'event_begin':{
   if(e.phase!=='RULES')fail('BAD_PHASE');const players=Object.values(room.players).filter(p=>p.connected&&p.ready&&!p.left);if(players.length<2)fail('NEED_PLAYERS');
   const available=questionsFor(e,e.gameId).filter(q=>!e.used.includes(q.id));if(!available.length)fail('EMPTY_POOL');const q=msg.questionId?available.find(q=>q.id===msg.questionId):available[randomInt(available.length)];if(!q)fail('BAD_SETTINGS');
   e.question=structuredClone(q);e.used.push(q.id);e.participants=players.map(p=>p.id);if(teamGame(e.gameId))prepareTeams(room);e.phase=teamGame(e.gameId)?'CONSULT':'ANSWER';e.deadlineAt=now+e.options.seconds*1000;break;
  }
  case 'event_close':if(e.phase==='GUESS'){closeGuess(e);break;}if(!['ANSWER','CONSULT'].includes(e.phase))fail('BAD_PHASE');e.phase='CLOSED';e.deadlineAt=null;if(guessGame(e.gameId))e.items=collectGuessItems(e);break;
  case 'event_reveal':if(e.phase!=='CLOSED')fail('BAD_PHASE');if(guessGame(e.gameId)){e.items||=collectGuessItems(e);e.items=e.items.filter(i=>!i.hidden).slice(0,e.options.itemLimit);e.itemIndex=0;while(e.items[e.itemIndex]?.hidden)e.itemIndex++;if(e.itemIndex<e.items.length)openGuess(e,now);else e.phase='TALK';}else{e.result=teamGame(e.gameId)?teamResult(e):individualResult(e.question,e.answers);e.phase='TALK';}e.history.push({gameId:e.gameId,questionId:e.question.id});break;
  case 'event_solution':revealSolution(e);break;
  case 'event_next_item':nextGuessItem(e,now);break;
  case 'event_hide':{
   if(teamGame(e.gameId)){if(!['CLOSED','TALK'].includes(e.phase))fail('BAD_PHASE');const t=e.teams.find(t=>t.id===msg.teamId);if(!t||!e.answers[t.id])fail('BAD_COMMAND');e.answers[t.id]={hidden:true};t.draft=null;if(e.result){const approvals=new Map(e.result.teams.map(t=>[t.id,t.approved]));e.result=teamResult(e);for(const row of e.result.teams)row.approved=approvals.get(row.id)||false;}break;}
   if(!guessGame(e.gameId)||!['CLOSED','GUESS','GUESS_CLOSED','SOLUTION','TALK'].includes(e.phase))fail('BAD_PHASE');const item=e.items?.find(i=>i.id===msg.itemId);if(!item||item.hidden)fail('BAD_COMMAND');item.hidden=true;item.text='';item.title='';e.answers[item.ownerId]={hidden:true};if(['GUESS','GUESS_CLOSED','SOLUTION'].includes(e.phase)&&e.items[e.itemIndex]?.id===item.id){e.phase='SOLUTION';e.deadlineAt=null;e.votes={};}break;
  }
  case 'event_next':if(e.phase!=='TALK')fail('BAD_PHASE');e.roundIndex++;if(e.roundIndex>=e.options.roundLimit)end(room,now);else rules(e);break;
  case 'event_end':end(room,now);break;
  case 'event_config':if(e.phase!=='RULES')fail('BAD_PHASE');e.options=optionsFor(e.gameId,msg.options);break;
  case 'event_switch':e.gameId=msg.gameId;e.options=optionsFor(msg.gameId,msg.options);e.roundIndex=0;rules(e);room.phase='EVENT';room.endedAt=null;break;
  default:fail('BAD_COMMAND');
 }
 e.revision++;
}
export function tickEvent(room,now){const e=room.event;if(!e)return false;let changed=refreshCaptains(room);if(changed)e.revision++;if(['ANSWER','CONSULT','GUESS'].includes(e.phase)&&e.deadlineAt!==null&&now>=e.deadlineAt){if(e.phase==='GUESS')closeGuess(e);else{e.phase='CLOSED';e.deadlineAt=null;if(guessGame(e.gameId))e.items=collectGuessItems(e);}e.revision++;return true;}return changed;}
