import {randomBytes,randomUUID} from 'node:crypto';
import {fail} from './errors.js';
import {sliderScale} from '../public/js/scale.js';

// CPU participants are server-owned test fixtures, never authenticated clients.
export function configureCpu(room,msg){
 if(room.phase!=='LOBBY')fail('NOT_LOBBY');
 if(msg.action==='cpu_clear'){
  for(const [id,p] of Object.entries(room.players))if(p.cpu)delete room.players[id];
  delete room.cpuTurn;return;
 }
 const active=Object.values(room.players).filter(p=>!p.left);
 const target=Object.hasOwn(msg,'total');
 if(target?(!Number.isInteger(msg.total)||msg.total<2||msg.total>24||Object.hasOwn(msg,'count')):(!Number.isInteger(msg.count)||msg.count<1||msg.count>23))fail('BAD_SETTINGS');
 if(target&&active.filter(p=>!p.cpu).length>msg.total)fail('BAD_SETTINGS');
 const delta=target?msg.total-active.length:msg.count;
 if(delta<0){for(const p of active.filter(p=>p.cpu).slice(delta))delete room.players[p.id];return;}
 const count=delta;
 if(active.length+count>24)fail('ROOM_FULL');
 for(let i=0;i<count;i++){
  let n=1;while(Object.values(room.players).some(p=>p.name===`CPU ${String(n).padStart(2,'0')}`))n++;
  const id=randomUUID();room.players[id]={id,name:`CPU ${String(n).padStart(2,'0')}`,cpu:true,tokenHash:randomBytes(32).toString('hex'),ready:true,connected:true,left:false,joinedAt:room.updatedAt,disconnectedAt:null};
 }
}
function numericAnswer(q,index){const s=sliderScale(q),ticks=Math.round((s.max-s.min)/s.step);return Number((s.min+Math.round(ticks*(index%7)/6)*s.step).toPrecision(15));}
function ranked(q,index){const ids=q.choices.map(c=>c.id),offset=index%ids.length,result=[...ids.slice(offset),...ids.slice(0,offset)];return index%2?result.reverse():result;}
function response(q,mode,index){
 if(['ALIGN','PREDICT'].includes(mode))return{value:index%2?'b':'a'};
 if(['LINE','BOUNDARY'].includes(mode))return{value:numericAnswer(q,index)};
 if(['RANK','VALUES'].includes(mode))return{value:ranked(q,index)};
 if(mode==='AUCTION'){const ids=ranked(q,index),base=Math.floor(100/ids.length),extra=100%ids.length;return{value:Object.fromEntries(ids.map((id,i)=>[id,base+(i<extra?1:0)]))};}
 if(mode==='STORY')return{value:{title:`CPUの架空体験 ${index+1}`,text:`【CPUテスト回答】「${q.prompt}」を表示する動作確認用の架空の体験談です。カフェに出かけて席を探していたとき、思いがけず隣の人と話すきっかけができました。何気ない会話が楽しかった、というサンプルです。実在の参加者の体験ではありません。`}};
 if(mode==='QUEST')return{value:`【CPUテスト回答 ${index+1}】カフェでゆっくり過ごすのが好き、という架空の共通点です。`};
 if(mode==='CAFE'){
  const selection=Object.fromEntries(q.categories.map(c=>[c.id,[...c.options].sort((a,b)=>a.cost-b.cost)[0].id]));
  const cost=q.categories.reduce((sum,c)=>sum+c.options.find(o=>o.id===selection[c.id]).cost,0);
  return cost>q.budget?{skip:true}:{value:{name:`CPUカフェ ${index+1}`,concept:'【CPUテスト回答】費用と公開の動作を確認するための架空のカフェ案です。',selection}};
 }
 return{value:`【CPUテスト回答 ${index+1}】${(q.question||q.prompt).slice(0,40)}の表示・送信を確認するサンプルです。`};
}
export function tickCpu(engine,room,now){
 const players=Object.values(room.players),bots=players.filter(p=>p.cpu&&p.connected&&p.ready&&!p.left);
 if(!bots.length||room.paused||!players.some(p=>!p.cpu&&p.connected&&!p.left))return false;
 const e=room.event,event=room.phase==='EVENT'&&e;
 if(!event&&room.phase!=='ANSWER')return false;
 if(event&&!['ANSWER','CONSULT','GUESS'].includes(e.phase))return false;
 if(event&&now>=e.deadlineAt)return false;
 const item=event&&e.phase==='GUESS'?e.items[e.itemIndex]:null;
 const key=event?`${e.roundId}:${e.phase}:${item?.id||''}`:room.round.id;
 let changed=false;
 if(room.cpuTurn?.key!==key){room.cpuTurn={key,since:now};changed=true;}
 for(const [index,p] of bots.entries()){
  if(now-room.cpuTurn.since<700+index*100)continue;
  let action,data;
  if(!event){if(!room.round.participants.includes(p.id)||Object.hasOwn(room.round.answers,p.id)||room.phase!=='ANSWER')continue;action='answer';data={roundId:room.round.id,...response(room.round.question,room.round.question.mode,index)};}
  else{
   if(!e.participants.includes(p.id))continue;
   if(e.phase==='GUESS'){
    if(!item||item.hidden||item.ownerId===p.id||Object.hasOwn(e.votes,p.id))continue;
    const candidates=e.participants.filter(id=>id!==p.id);if(!candidates.length)continue;
    action='event_vote';data={itemId:item.id,value:candidates[index%candidates.length]};
   }else{
    if(['QUEST','CAFE'].includes(e.gameId)){
     const t=e.teams.find(t=>t.captainId===p.id);
     if(!t||Object.hasOwn(e.answers,t.id)||t.memberIds.some(id=>room.players[id]&&!room.players[id].cpu&&!room.players[id].left))continue;
    }else if(Object.hasOwn(e.answers,p.id))continue;
    action='event_answer';data=response(e.question,e.gameId,index);
   }
   data={roundId:e.roundId,revision:e.revision,...data};
  }
  // Run the same validation, deadline, privacy and duplicate checks as a person.
  try{engine.command(room.code,p.id,{action,...data});}
  catch(error){
   if(['INVALID_ANSWER','BUDGET_EXCEEDED'].includes(error.code)){engine.command(room.code,p.id,{action,...data,skip:true});return changed;}
   if(['NOT_ANSWERING','BAD_PHASE','STALE_ROUND','STALE_STATE','ALREADY_ANSWERED','ALREADY_VOTED','SPECTATING','CAPTAIN_ONLY'].includes(error.code))return changed;
   throw error;
  }
 }
 return changed;
}
