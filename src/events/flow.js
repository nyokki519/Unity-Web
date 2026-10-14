import {randomUUID,randomInt} from 'node:crypto';
import {fail} from '../errors.js';
import {eventQuestions,optionsFor,questionsFor,teamGame,guessGame,validateEventQuestion} from './catalog.js';
import {validateNarrative,collectGuessItems,openGuess,closeGuess,revealSolution,nextGuessItem,vote} from './guessing.js';
import {validateIndividual,individualResult} from './individual.js';
export function createEvent(gameId,options={},questions=eventQuestions){return{gameId,options:optionsFor(gameId,options),questions:structuredClone(questions),revision:0,phase:'RULES',roundId:randomUUID(),roundIndex:0,deadlineAt:null,answers:{},participants:[],teams:[],history:[],used:[],question:null,result:null};}
function rules(e){e.phase='RULES';e.roundId=randomUUID();e.deadlineAt=null;e.answers={};e.result=null;e.question=null;e.items=[];e.votes={};e.itemIndex=0;}
function end(room,now){room.event.phase='FINAL';room.event.deadlineAt=null;room.phase='FINAL';room.endedAt=now;room.expiresAt=now+3600000;}
export function executeEvent(room,id,msg,now){
 const e=room.event;if(!e)fail('BAD_PHASE');
 if(msg.roundId!==e.roundId)fail('STALE_ROUND');
 if(msg.action==='event_vote'){vote(e,id,msg,now);return;}
 if(msg.action==='event_answer'){
  if(e.phase!=='ANSWER'||now>=e.deadlineAt)fail('NOT_ANSWERING');if(!e.participants.includes(id))fail('SPECTATING');if(Object.hasOwn(e.answers,id))fail('ALREADY_ANSWERED');
  let value;if(!msg.skip){try{value=guessGame(e.gameId)?validateNarrative(e.gameId,msg.value):validateIndividual(e.question,msg.value);}catch{fail('INVALID_ANSWER');}}e.answers[id]=msg.skip?{skip:true}:{value};return;
 }
 if(room.hostId!==id)fail('HOST_ONLY');if(msg.revision!==e.revision)fail('STALE_STATE');
 switch(msg.action){
  case 'event_question':{
   if(e.phase!=='RULES')fail('BAD_PHASE');if(e.questions.length>=200&&!e.questions.some(q=>q.id===msg.question?.id))fail('BAD_SETTINGS');const q=validateEventQuestion(msg.question);const i=e.questions.findIndex(v=>v.id===q.id);if(i<0)e.questions.push(q);else e.questions[i]=q;break;
  }
  case 'event_begin':{
   if(e.phase!=='RULES')fail('BAD_PHASE');const players=Object.values(room.players).filter(p=>p.connected&&p.ready&&!p.left);if(players.length<2)fail('NEED_PLAYERS');
   const available=questionsFor(e,e.gameId).filter(q=>!e.used.includes(q.id));if(!available.length)fail('EMPTY_POOL');const q=msg.questionId?available.find(q=>q.id===msg.questionId):available[randomInt(available.length)];if(!q)fail('BAD_SETTINGS');
   e.question=structuredClone(q);e.used.push(q.id);e.participants=players.map(p=>p.id);e.phase=teamGame(e.gameId)?'CONSULT':'ANSWER';e.deadlineAt=now+e.options.seconds*1000;break;
  }
  case 'event_close':if(e.phase==='GUESS'){closeGuess(e);break;}if(!['ANSWER','CONSULT'].includes(e.phase))fail('BAD_PHASE');e.phase='CLOSED';e.deadlineAt=null;if(guessGame(e.gameId))e.items=collectGuessItems(e);break;
  case 'event_reveal':if(e.phase!=='CLOSED')fail('BAD_PHASE');if(guessGame(e.gameId)){e.items||=collectGuessItems(e);e.itemIndex=0;while(e.items[e.itemIndex]?.hidden)e.itemIndex++;if(e.itemIndex<e.items.length)openGuess(e,now);else e.phase='TALK';}else{e.result=individualResult(e.question,e.answers);e.phase='TALK';}e.history.push({gameId:e.gameId,questionId:e.question.id});break;
  case 'event_solution':revealSolution(e);break;
  case 'event_next_item':nextGuessItem(e,now);break;
  case 'event_hide':{
   if(!guessGame(e.gameId)||!['CLOSED','GUESS','GUESS_CLOSED','SOLUTION','TALK'].includes(e.phase))fail('BAD_PHASE');const item=e.items?.find(i=>i.id===msg.itemId);if(!item||item.hidden)fail('BAD_COMMAND');item.hidden=true;item.text='';item.title='';e.answers[item.ownerId]={hidden:true};if(e.items[e.itemIndex]?.id===item.id){e.phase='SOLUTION';e.deadlineAt=null;e.votes={};}break;
  }
  case 'event_next':if(e.phase!=='TALK')fail('BAD_PHASE');e.roundIndex++;if(e.roundIndex>=e.options.roundLimit)end(room,now);else rules(e);break;
  case 'event_end':end(room,now);break;
  case 'event_config':if(e.phase!=='RULES')fail('BAD_PHASE');e.options=optionsFor(e.gameId,msg.options);break;
  case 'event_switch':e.gameId=msg.gameId;e.options=optionsFor(msg.gameId,msg.options);e.roundIndex=0;rules(e);room.phase='EVENT';room.endedAt=null;break;
  default:fail('BAD_COMMAND');
 }
 e.revision++;
}
export function tickEvent(room,now){const e=room.event;if(!e)return false;if(['ANSWER','CONSULT','GUESS'].includes(e.phase)&&e.deadlineAt!==null&&now>=e.deadlineAt){if(e.phase==='GUESS')closeGuess(e);else{e.phase='CLOSED';e.deadlineAt=null;if(guessGame(e.gameId))e.items=collectGuessItems(e);}e.revision++;return true;}return false;}
