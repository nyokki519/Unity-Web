import {rank} from './rules.js';
export function cryptoRandom(max){
 const limit=Math.floor(4294967296/max)*max,buffer=new Uint32Array(1);let n;do{globalThis.crypto.getRandomValues(buffer);n=buffer[0];}while(n>=limit);return n%max;
}
// Reproducible test source only; normal play uses cryptoRandom above.
export function seededRandom(seed){let state=seed>>>0||1;return max=>{let n;const limit=Math.floor(4294967296/max)*max;do{state^=state<<13;state^=state>>>17;state^=state<<5;n=state>>>0;}while(n>=limit);return n%max;};}
export function newShoe(random=cryptoRandom,serial=1){
 const order=Array.from({length:416},(_,i)=>i);for(let i=415;i>0;i--){const j=random(i+1);if(!Number.isInteger(j)||j<0||j>i)throw Error('RNG');[order[i],order[j]]=[order[j],order[i]];}
 const burn=1+Math.min(10,rank(order[0]));return{order,cursor:burn,burn,cut:402,serial};
}
