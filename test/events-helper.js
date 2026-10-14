import {GameEngine} from '../src/engine.js';
import {RoomStore} from '../src/store.js';
export function fixture(n=6,game='BOUNDARY'){
 let now=Date.now();const store=new RoomStore(':memory:'),engine=new GameEngine(store,{now:()=>now});
 const host=engine.create('司会',{eventGame:game,eventOptions:{roundLimit:2}}),sessions=[host];
 for(let i=1;i<n;i++)sessions.push(engine.join(host.code,`参加者${i}`));
 for(const s of sessions){engine.connect(s.code,s.playerId);engine.command(s.code,s.playerId,{action:'ready',ready:true});}
 const room=engine.get(host.code);
 const cmd=(action,data={},who=host)=>engine.command(host.code,who.playerId,{action,roundId:room.event?.roundId,revision:room.event?.revision,...data});
 cmd('start');return{store,engine,host,sessions,room,cmd,advance:ms=>{now+=ms;engine.tick();}};
}
