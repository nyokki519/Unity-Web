import test from 'node:test';import assert from 'node:assert/strict';
import {createCardImageCache} from '../public/baccarat/card-images.js';
test('repeated artwork requests share decoded images and eviction remains bounded',async()=>{
 let made=0;const cache=createCardImageCache(2,()=>({decode:async()=>{},set src(value){made++;queueMicrotask(()=>this.onload());}}));
 const a=cache('a'),b=cache('a');assert.equal(a,b);assert.equal(await a,await b);assert.equal(made,1);
 await cache('b');await cache('c');await cache('a');assert.equal(made,4);
});
test('failed image requests can be retried instead of poisoning the fallback forever',async()=>{
 let count=0;const cache=createCardImageCache(2,()=>({set src(value){count++;queueMicrotask(()=>count===1?this.onerror():this.onload());}}));
 await assert.rejects(cache('x'));await cache('x');assert.equal(count,2);
});
