import {payoutTier} from './motion.js';
// Original composed music + original short samples; all gain paths remain separate.
const ASSETS=new URL('./audio/',import.meta.url);
export class Audio{
 constructor(){this.ctx=null;this.active=0;this.last=0;this.lastEvents=new Map();this.samples=new Map();this.allowed=false;this.squeezing=false;}
 async resume(settings){try{
  if(!this.ctx){this.ctx=new AudioContext();this.master=this.ctx.createDynamicsCompressor();this.master.threshold.value=-14;this.master.ratio.value=4;this.master.connect(this.ctx.destination);this.gains={};for(const key of ['bgm','se','ui','forecastVolume','resultVolume']){const gain=this.ctx.createGain();gain.connect(this.master);this.gains[key]=gain;}this.music();this.loading=this.loadSamples();}
  this.allowed=true;this.volumes(settings);const resumed=this.ctx.resume();if(settings.bgm>0&&this.track.paused&&!document.hidden)this.track.play().catch(()=>{this.musicError=true;});await resumed;
 }catch{}}
 async loadSamples(){await Promise.allSettled(['win','reveal','preview-blue','preview-green','preview-red','preview-rainbow','chip','card','land','lock','third','result-2','result-3'].map(async name=>{const response=await fetch(new URL(name+'.mp3',ASSETS));if(!response.ok)throw Error('AUDIO');const buffer=await this.ctx.decodeAudioData(await response.arrayBuffer());this.samples.set(name,buffer);}));}
 volumes(settings){if(!this.ctx)return;for(const k of ['bgm','se','ui','forecastVolume','resultVolume'])this.gains[k].gain.setTargetAtTime(settings[k],this.ctx.currentTime,.03);if(settings.bgm<=0)this.track?.pause();else if(this.allowed&&this.ctx.state==='running'&&!document.hidden&&this.track?.paused)this.track.play().catch(()=>{this.musicError=true;});}
 sample(name,channel='se',gain=1){if(!this.ctx||this.ctx.state!=='running'||this.active>=20||!this.samples.has(name))return false;const source=this.ctx.createBufferSource(),level=this.ctx.createGain();source.buffer=this.samples.get(name);level.gain.value=gain;source.connect(level);level.connect(this.gains[channel]);this.active++;source.onended=()=>{source.disconnect();level.disconnect();this.active--;};source.start();return true;}
 tone(frequency,time,duration,gain,type='sine',channel='se'){if(!this.ctx||this.active>=20)return;const o=this.ctx.createOscillator(),v=this.ctx.createGain();o.type=type;o.frequency.value=frequency;v.gain.setValueAtTime(0,time);v.gain.linearRampToValueAtTime(gain,time+.005);v.gain.exponentialRampToValueAtTime(.0001,time+duration);o.connect(v);v.connect(this.gains[channel]);o.start(time);o.stop(time+duration+.01);this.active++;o.onended=()=>{o.disconnect();v.disconnect();this.active--;};}
 noise(duration,level,frequency){if(!this.ctx||this.active>=20)return;const n=Math.floor(this.ctx.sampleRate*duration),buffer=this.ctx.createBuffer(1,n,this.ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<n;i++)data[i]=(Math.random()*2-1)*level*Math.sin(Math.PI*i/n)**2;const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.65;source.buffer=buffer;source.connect(filter);filter.connect(this.gains.se);this.active++;source.onended=()=>{source.disconnect();filter.disconnect();this.active--;};source.start();}
 event(kind){if(!this.ctx||this.ctx.state!=='running')return;const now=this.ctx.currentTime;if(now-(this.lastEvents.get(kind)??-Infinity)<.025)return;this.lastEvents.set(kind,now);this.last=now;
  if(['card','land','chip','lock','third'].includes(kind)){
   if(!this.sample(kind,'se',kind==='third'?.55:kind==='chip'?.72:.8)){
    const f={card:1200,land:650,chip:2300,lock:900,third:1100}[kind];
    this.noise(kind==='third'?.3:kind==='lock'?.12:.065,kind==='third'?.025:.04,f);
    if(kind==='lock')this.tone(96,now,.16,.045,'sine');
   }
  }
  else if(kind==='win'){if(!this.sample('win','resultVolume',.85))for(const[i,f]of[523,659,784,988].entries())this.tone(f,now+i*.075,.35,.06,'sine','resultVolume');}
  else if(kind==='loss')this.tone(196,now,.13,.025,'sine','resultVolume');
  else if(kind==='tie'){this.tone(330,now,.18,.03,'sine','resultVolume');this.tone(494,now+.07,.22,.02,'sine','resultVolume');}
  else this.tone(700,now,.025,.015,'sine','ui');
 }
 roundResult(receipt){
  if(!this.ctx||this.ctx.state!=='running')return;
  const tier=payoutTier(receipt);
  // Result timing is independent of the shared UI/foley debounce.
  this.lastEvents.delete(tier?'win':receipt.net===0?'tie':'loss');this.last=-Infinity;this.event(tier?'win':receipt.net===0?'tie':'loss');
  if(tier>=2)this.sample('result-'+tier,'resultVolume',tier===3?.85:.72);
 }
 hint(tier,kind){if(!this.ctx||this.ctx.state!=='running')return;if(this.sample('preview-'+tier,'forecastVolume',kind==='trace'?.42:.7))return;const now=this.ctx.currentTime;this.tone({blue:659,green:784,red:988,rainbow:1175}[tier]||659,now,.3,.05,'sine','forecastVolume');}
 rustle(delta=.02,progress=.5){if(!this.ctx||this.ctx.state!=='running')return;const now=this.ctx.currentTime;if(now-(this.lastRustle||0)<.07)return;this.lastRustle=now;const speed=Math.min(1,Math.abs(delta)*20);this.noise(.035+speed*.035,.025+speed*.03,1100+progress*950);}
 openSqueeze(){this.squeezing=true;this.duck?.gain.setTargetAtTime(.43,this.ctx.currentTime,.2);}
 closeSqueeze(){this.squeezing=false;this.duck?.gain.setTargetAtTime(1,this.ctx.currentTime,.35);}
 music(){this.duck=this.ctx.createGain();this.duck.connect(this.gains.bgm);this.track=document.createElement('audio');this.track.id='baccarat-music';this.track.hidden=true;this.track.setAttribute('aria-hidden','true');this.track.loop=true;this.track.preload='auto';this.track.src=new URL('lounge-jazz.mp3',ASSETS).href;document.body.append(this.track);this.media=this.ctx.createMediaElementSource(this.track);this.media.connect(this.duck);}
 suspend(){this.allowed=false;this.track?.pause();this.ctx?.suspend().catch(()=>{});}
}
