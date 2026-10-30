import test from 'node:test';
import assert from 'node:assert/strict';
import {coinBreakdown,roundProgress,resultTone,roleDescription} from '../public/chinchiro/src/salon-presentation.js';
test('bet preview conserves integer coins for every supported stake',()=>{
 for(let n=1;n<=100;n++){const pile=coinBreakdown(n);assert.equal(pile.reduce((s,c)=>s+c,0),n);assert.ok(pile.length<=10);assert.ok(pile.every(c=>[1,5,10,25,50,100].includes(c)));}
 assert.deepEqual(coinBreakdown(0),[]);assert.throws(()=>coinBreakdown(-1));assert.throws(()=>coinBreakdown(2.5));
});
test('four round markers distinguish complete current and future including final',()=>{
 assert.deepEqual(roundProgress(1,'BET'),['complete','current','future','future']);
 assert.deepEqual(roundProgress(4,'FINAL'),['complete','complete','complete','complete']);
 assert.deepEqual(roundProgress(2,'FINAL'),['complete','complete','future','future']);
});
test('decision effects distinguish losses and pushes from actual wins',()=>{
 assert.equal(resultTone(25),'win');assert.equal(resultTone(-25),'loss');assert.equal(resultTone(0),'tie');
});
test('role guidance explains multiplier and illegal throw without inventing odds',()=>{
 assert.match(roleDescription({kind:'pin',multiplier:5}),/5倍/);assert.match(roleDescription({kind:'none',final:false}),/振り直し/);assert.match(roleDescription({kind:'shonben'}),/1倍/);assert.match(roleDescription(null),/待/);
});
