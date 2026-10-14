import {randomInt,randomUUID} from 'node:crypto';
import {fail} from '../errors.js';
import {text} from './catalog.js';
export function validateNarrative(game,value){return game==='WHO'?text(value,120):{title:text(value?.title,40),text:text(value?.text,600)};}
export function collectGuessItems(e){
 const items=Object.entries(e.answers).filter(([,a])=>!a.skip&&!a.hidden).map(([ownerId,a])=>({id:randomUUID(),ownerId,title:typeof a.value==='string'?'':a.value.title,text:typeof a.value==='string'?a.value:a.value.text,hidden:false}));
 for(let i=items.length-1;i>0;i--){const j=randomInt(i+1);[items[i],items[j]]=[items[j],items[i]];}return items;
}
export function openGuess(e,now){e.phase='GUESS';e.deadlineAt=now+e.options.guessSeconds*1000;e.votes={};}
export function closeGuess(e){if(e.phase!=='GUESS')fail('BAD_PHASE');e.phase='GUESS_CLOSED';e.deadlineAt=null;}
export function revealSolution(e){if(e.phase!=='GUESS_CLOSED')fail('BAD_PHASE');e.phase='SOLUTION';}
export function nextGuessItem(e,now){if(e.phase!=='SOLUTION')fail('BAD_PHASE');do{e.itemIndex++;}while(e.items[e.itemIndex]?.hidden);if(e.itemIndex>=e.items.length){e.phase='TALK';e.deadlineAt=null;}else openGuess(e,now);}
export function vote(e,id,msg,now){
 if(e.phase!=='GUESS'||now>=e.deadlineAt)fail('BAD_PHASE');const item=e.items[e.itemIndex];if(item?.hidden||msg.itemId!==item?.id)fail('STALE_STATE');if(item.ownerId===id)fail('SELF_VOTE');if(!e.participants.includes(id))fail('SPECTATING');if(Object.hasOwn(e.votes,id))fail('ALREADY_VOTED');if(!msg.skip&&!e.participants.includes(msg.value))fail('INVALID_ANSWER');e.votes[id]=msg.skip?{skip:true}:{value:msg.value};
}
export function guessView(room,id){
 const e=room.event,item=e.items?.[e.itemIndex];if(!['GUESS','GUESS_CLOSED','SOLUTION'].includes(e.phase)||!item)return null;
 return{item:item.hidden?{id:item.id,hidden:true}:{id:item.id,title:item.title,text:item.text},index:e.itemIndex+1,total:e.items.length,canVote:!item.hidden&&item.ownerId!==id&&e.participants.includes(id)&&e.phase==='GUESS',ownVote:e.votes[id]||null,voteCount:Object.keys(e.votes).length,candidates:e.participants.map(pid=>({id:pid,name:room.players[pid].name})),solution:e.phase==='SOLUTION'&&!item.hidden?{id:item.ownerId,name:room.players[item.ownerId].name,correct:Object.values(e.votes).filter(v=>v.value===item.ownerId).length}:null,talkSeconds:e.gameId==='STORY'?120:45};
}
