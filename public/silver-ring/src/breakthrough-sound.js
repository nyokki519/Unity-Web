// Original synthesized impact/sweep; no sampled audio or melody from an existing machine.
export function playBreakthrough(engine,tier=0){
 const c=engine.ctx;if(!c||engine.muted||(c.state==='suspended'&&typeof c.startRendering!=='function'))return false;
 const bursts=engine.breakthroughBursts??=[];const now=c.currentTime;
 if(bursts.length>=4){const oldest=bursts.shift();for(const v of oldest){v.gain.gain.cancelScheduledValues(now);v.gain.gain.setTargetAtTime(.0001,now,.006);v.osc.stop(now+.025);}}
 const voices=[];bursts.push(voices);const accent=1+Math.max(0,Math.min(2,tier))*.025;
 const voice=(type,start,peak,tail,volume,duration,delay=0)=>{
  const osc=c.createOscillator(),gain=c.createGain(),t=now+delay;osc.type=type;
  osc.frequency.setValueAtTime(start*accent,t);osc.frequency.exponentialRampToValueAtTime(peak*accent,t+.025);osc.frequency.exponentialRampToValueAtTime(tail*accent,t+duration);
  gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(volume,t+.004);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
  osc.connect(gain);gain.connect(engine.master);const entry={osc,gain};voices.push(entry);
  osc.onended=()=>{osc.disconnect();gain.disconnect();const index=voices.indexOf(entry);if(index>=0)voices.splice(index,1);if(!voices.length){const i=bursts.indexOf(voices);if(i>=0)bursts.splice(i,1);}};
  osc.start(t);osc.stop(t+duration+.02);
 };
 voice('square',1750,3400,640,.055,.58);voice('triangle',1150,2700,420,.10,.76,.012);voice('sine',3850,4500,970,.035,.48,.025);voice('sine',170,190,56,.13,.38,.045);
 return true;
}
