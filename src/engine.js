import { randomBytes,randomInt,randomUUID,createHash,timingSafeEqual } from 'node:crypto';
import { modes } from './modes/index.js';
import { drawQuestion,pool,catalog } from './questions.js';
import { summarize } from './summary.js';
import {GameError} from './errors.js';
export {GameError} from './errors.js';
import {createEvent,executeEvent,tickEvent} from './events/flow.js';
import {eventView} from './events/view.js';
import {optionsFor} from './events/catalog.js';
const fail=code=>{throw new GameError(code);};
const hash=token=>createHash('sha256').update(token).digest('hex');
const TTL=24*3600000;
const validName=name=>{if(typeof name!=='string') fail('BAD_NAME');const value=name.replace(/[\u0000-\u001f\u007f]/g,'').replace(/\s+/g,' ').trim();if(!value||[...value].length>20) fail('BAD_NAME');return value;};
export function settingsFrom(input={}) {
  if(input.eventGame){const eventOptions=optionsFor(input.eventGame,input.eventOptions);return{mode:'MIX',depth:'LIGHT',category:'ALL',rounds:eventOptions.roundLimit,autoReveal:false,eventGame:input.eventGame,eventOptions};}
  const value={mode:input.mode||'MIX',depth:input.depth||'LIGHT',category:input.category||'ALL',rounds:input.rounds??12,autoReveal:input.autoReveal!==false};
  if(!['MIX',...Object.keys(modes)].includes(value.mode)||!['LIGHT','BALANCED','DEEP'].includes(value.depth)||!['ALL',...Object.keys(catalog.categories)].includes(value.category)||!Number.isInteger(value.rounds)||value.rounds<1||value.rounds>30) fail('BAD_SETTINGS');
  const count=Object.keys(modes).filter(m=>value.mode==='MIX'||m===value.mode).reduce((n,m)=>n+pool(value,m).length,0);
  if(!count) fail('EMPTY_POOL');
  value.rounds=Math.min(value.rounds,count);
  return value;
}
export class GameEngine {
  constructor(store,{now=()=>Date.now(),countdownMs=3000,hostGraceMs=12000}={}) {
    this.store=store;this.now=now;this.countdownMs=countdownMs;this.hostGraceMs=hostGraceMs;this.rooms=new Map();this.onChange=()=>{};
    for(const room of store.load()) {
      for(const p of Object.values(room.players)) {p.connected=false;p.disconnectedAt=this.now();}
      room.hostOfflineAt=this.now();
      if(room.phase==='COUNTDOWN') {room.phase='ANSWER';room.revealAt=null;}
      this.rooms.set(room.code,room);
    }
  }
  changed(room) {room.updatedAt=this.now();room.expiresAt=room.phase==='FINAL'?Math.min(room.expiresAt,this.now()+3600000):this.now()+TTL;this.store.save(room);this.onChange(room);}
  get(code) {const room=this.rooms.get(String(code));if(!room||room.expiresAt<=this.now()) fail('ROOM_NOT_FOUND');return room;}
  create(name,input) {
    validName(name);
    if(this.rooms.size>=500) fail('SERVER_FULL');
    const settings=settingsFrom(input);let code;
    for(let i=0;i<100;i++){const candidate=String(randomInt(1000,10000));if(!this.rooms.has(candidate)){code=candidate;break;}}
    if(!code) fail('SERVER_FULL');
    const room={code,players:{},hostId:null,settings,phase:'LOBBY',paused:false,round:null,history:[],used:[],index:0,createdAt:this.now(),updatedAt:this.now(),expiresAt:this.now()+TTL,startedAt:null,endedAt:null,revealAt:null,hostOfflineAt:null,notice:null};
    this.rooms.set(code,room);const session=this.join(code,name);room.hostId=session.playerId;this.changed(room);return session;
  }
  join(code,name) {
    const room=this.get(code);if(Object.values(room.players).filter(p=>!p.left).length>=24) fail('ROOM_FULL');
    const base=validName(name);const names=Object.values(room.players).map(p=>p.name);let final=base,n=2;
    while(names.includes(final)) final=`${base} · ${n++}`;
    const token=randomBytes(32).toString('hex'),id=randomUUID();
    room.players[id]={id,name:final,tokenHash:hash(token),ready:false,connected:false,left:false,joinedAt:this.now(),disconnectedAt:this.now()};
    this.changed(room);return {code:room.code,playerId:id,token};
  }
  authenticate(code,token) {
    if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)) fail('BAD_SESSION');
    const room=this.get(code),digest=Buffer.from(hash(token),'hex');
    const player=Object.values(room.players).find(p=>!p.left&&timingSafeEqual(Buffer.from(p.tokenHash,'hex'),digest));
    if(!player) fail('BAD_SESSION');return {room,player};
  }
  connect(code,id) {const room=this.get(code),p=room.players[id];if(!p||p.left) fail('BAD_SESSION');p.connected=true;p.disconnectedAt=null;if(room.hostId===id) room.hostOfflineAt=null;this.changed(room);}
  disconnect(code,id) {let room;try{room=this.get(code);}catch{return;}const p=room.players[id];if(!p) return;p.connected=false;p.disconnectedAt=this.now();if(room.hostId===id) room.hostOfflineAt=this.now();this.changed(room);}
  active(room) {return Object.values(room.players).filter(p=>p.connected&&p.ready&&!p.left);}
  beginRound(room) {
    const participants=this.active(room).map(p=>p.id);
    if(participants.length<2) fail('NEED_PLAYERS');
    const question=drawQuestion(room.settings,room.index,room.used);
    if(!question){this.finish(room);return;}
    const targetId=question.mode==='PREDICT' ? [...participants].sort((a,b)=>room.history.filter(h=>h.targetId===a).length-room.history.filter(h=>h.targetId===b).length)[0] : null;
    room.round={id:randomUUID(),question,participants,targetId,answers:{},result:null};
    room.used.push(question.id);room.phase='ANSWER';room.revealAt=null;room.paused=false;room.notice=null;
  }
  allAnswered(room) {return room.round&&room.round.participants.length>0&&room.round.participants.every(id=>Object.hasOwn(room.round.answers,id));}
  reveal(room) {if(!this.allAnswered(room)) fail('WAIT_ANSWERS');room.phase='COUNTDOWN';room.revealAt=this.now()+this.countdownMs;}
  finish(room) {room.phase='FINAL';room.paused=false;room.endedAt=this.now();room.expiresAt=this.now()+3600000;room.revealAt=null;}
  command(code,id,msg) {
    const room=this.get(code), before=structuredClone(room);
    try {this.execute(code,id,msg);} catch(error) {
      for(const key of Object.keys(room)) delete room[key];
      Object.assign(room,before);
      throw error;
    }
  }
  execute(code,id,msg) {
    const room=this.get(code),player=room.players[id];if(!player||player.left) fail('BAD_SESSION');
    const action=msg.action;
    if(action?.startsWith('event_')){executeEvent(room,id,msg,this.now());this.changed(room);return;}
    if(room.event&&room.phase==='EVENT'&&!['ready','leave'].includes(action))fail('BAD_PHASE');
    if(action==='ready'){if(typeof msg.ready!=='boolean')fail('BAD_COMMAND');player.ready=msg.ready;}
    else if(action==='answer') {
      if(room.phase!=='ANSWER'||room.paused) fail('NOT_ANSWERING');
      if(msg.roundId!==room.round.id) fail('STALE_ROUND');
      if(!room.round.participants.includes(id)) fail('SPECTATING');
      if(Object.hasOwn(room.round.answers,id)) fail('ALREADY_ANSWERED');
      let answer;
      if(msg.skip===true) answer={skip:true};
      else {try{answer={value:modes[room.round.question.mode].validate(room.round.question,msg.value)};}catch{fail('INVALID_ANSWER');}}
      room.round.answers[id]=answer;
      if(room.settings.autoReveal&&this.allAnswered(room)) this.reveal(room);
    } else if(action==='leave') {
      player.left=true;player.connected=false;player.ready=false;
      if(room.round?.participants.includes(id)&&room.phase==='ANSWER') {room.round.answers[id]||={skip:true};if(room.settings.autoReveal&&this.allAnswered(room))this.reveal(room);}
      if(room.hostId===id){room.hostOfflineAt=this.now()-this.hostGraceMs;this.transferHost(room);}
    } else {
      if(room.hostId!==id) fail('HOST_ONLY');
      switch(action) {
        case 'settings': if(room.phase!=='LOBBY') fail('NOT_LOBBY');room.settings=settingsFrom(msg.settings);break;
        case 'start': {
          if(room.phase!=='LOBBY') fail('NOT_LOBBY');
          const online=Object.values(room.players).filter(p=>p.connected&&!p.left);
          if(online.length<2)fail('NEED_PLAYERS');if(online.some(p=>!p.ready)) fail('NOT_READY');
          room.history=[];room.used=[];room.index=0;room.startedAt=this.now();room.endedAt=null;if(room.settings.eventGame){room.round=null;room.event=createEvent(room.settings.eventGame,room.settings.eventOptions);room.phase='EVENT';}else {room.event=null;this.beginRound(room);}break;
        }
        case 'reveal': if(room.phase!=='ANSWER'||room.paused)fail('NOT_ANSWERING');this.reveal(room);break;
        case 'next': if(room.phase!=='TALK'||room.paused) fail('NOT_TALK');room.index++;if(room.index>=room.settings.rounds)this.finish(room);else this.beginRound(room);break;
        case 'skip': if(!['ANSWER','TALK'].includes(room.phase)||room.paused)fail('BAD_PHASE');room.index++;if(room.index>=room.settings.rounds)this.finish(room);else this.beginRound(room);break;
        case 'change_question': if(room.phase!=='ANSWER'||room.paused)fail('NOT_ANSWERING');this.beginRound(room);room.notice='お題を変更しました。回答を選び直してください。';break;
        case 'category': {
          if(!['ANSWER','TALK'].includes(room.phase))fail('BAD_PHASE');
          const validated=settingsFrom({...room.settings,category:msg.category});
          room.settings.category=validated.category;break;
        }
        case 'pause': {
          if(!['ANSWER','COUNTDOWN','TALK'].includes(room.phase))fail('BAD_PHASE');
          room.paused=!room.paused;
          if(room.paused&&room.revealAt)room.remainingCountdown=Math.max(0,room.revealAt-this.now());
          if(!room.paused&&room.revealAt)room.revealAt=this.now()+(room.remainingCountdown??this.countdownMs);
          break;
        }
        case 'exclude_offline': {
          if(room.phase!=='ANSWER'||room.paused)fail('NOT_ANSWERING');
          for(const participant of room.round.participants) if(!room.players[participant]?.connected&&!Object.hasOwn(room.round.answers,participant))room.round.answers[participant]={skip:true};
          if(room.settings.autoReveal&&this.allAnswered(room))this.reveal(room);break;
        }
        case 'end': if(room.phase==='LOBBY')fail('BAD_PHASE');this.finish(room);break;
        case 'again': if(room.phase!=='FINAL')fail('BAD_PHASE');room.phase='LOBBY';room.event=null;room.round=null;room.paused=false;room.history=[];room.used=[];room.index=0;room.startedAt=null;room.endedAt=null;for(const p of Object.values(room.players))p.ready=false;break;
        default:fail('BAD_COMMAND');
      }
    }
    this.changed(room);
  }
  transferHost(room) {
    if(room.players[room.hostId]?.connected) return;
    const next=Object.values(room.players).filter(p=>p.connected&&!p.left).sort((a,b)=>a.joinedAt-b.joinedAt)[0];
    if(next){room.hostId=next.id;room.hostOfflineAt=null;room.notice=`${next.name}さんがホストを引き継ぎました。`;return true;}
    return false;
  }
  tick() {
    for(const room of this.rooms.values()) {
      if(room.expiresAt<=this.now()){this.rooms.delete(room.code);this.store.remove(room.code);this.onChange({...room,expired:true});continue;}
      let changed=tickEvent(room,this.now());
      if(room.hostOfflineAt!==null&&this.now()-room.hostOfflineAt>=this.hostGraceMs)changed=this.transferHost(room)||changed;
      if(room.phase==='COUNTDOWN'&&!room.paused&&this.now()>=room.revealAt){room.round.result=modes[room.round.question.mode].result(room.round.question,room.round,room.players);room.history.push(structuredClone(room.round));room.phase='TALK';room.revealAt=null;changed=true;}
      if(changed)this.changed(room);
    }
  }
  view(room,id) {
    const round=room.round;
    const own=round?.answers[id]||null;
    return {code:room.code,hostId:room.hostId,selfId:id,settings:room.settings,phase:room.phase,paused:room.paused,notice:room.notice,hostOffline:!room.players[room.hostId]?.connected,hostGraceMs:this.hostGraceMs,serverTime:this.now(),expiresAt:room.expiresAt,
      players:Object.values(room.players).filter(p=>!p.left).map(p=>({id:p.id,name:p.name,ready:p.ready,connected:p.connected,host:p.id===room.hostId,participating:round?.participants.includes(p.id)||false,answered:round?Object.hasOwn(round.answers,p.id):false})),
      progress:{current:room.index+1,total:room.settings.rounds,completed:room.history.length},
      round:round?{id:round.id,question:{id:round.question.id,mode:round.question.mode,category:round.question.category,depth:round.question.depth,question:round.question.question,choices:round.question.choices,talkPrompt:round.question.talkPrompt},targetId:round.targetId,participantCount:round.participants.length,answeredCount:round.participants.filter(pid=>Object.hasOwn(round.answers,pid)).length,ownAnswer:own,participating:round.participants.includes(id),revealAt:room.revealAt,result:room.phase==='TALK'||room.phase==='FINAL'?round.result:null}:null,
      event:eventView(room,id,this.now()),
      summary:!room.event&&room.phase==='FINAL'?summarize(room,id,this.now()):null};
  }
}
