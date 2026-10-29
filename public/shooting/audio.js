export class AudioEngine {
 constructor(){this.bgm=.25;this.se=.45;this.ctx=null;this.timer=null;this.note=0;this.theme='title';this.muted=false;}
 start(){if(!this.ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;this.ctx=new C();this.music=this.ctx.createGain();this.music.connect(this.ctx.destination);this.fx=this.ctx.createGain();this.fx.connect(this.ctx.destination)}this.ctx.resume();this.volumes(this.bgm,this.se);if(!this.timer)this.timer=setInterval(()=>this.step(),180)}
 volumes(bgm,se){this.bgm=Number(bgm);this.se=Number(se);if(this.ctx){this.music.gain.value=this.muted?0:this.bgm*.13;this.fx.gain.value=this.muted?0:this.se*.14}}
 tone(freq,len=.1,type='sine',gain=1,bus=this.fx){if(!this.ctx||!bus)return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(Math.max(.002,gain),t+.01);g.gain.exponentialRampToValueAtTime(.001,t+len);o.connect(g);g.connect(bus);o.onended=()=>{o.disconnect();g.disconnect()};o.start(t);o.stop(t+len+.02)}
 step(){if(!this.ctx||this.muted)return;const scales=({title:[0,7,10,14,12,7,3,10],stage:[0,3,7,12,10,7,5,3],boss:[0,1,7,6,0,10,7,3],final:[0,6,7,13,12,6,3,1],overdrive:[0,12,7,19,15,12,10,7]})[this.theme]||[0,7,10,14,12,7,3,10];const n=this.note++;this.tone(110*2**(scales[n%8]/12),.3,'triangle',.45,this.music);if(n%4===0)this.tone(55*2**([0,0,3,5][Math.floor(n/16)%4]/12),.65,'sine',.65,this.music);if(n%2===0)this.tone(880,.035,'triangle',.08,this.music)}
 // Bounded procedural foley; all cues originate in actual simulation events.
 sweep(from,to,len=.15,type='sine',gain=.4,delay=0){if(!this.ctx||this.muted)return;const t=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(Math.max(20,from),t);o.frequency.exponentialRampToValueAtTime(Math.max(20,to),t+len);g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(gain,t+.008);g.gain.exponentialRampToValueAtTime(.001,t+len);o.connect(g);g.connect(this.fx);o.onended=()=>{o.disconnect();g.disconnect()};o.start(t);o.stop(t+len+.02)}
 noise(len=.25,gain=.5,cutoff=900,delay=0){if(!this.ctx||this.muted)return;if(!this.noiseBuffer){this.noiseBuffer=this.ctx.createBuffer(1,this.ctx.sampleRate,this.ctx.sampleRate);const data=this.noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}const t=this.ctx.currentTime+delay,n=this.ctx.createBufferSource(),g=this.ctx.createGain(),f=this.ctx.createBiquadFilter();n.buffer=this.noiseBuffer;f.type='lowpass';f.frequency.setValueAtTime(cutoff,t);f.frequency.exponentialRampToValueAtTime(70,t+len);g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.001,t+len);n.connect(f);f.connect(g);g.connect(this.fx);n.onended=()=>{n.disconnect();f.disconnect();g.disconnect()};n.start(t);n.stop(t+len)}
 event(e){if(!this.ctx||this.muted)return;this.lastEvents??={};const now=this.ctx.currentTime,interval={shot:.065,hit:.07,graze:.1,explosion:.08,laser:.09,missile:.12,chain:.1}[e.type]||0;if(now-(this.lastEvents[e.type]??-99)<interval)return;this.lastEvents[e.type]=now;
  switch(e.type){
   case 'shot':{const id=e.weapon||0;if([4,5,6,7,9,19].includes(id))return;this.sweep([1250,1900,950,2200][id%4],450,.055,id===1?'triangle':'sine',.12);break;}
   case 'laser':this.sweep(2200,500,.13,'triangle',.2);break;
   case 'missile':this.noise(.18,.24,2100);this.sweep(180,70,.2,'sawtooth',.13);break;
   case 'chain':this.sweep(1700,340,.09,'square',.13);break;
   case 'explosion':case 'part':this.noise(e.boss?.9:.3,.65,e.boss?2100:1300);this.sweep(e.boss?100:180,28,e.boss?.8:.22,'sine',.8);if(e.boss)for(let j=1;j<5;j++)this.noise(.22,.4,1500,j*.14);break;
   case 'bomb':this.sweep(150,850,.17,'triangle',.45);this.noise(.8,.9,3000,.18);this.sweep(90,24,.9,'sine',1,.18);break;
   case 'item':case 'evolve':for(let j=0;j<3;j++)this.sweep(740*2**(j/3),840*2**(j/3),.12,'sine',.25,j*.055);break;
   case 'hit':this.noise(.1,e.player?.7:.15,1800);if(e.player)this.sweep(380,80,.2,'sawtooth',.4);break;
   case 'graze':this.sweep(1700,2500,.04,'sine',.1);break;
   case 'boss':this.theme='boss';this.sweep(90,180,.6,'sawtooth',.4);break;
   case 'warning':this.sweep(440,330,.2,'triangle',.3);break;
   case 'clear':this.theme='title';for(let j=0;j<4;j++)this.sweep(523*2**([0,4,7,12][j]/12),523*2**([0,4,7,12][j]/12),.3,'triangle',.4,j*.12);break;
   case 'special':case 'overdrive':this.sweep(140,1100,.35,'triangle',.5);break;
   case 'gameover':this.sweep(360,45,.7,'triangle',.5);break;
  }
 }
 suspend(){this.muted=true;this.volumes(this.bgm,this.se)}resume(){this.muted=false;this.start()} }
