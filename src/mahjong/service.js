import {randomBytes,randomInt,createHash,timingSafeEqual} from 'node:crypto';
import * as matchEngine from './match.js';
import {view} from './view.js';

export class MahjongError extends Error {constructor(code){super(code);this.code=code;}}
const fail=code=>{throw new MahjongError(code);};
const hash=token=>createHash('sha256').update(token).digest('hex');
const nameFor=value=>{if(typeof value!=='string')fail('BAD_NAME');const name=value.trim();if(!name||Array.from(name).length>20||/[\p{Cc}\p{Cf}]/u.test(name))fail('BAD_NAME');return name;};
const ACTION_ID_HISTORY=256;
export class MahjongService {
  constructor(store,{engine=matchEngine,now=Date.now,roomTtlMs=6*60*60*1000,seed=()=>randomInt(0x100000000),commandLimit=100}={}){
    this.store=store;this.engine=engine;this.now=now;this.roomTtlMs=roomTtlMs;this.seed=seed;this.commandLimit=commandLimit;this.limits=new Map();this.onChange=()=>{};
    const loaded=store.load(now());
    for(const room of loaded){
      let migrated=false;
      for(const ids of room.actionIds||[])if(Array.isArray(ids)&&ids.length>ACTION_ID_HISTORY){ids.splice(0,ids.length-ACTION_ID_HISTORY);migrated=true;}
      for(const player of room.players||[])if(player)player.connected=false;
      if(migrated)store.save(room);
    }
    this.rooms=new Map(loaded.map(room=>[room.code,room]));
  }
  get(code){const room=this.rooms.get(String(code));if(!room)fail('ROOM_NOT_FOUND');if(room.expiresAt<=this.now()){this.expire(room);fail('ROOM_NOT_FOUND');}return room;}
  expire(room){this.rooms.delete(room.code);this.store.remove(room.code);for(const key of this.limits.keys())if(key.startsWith(`${room.code}:`))this.limits.delete(key);this.onChange({...room,expired:true});}
  changed(room){if(room.match?.phase==='HAND_RESULT')room.handResultAt??=this.now();else delete room.handResultAt;this.store.save(room);this.onChange(room);}
  addPlayer(room,name){
    const used=new Set(room.players.filter(Boolean).map(p=>p.name));const base=name;let suffix=2;
    while(used.has(name)){const tail=` · ${suffix++}`;name=Array.from(base).slice(0,20-Array.from(tail).length).join('')+tail;}
    const token=randomBytes(32).toString('base64url'),empty=room.players.findIndex(player=>player===null),seat=empty<0?room.players.length:empty;
    room.players[seat]={seat,name,tokenHash:hash(token),ready:false,connected:false};room.actionIds[seat]=[];if(!Number.isInteger(room.hostSeat)||room.hostSeat<0)room.hostSeat=seat;this.changed(room);return{code:room.code,token,seat};
  }
  createRoom(value){const name=nameFor(value);if(this.rooms.size>=1000)fail('SERVER_FULL');let code;do{code=String(randomInt(10000)).padStart(4,'0');}while(this.rooms.has(code));const now=this.now();const room={code,createdAt:now,expiresAt:now+this.roomTtlMs,revision:0,hostSeat:null,players:[],actionIds:[],match:null};this.rooms.set(code,room);return this.addPlayer(room,name);}
  joinRoom(code,value){const name=nameFor(value),room=this.get(code);if(room.match)fail('NOT_LOBBY');if(room.players.filter(Boolean).length>=4)fail('ROOM_FULL');room.revision++;return this.addPlayer(room,name);}
  authenticate(code,token){const room=this.get(code);if(typeof token!=='string'||token.length>256)fail('BAD_SESSION');const digest=Buffer.from(hash(token),'hex');const seat=room.players.findIndex(p=>p&&timingSafeEqual(Buffer.from(p.tokenHash,'hex'),digest));if(seat<0)fail('BAD_SESSION');this.settle(room,this.now());return{room,seat};}
  view(room,seat){return view(room,seat,{actions:this.engine.legalActions});}
  connect(code,seat){const room=this.get(code);if(!room.players[seat])fail('BAD_SESSION');this.settle(room,this.now());room.players[seat].connected=true;this.changed(room);}
  disconnect(code,seat){const room=this.rooms.get(code);if(!room?.players[seat])return;room.players[seat].connected=false;this.changed(room);}
  command(code,seat,message){
    const room=this.get(code),reject=error=>({ok:false,error,actionId:message?.actionId,state:room.players[seat]?this.view(room,seat):undefined});
    if(!Number.isInteger(seat)||!room.players[seat])return reject('BAD_SESSION');
    if(!message||typeof message!=='object'||Array.isArray(message)||typeof message.action!=='string'||typeof message.actionId!=='string'||!message.actionId||message.actionId.length>100||!Number.isInteger(message.expectedRevision))return reject('BAD_COMMAND');
    if(message.seat!==undefined&&message.seat!==seat)return reject('BAD_SESSION');
    if(room.actionIds[seat].includes(message.actionId))return reject('DUPLICATE_ACTION');
    const now=this.now(),key=`${code}:${seat}`;let limit=this.limits.get(key);if(!limit||now-limit.at>=60000){limit={at:now,count:0};this.limits.set(key,limit);}if(++limit.count>this.commandLimit)return reject('RATE_LIMIT');
    this.settle(room,now);
    if(message.expectedRevision!==room.revision)return reject('STALE_STATE');
    try{
      if(message.action==='leave'){
        if(room.match&&room.match.phase!=='MATCH_RESULT')fail('NOT_LOBBY');if(room.match?.phase==='MATCH_RESULT'){room.match=null;for(const p of room.players)if(p)p.ready=false;}
        room.players[seat]=null;room.actionIds[seat]=null;
        if(room.hostSeat===seat){room.hostSeat=room.players.findIndex(Boolean);if(room.hostSeat<0)room.hostSeat=null;}
      }else if(message.action==='ready'){
        if(room.match)fail('NOT_LOBBY');if(typeof message.ready!=='boolean')fail('BAD_COMMAND');room.players[seat].ready=message.ready;
      }else if(message.action==='start'){
        if(seat!==room.hostSeat)fail('HOST_ONLY');if(room.match)fail('NOT_LOBBY');if(room.players.filter(Boolean).length!==4)fail('NEED_PLAYERS');if(!room.players.every(p=>p?.ready))fail('NOT_READY');
        room.match=this.engine.createMatch({players:room.players.map((p,i)=>({id:String(i),name:p.name,seat:i})),seed:typeof this.seed==='function'?this.seed():this.seed,now});
      }else if(message.action==='next'){
        if(room.match?.phase!=='HAND_RESULT')fail('BAD_PHASE');room.match=this.engine.advanceTurn(structuredClone(room.match),now);
      }else{
        if(!room.match)fail('NOT_PLAYING');
        const action=message.action==='play'?message.move:{type:message.action,...Object.fromEntries(['tile','tiles','kind','meld','choice'].filter(k=>message[k]!==undefined).map(k=>[k,message[k]]))};
        // Engines are pure; cloning also protects the room if a dependency rejects
        // after mutating its argument.
        room.match=this.engine.applyAction(structuredClone(room.match),seat,action,room.match.revision,now);
      }
    }catch(error){return reject(error.code||'ILLEGAL_ACTION');}
    room.revision++;if(room.actionIds[seat]){room.actionIds[seat].push(message.actionId);if(room.actionIds[seat].length>ACTION_ID_HISTORY)room.actionIds[seat].splice(0,room.actionIds[seat].length-ACTION_ID_HISTORY);}this.changed(room);return{ok:true,actionId:message.actionId,revision:room.revision,state:message.action==='leave'?null:this.view(room,seat)};
  }
  settle(room,now){
    const match=room.match;
    if(match?.phase==='HAND_RESULT'&&now>=(match.result?.at??room.handResultAt??now)+8000){room.match=this.engine.advanceTurn(structuredClone(match),now);room.revision++;this.changed(room);return;}
    if(!match||match.deadlineAt==null||now<match.deadlineAt||!['DISCARD','REACTION'].includes(match.phase))return;
    let next=structuredClone(match);
    if(next.phase==='DISCARD'){
      const choices=this.engine.legalActions(next,next.activeSeat);const action=choices.find(a=>a.type==='discard'&&a.tile===next.drawnTile)||choices.filter(a=>a.type==='discard').at(-1);
      if(!action)return;next=this.engine.applyAction(next,next.activeSeat,action,next.revision,now);
    }else{
      // Query legal actions after each pass: the final pass can resolve the call
      // window, so no further seat is allowed to operate in the new phase.
      for(let seat=0;seat<4&&next.phase==='REACTION';seat++)if(this.engine.legalActions(next,seat).some(a=>a.type==='pass'))next=this.engine.applyAction(next,seat,{type:'pass'},next.revision,now);
    }
    if(next.revision!==match.revision){room.match=next;room.revision++;this.changed(room);}
  }
  tick(){const now=this.now();for(const room of this.rooms.values()){if(room.expiresAt<=now)this.expire(room);else this.settle(room,now);}for(const[key,item]of this.limits)if(now-item.at>=60000)this.limits.delete(key);}
}
