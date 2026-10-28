// Original synthesis only; no commercial recordings or third-party audio.
export class Audio{
 constructor(){this.ctx=null;this.active=0;this.last=0;}
 async resume(settings){try{if(!this.ctx){this.ctx=new AudioContext();this.master=this.ctx.createDynamicsCompressor();this.master.threshold.value=-18;this.master.ratio.value=6;this.master.connect(this.ctx.destination);this.gains={};for(const key of ['bgm','se','ui','forecastVolume','resultVolume']){const gain=this.ctx.createGain();gain.connect(this.master);this.gains[key]=gain;}this.music();}this.volumes(settings);await this.ctx.resume();}catch{}}
 volumes(settings){if(!this.ctx)return;for(const k of ['bgm','se','ui','forecastVolume','resultVolume'])this.gains[k].gain.setTargetAtTime(settings[k],this.ctx.currentTime,.03);}
 tone(frequency,time,duration,gain,type='sine',channel='se'){if(!this.ctx||this.active>=16)return;const o=this.ctx.createOscillator(),v=this.ctx.createGain();o.type=type;o.frequency.value=frequency;v.gain.setValueAtTime(0,time);v.gain.linearRampToValueAtTime(gain,time+.005);v.gain.exponentialRampToValueAtTime(.0001,time+duration);o.connect(v);v.connect(this.gains[channel]);o.start(time);o.stop(time+duration+.01);this.active++;o.onended=()=>{o.disconnect();v.disconnect();this.active--;};}
 event(kind){if(!this.ctx||this.ctx.state!=='running')return;const now=this.ctx.currentTime;if(now-this.last<.025)return;this.last=now;
  if(kind==='card'){this.tone(1250,now,.07,.04,'triangle');this.tone(2700,now+.015,.05,.015);}
  else if(kind==='chip'){this.tone(2100,now,.055,.05);this.tone(3300,now,.035,.02);}
  else if(kind==='win'){for(const[i,f]of[392,494,587].entries())this.tone(f,now+i*.12,.3,.07,'sine','resultVolume');}
  else if(kind==='loss')this.tone(220,now,.18,.04,'sine','resultVolume');
  else if(kind==='tie'){this.tone(330,now,.18,.04,'sine','resultVolume');this.tone(440,now+.12,.2,.035,'sine','resultVolume');}
  else this.tone(640,now,.035,.025,'sine','ui');
 }
 hint(tier,kind){if(!this.ctx||this.ctx.state!=='running')return;const n={blue:0,green:2,red:4,rainbow:7}[tier]||0,now=this.ctx.currentTime;for(let i=0;i<(kind==='trace'?1:3);i++)this.tone(440*2**((n+i*4)/12),now+i*.09,.24,.045,'sine','forecastVolume');}
 rustle(){if(!this.ctx||this.ctx.state!=='running')return;const now=this.ctx.currentTime;if(now-(this.lastRustle||0)<.085)return;this.lastRustle=now;const buffer=this.ctx.createBuffer(1,Math.floor(this.ctx.sampleRate*.035),this.ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.018*(1-i/data.length);const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=1800;filter.Q.value=.6;source.buffer=buffer;source.connect(filter);filter.connect(this.gains.se);source.start();source.onended=()=>{source.disconnect();filter.disconnect();};}
 music(){const now=this.ctx.currentTime;for(const f of [98,146.832,196]){const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='sine';o.frequency.value=f;g.gain.value=.025;o.connect(g);g.connect(this.gains.bgm);o.start(now);}}
 suspend(){this.ctx?.suspend().catch(()=>{});}
}
