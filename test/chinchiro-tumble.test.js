import test from 'node:test';
import assert from 'node:assert/strict';
import {DiceWorld} from '../public/chinchiro/src/dice-physics.js';

test('a stationary result has no minimum roll-duration timer',async()=>{
 const w=await DiceWorld.create(5);
 try{w.dice.forEach((d,i)=>{d.body.setTranslation({x:(i-1)*.03,y:.008,z:0},true);d.body.setRotation({x:0,y:0,z:0,w:1},true);d.body.setLinvel({x:0,y:0,z:0},true);d.body.setAngvel({x:0,y:0,z:0},true);});while(!w.done)w.step();assert.ok(w.result.values);assert.ok(w.result.seconds<1);}finally{w.dispose();}
});
