// Original modal/transient synthesis. No recorded or third-party sound assets.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function contactVoice(e){
 if(!e.touching||!(e.mass>0))return null;
 const normal=Math.max(0,e.normalSpeed||0),tangent=Math.max(0,e.tangentSpeed||0);
 const support=e.mass*9.80665/240;
 if(normal>.035&&e.impulse>support*1.35){const energy=.5*e.mass*normal*normal;return {kind:'impact',type:e.type,gain:clamp(Math.sqrt(energy/.012)*.045,.002,.075),duration:e.type==='dice'?.07:.16,brightness:clamp(normal/1.2,0,1)};}
 if(e.impulse>0&&tangent>.025)return {kind:'scrape',type:e.type,gain:clamp(Math.sqrt(tangent/.1)*.004,.001,.012),duration:.03,brightness:clamp(tangent,0,1)};
 return null;
}
export class MetalAudio{
 constructor(){this.enabled=false;this.paused=false;this.volume=.4;this.context=null;this.voices=new Set();this.lastByPair=new Map();this.stats={impacts:0,scrapes:0,dropped:0};}
 async setEnabled(value){
  if(value){
   if(!this.context){const C=window.AudioContext||window.webkitAudioContext;this.context=new C({latencyHint:'interactive'});const c=this.context;this.bus=c.createGain();this.compressor=c.createDynamicsCompressor();this.compressor.threshold.value=-18;this.compressor.knee.value=8;this.compressor.ratio.value=8;this.compressor.attack.value=.003;this.compressor.release.value=.08;this.output=c.createGain();this.bus.connect(this.compressor);this.compressor.connect(this.output);this.output.connect(c.destination);
    this.noise=c.createBuffer(1,Math.ceil(c.sampleRate*.04),c.sampleRate);const data=this.noise.getChannelData(0);let seed=9127;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/4294967296*2-1);}
   }
   await this.context.resume();if(this.context.state!=='running')throw new Error('音を開始できませんでした');
  }
  this.enabled=value;if(!value)this.stop();this.applyVolume();
 }
 setVolume(value){this.volume=clamp(Number(value)||0,0,.8);this.applyVolume();}
 applyVolume(){if(this.context)this.output.gain.setValueAtTime(this.enabled&&!this.paused?this.volume:0,this.context.currentTime);}
 setPaused(value){this.paused=value;if(value)this.stop();else if(this.enabled&&this.context?.state==='suspended')this.context.resume().catch(()=>{});this.applyVolume();}
 stop(){for(const voice of [...this.voices])voice.stop();this.lastByPair.clear();}
 consume(events){
  if(!this.enabled||this.paused||!this.volume||this.context?.state!=='running')return;
  const strongest=new Map();for(const e of events){const v=contactVoice(e);if(!v)continue;const key=e.pair;if(!strongest.has(key)||strongest.get(key).v.gain<v.gain)strongest.set(key,{v,e});}
  let count=0;for(const [key,{v,e}]of strongest){const now=this.context.currentTime;if(now-(this.lastByPair.get(key)??-1)<.035||count>=4||this.voices.size>=12){this.stats.dropped++;continue;}this.lastByPair.set(key,now);this.play(v,e);count++;}
 }
 play(v,e){
  const c=this.context,t=c.currentTime,gain=c.createGain(),sources=[];gain.gain.setValueAtTime(v.gain,t);gain.gain.exponentialRampToValueAtTime(.00001,t+v.duration);gain.connect(this.bus);
  const voice={stopping:false,stop:()=>{if(voice.stopping)return;voice.stopping=true;const now=c.currentTime;gain.gain.cancelScheduledValues(now);gain.gain.setTargetAtTime(.00001,now,.002);for(const s of sources){try{s.stop(now+.012);}catch{}}this.voices.delete(voice);setTimeout(()=>{for(const s of sources)s.disconnect();gain.disconnect();},25);}};this.voices.add(voice);
  if(v.kind==='scrape'){
   this.stats.scrapes++;const source=c.createBufferSource(),filter=c.createBiquadFilter();source.buffer=this.noise;filter.type='bandpass';filter.frequency.value=1100+v.brightness*1600;filter.Q.value=.7;source.connect(filter);filter.connect(gain);sources.push(source);source.onended=()=>{filter.disconnect();voice.stop();};source.start(t);source.stop(t+v.duration);
  }else{
   this.stats.impacts++;const root=e.type==='dice'?1350:340,partials=e.type==='dice'?[1,1.83,3.13]:[1,2.03,3.82,6.17];
   partials.forEach((ratio,i)=>{const o=c.createOscillator(),level=c.createGain();o.type='sine';o.frequency.value=root*ratio*(1+(e.id||0)*.009+v.brightness*.035);level.gain.value=1/(1+i*1.7)*(e.type==='rim'?(i===0?.5:1.4):1)*(e.points>=3&&i>1?.65:1);o.connect(level);level.connect(gain);sources.push(o);o.onended=()=>{level.disconnect();if(i===partials.length-1)voice.stop();};o.start(t);o.stop(t+v.duration);});
  }
 }
 dispose(){this.stop();this.context?.close().catch(()=>{});}
}
