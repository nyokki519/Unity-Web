export class MachineAudio{
 constructor(){this.enabled=false;this.context=null;this.master=null;this.last=0;this.previousWing=0;this.previousCycle=-1;}
 async setEnabled(enabled){if(enabled){this.context??=new (window.AudioContext||window.webkitAudioContext)();if(!this.master){this.master=this.context.createGain();this.master.connect(this.context.destination);}await this.context.resume();}this.enabled=enabled;if(this.master)this.master.gain.setValueAtTime(enabled?1:0,this.context.currentTime);}
 tone(freq,at,duration=.06,gain=.045,type='sine'){const c=this.context,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,at);o.frequency.exponentialRampToValueAtTime(freq*.65,at+duration);g.gain.setValueAtTime(gain,at);g.gain.exponentialRampToValueAtTime(.0001,at+duration);o.connect(g);g.connect(this.master);o.start(at);o.stop(at+duration);}
 sync(game){const cycle=Math.floor(game.time/game.config.bat.period),active=[...game.physics.balls.values()].some(b=>b.body.translation().z>.05);if(!game.paused){if(game.wing>.01&&this.previousWing<=.01)this.play({type:'wing'});if(cycle!==this.previousCycle&&this.previousCycle>=0&&active)this.play({type:'drive'});}this.previousWing=game.wing;this.previousCycle=cycle;}
 play(e){if(!this.enabled||!this.context||this.context.state!=='running')return;const t=this.context.currentTime;
  if(e.type==='contact'){if(t-this.last<.05)return;this.last=t;this.tone(1900,t,.025,.014,'triangle');}
  if(e.type==='wing'){this.tone(220,t,.09,.025,'triangle');this.tone(310,t+.05,.06,.015);}
  if(e.type==='drive')this.tone(105,t,.07,.014,'sine');
  if(e.type==='shot')this.tone(310,t,.045,.04,'triangle');
  if(['starter','pickup','start'].includes(e.type))this.tone(720,t,.08,.04,'triangle');
  if(e.type==='attacker'){this.tone(1200,t,.045,.04);this.tone(1700,t+.045,.04,.025);}
  if(e.type==='jackpot')for(const [i,f]of [523,659,784,1046,1318].entries())this.tone(f,t+i*.10,.3,.07);
  if(e.type==='round')this.tone(440,t,.12,.04);
 }
}
