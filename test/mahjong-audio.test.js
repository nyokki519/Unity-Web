import test from 'node:test';
import assert from 'node:assert/strict';
import {createMahjongSound} from '../public/mahjong/src/sound.js';

function fakeAudioContext(){
 const calls=[];
 const context={state:'running',currentTime:1,destination:{},calls,
  resume(){this.state='running';return Promise.resolve();},
  createOscillator(){
   const oscillator={type:'sine',frequency:{setValueAtTime(value,at){calls.push(['frequency',value,at]);},exponentialRampToValueAtTime(value,at){calls.push(['frequencyRamp',value,at]);}},connect(){},start(at){calls.push(['start',at]);},stop(at){calls.push(['stop',at]);}};
   calls.push(['oscillator',oscillator]);return oscillator;
  },
  createGain(){
   const gain={gain:{setValueAtTime(value,at){calls.push(['gain',value,at]);},exponentialRampToValueAtTime(value,at){calls.push(['gainRamp',value,at]);}},connect(){}};
   calls.push(['gainNode',gain]);return gain;
  }
 };
 return context;
}

test('Mahjong cues require a gesture, route distinct action patterns, and honor mute',()=>{
 const context=fakeAudioContext(),sound=createMahjongSound({audioContextFactory:()=>context});
 for(const name of ['draw','discard','call','riichi','win','loss','result'])assert.equal(sound.cue(name),false,name);
 assert.equal(sound.enableFromGesture(),true);
 const routes={};
 for(const name of ['draw','discard','call','riichi','win','loss','result']){
  context.currentTime+=1;
  const before=context.calls.filter(call=>call[0]==='oscillator').length;
  assert.equal(sound.cue(name),true,name);
  routes[name]=context.calls.filter(call=>call[0]==='oscillator').length-before;
 }
 assert.deepEqual(Object.keys(routes),['draw','discard','call','riichi','win','loss','result']);
 assert.ok(new Set(Object.values(routes)).size>1,'cue patterns should use different note counts');
 sound.disable();assert.equal(sound.cue('draw'),false);
});

test('procedural notes use short rising envelopes with a quiet peak and release',()=>{
 const context=fakeAudioContext(),sound=createMahjongSound({audioContextFactory:()=>context});
 sound.enableFromGesture();assert.equal(sound.cue('discard'),true);
 const gains=context.calls.filter(call=>call[0]==='gain').map(call=>call[1]);
 const peaks=context.calls.filter(call=>call[0]==='gainRamp').map(call=>call[1]);
 const stops=context.calls.filter(call=>call[0]==='stop').map(call=>call[1]);
 assert.ok(gains.length>0);
 assert.ok(gains.every(value=>value===.0001));
 assert.ok(peaks.some(value=>value>0&&value<=.04),'peak volume remains restrained');
 assert.ok(peaks.some(value=>value===.0001),'every tone releases to silence');
 assert.ok(stops.every(at=>at>context.currentTime&&at-context.currentTime<=1),'tones stay brief');
});

test('overlapping cues are bounded and unsupported cue names are ignored',()=>{
 const context=fakeAudioContext(),sound=createMahjongSound({audioContextFactory:()=>context});
 sound.enableFromGesture();assert.equal(sound.cue('unknown'),false);
 let accepted=0;for(let i=0;i<20;i++)if(sound.cue('win'))accepted++;
 assert.ok(accepted>0&&accepted<20,'voice budget should admit some cues and reject excess overlap');
 context.currentTime=10;assert.equal(sound.cue('draw'),true,'voice budget recovers after prior sounds end');
});
