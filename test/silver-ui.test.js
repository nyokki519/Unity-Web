import test from 'node:test';import assert from 'node:assert/strict';import {UI} from '../public/silver-ring/src/ui.js';
test('jackpot counting and completion freeze while paused',async()=>{
 const old=globalThis.requestAnimationFrame,queue=[];globalThis.requestAnimationFrame=fn=>queue.push(fn);
 let paused=true,done=false;const amount={textContent:'unchanged'},classes=new Set();
 try{const now=performance.now();const promise=UI.prototype.jackpotShow.call({el:{jack$:{classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)}},jackAmount:amount}},1000,null,()=>paused).then(()=>done=true);
 queue.shift()(now+1000);assert.equal(amount.textContent,'unchanged');queue.shift()(now+9000);await Promise.resolve();assert.equal(done,false);assert.ok(classes.has('show'));
 paused=false;for(let t=9100;t<16000&&queue.length;t+=100)queue.shift()(now+t);await promise;assert.equal(amount.textContent,'1,000枚');assert.equal(done,true);assert.equal(classes.has('show'),false);
 }finally{globalThis.requestAnimationFrame=old;}
});
