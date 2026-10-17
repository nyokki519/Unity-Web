// User-provided recordings, trimmed at documented boundaries. No autoplay.
const SOURCES={breakthrough:new URL('../audio/breakthrough.mp3',import.meta.url).href,jackpot:new URL('../audio/jackpot.mp3',import.meta.url).href};
export class RecordedSounds{
 constructor({fetcher=globalThis.fetch?.bind(globalThis)}={}){this.fetcher=fetcher;this.status='idle';this.buffers={};this.active={breakthrough:new Set(),jackpot:new Set()};this.playCount={breakthrough:0,jackpot:0};}
 preload(){
  if(!this.bytesPromise)this.bytesPromise=Promise.all(Object.entries(SOURCES).map(async([role,url])=>{const response=await this.fetcher(url);if(!response.ok)throw Error(`Audio asset ${role}: ${response.status}`);return[role,await response.arrayBuffer()];}));
  return this.bytesPromise;
 }
 prepare(ctx){
  if(this.status==='ready')return Promise.resolve(true);if(this.preparing)return this.preparing;
  this.status='loading';
  this.preparing=this.preload().then(async bytes=>{const decoded=await Promise.all(bytes.map(async([role,data])=>[role,await ctx.decodeAudioData(data.slice(0))]));this.buffers=Object.fromEntries(decoded);this.status='ready';return true;}).catch(()=>{this.status='error';this.bytesPromise=null;return false;}).finally(()=>{this.preparing=null;});return this.preparing;
 }
 play(role,ctx,destination){
  const buffer=this.buffers[role],active=this.active[role];if(!buffer||!active||!ctx||ctx.state==='closed'||ctx.state==='suspended')return false;
  const limit=role==='jackpot'?1:4;
  while(active.size>=limit){const old=active.values().next().value;active.delete(old);old.gain.gain.setTargetAtTime(.0001,ctx.currentTime,.005);old.source.stop(ctx.currentTime+.025);}
  const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;gain.gain.value=role==='jackpot'?.65:.58;source.connect(gain);gain.connect(destination);
  const voice={source,gain};active.add(voice);source.onended=()=>{active.delete(voice);source.disconnect();gain.disconnect();};source.start(ctx.currentTime);this.playCount[role]++;return true;
 }
}
