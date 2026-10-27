import test from 'node:test';
import assert from 'node:assert/strict';
import {ReplayHistory,sampleReplay} from '../public/silver-ring/src/replay-history.js';
test('replay stores detached actual coordinates with bounded history',()=>{
 const h=new ReplayHistory(4);const p=[1,2,3];h.add(7,0,p);p[0]=99;
 assert.equal(h.clip(7,0,0)[0].p[0],1);
 for(let i=1;i<9;i++)h.add(7,i,[i,0,0]);
 assert.equal(h.clip(7,0,9).length,4);
 assert.deepEqual(h.clip(8,0,9),[]);
 h.prune(new Set());assert.equal(h.tracks.size,0);
});
test('replay interpolates the recorded path without resimulating or mutating it',()=>{
 const track=[{t:2,p:[0,1,2]},{t:3,p:[2,3,4]}];
 assert.deepEqual(sampleReplay(track,2.25),[.5,1.5,2.5]);
 assert.deepEqual(sampleReplay(track,0),[0,1,2]);assert.deepEqual(sampleReplay(track,9),[2,3,4]);
 assert.equal(sampleReplay([],0),null);assert.deepEqual(track[0].p,[0,1,2]);
});
test('winning clip is anchored to physical passage and remains detached after pruning',()=>{
 const h=new ReplayHistory();for(let i=0;i<480;i++)h.add(3,i/240,[i,0,0]);
 h.mark(3,1);const clip=h.winningClip(3);assert.ok(clip.length>200);
 assert.ok(clip[0].t>=.15&&clip.at(-1).t<=1.22);
 h.prune(new Set());assert.deepEqual(h.winningClip(3),[]);assert.ok(clip.length>200);
});
