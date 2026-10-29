import test from 'node:test';
import assert from 'node:assert/strict';
import {payoutTier} from '../public/baccarat/motion.js';
import {loadSettings,saveSettings} from '../public/baccarat/storage.js';
test('presentation intensity uses personal net and is bounded even for huge payouts',()=>{
 for(const net of [-100000,-1,0])assert.equal(payoutTier({net,returned:1000000}),0);
 assert.equal(payoutTier({net:1}),1);assert.equal(payoutTier({net:10000}),2);
 assert.equal(payoutTier({net:100000}),3);assert.equal(payoutTier({net:Number.MAX_SAFE_INTEGER}),3);
});
test('effect controls persist independently; invalid settings cannot enable movement',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 assert.equal(loadSettings(storage).shake,false);
 saveSettings({...loadSettings(storage),flash:false,particles:false,shake:true},storage);
 assert.deepEqual(['flash','particles','shake'].map(k=>loadSettings(storage)[k]),[false,false,true]);
 saveSettings({flash:'yes',particles:0,shake:'yes'},storage);
 assert.deepEqual(['flash','particles','shake'].map(k=>loadSettings(storage)[k]),[true,true,false]);
});
test('a paid tie has a stronger reveal than a regular small win, never a pushed stake',()=>{
 assert.equal(payoutTier({net:8000,lines:[{side:'tie',profit:8000}]}),2);
 assert.equal(payoutTier({net:8000,lines:[{side:'player',profit:8000}]}),1);
 assert.equal(payoutTier({net:0,returned:10000,lines:[{side:'player',profit:0}]}),0);
});
