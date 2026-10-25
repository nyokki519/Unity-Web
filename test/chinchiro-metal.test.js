import test from 'node:test';
import assert from 'node:assert/strict';
test('solid steel dice mass follows the actual shared shape volume',async()=>{
 const {DiceWorld}=await import('../public/chinchiro/src/dice-physics.js');const w=await DiceWorld.create(41);
 try{assert.ok(w.mass>.030&&w.mass<.034);assert.ok(w.dice.every(d=>Math.abs(d.body.mass()-w.mass)<1e-6));assert.equal(w.config.gravity,9.80665);}finally{w.dispose();}
});
test('metal finish mask removes paper but keeps dark Unity ink',async()=>{
 const {inkAlpha}=await import('../public/chinchiro/src/metal-surfaces.js');
 assert.equal(inkAlpha(220,215,205),0);assert.ok(inkAlpha(35,35,35)>.95);assert.equal(inkAlpha(255,255,255),0);
});
test('audio policy suppresses support load, air, and still contacts and caps impact gain',async()=>{
 const {contactVoice}=await import('../public/chinchiro/src/metal-audio.js');
 assert.equal(contactVoice({touching:false,normalSpeed:1,impulse:.05,mass:.032}),null);
 assert.equal(contactVoice({touching:true,normalSpeed:0,tangentSpeed:0,angularSpeed:0,impulse:.0013,mass:.032}),null);
 const v=contactVoice({touching:true,type:'bowl',normalSpeed:.8,tangentSpeed:0,angularSpeed:3,impulse:.03,mass:.032});assert.equal(v.kind,'impact');assert.ok(v.gain>0&&v.gain<=.08);
 const roll=contactVoice({touching:true,type:'bowl',normalSpeed:.005,tangentSpeed:.08,angularSpeed:4,impulse:.0013,mass:.032});assert.equal(roll.kind,'scrape');assert.ok(roll.duration<.06);
 assert.equal(contactVoice({touching:true,type:'bowl',normalSpeed:0,tangentSpeed:.08,angularSpeed:0,impulse:.0013,mass:.032})?.kind,'scrape','a sliding face is audible without rotation');
});
test('real solver collisions provide audible contact data, not only cached manifolds',async()=>{
 const {DiceWorld}=await import('../public/chinchiro/src/dice-physics.js');const {contactVoice}=await import('../public/chinchiro/src/metal-audio.js');const w=await DiceWorld.create(41);let impacts=0;
 try{while(!w.done){w.step();for(const e of w.drainSounds())if(contactVoice(e)?.kind==='impact')impacts++;}assert.ok(impacts>=5,`lost collision impulses: ${impacts}`);}finally{w.dispose();}
});
