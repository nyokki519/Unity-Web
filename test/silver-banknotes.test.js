import test from 'node:test';import assert from 'node:assert/strict';import{createBanknoteRain}from'../public/silver-ring/src/banknote-rain.js';
test('background notes occupy both sides and remain visible for reduced motion and hide only when disabled',()=>{
 const old=globalThis.document;const g=Object.fromEntries(['fillRect','strokeRect','fillText','beginPath','ellipse','stroke','moveTo','bezierCurveTo','arc','fill'].map(k=>[k,()=>{}]));
 g.createRadialGradient=()=>({addColorStop(){}});
 class Node{constructor(){this.children=[];this.dataset={};this.style={setProperty(){}};}setAttribute(){}append(n){this.children.push(n);}prepend(n){this.children.unshift(n);}getContext(){return g;}toDataURL(){return 'data:image/png;base64,AA==';}}
 globalThis.document={createElement:()=>new Node(),body:new Node()};
 try{const rain=createBanknoteRain();assert.equal(rain.layer.children.length,14);for(const side of ['left','right'])assert.equal(rain.layer.children.filter(n=>n.dataset.side===side).length,7);
 rain.update(1,{reduced:true});assert.equal(rain.layer.hidden,false);rain.update(1,{enabled:false});assert.equal(rain.layer.hidden,true);rain.update(1);assert.equal(rain.layer.hidden,false);
 }finally{globalThis.document=old;}
});
