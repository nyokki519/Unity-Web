import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ratingScreen} from '../public/js/events/rating.js';

class Node{constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.listeners={};this.className='';this.dataset={};this.textContent='';this.style={};}append(...nodes){for(const n of nodes){const c=n instanceof Node?n:{textContent:String(n),nodeType:3,children:[]};this.children.push(c);c.parentNode=this;}}setAttribute(k,v){this.attributes[k]=String(v);}addEventListener(k,fn){this.listeners[k]=fn;}}
function withDocument(fn){const prev=globalThis.document;globalThis.document={head:new Node('head'),createElement:t=>new Node(t)};try{return fn();}finally{if(prev===undefined)delete globalThis.document;else globalThis.document=prev;}}
function flatten(root){const out=[];const visit=n=>{out.push(n);for(const c of n.children||[])visit(c);};visit(root);return out;}
const q={prompt:'どちらが一流のデザイン？',choices:{A:{label:'Aの作品',asset:'/rating/a.svg',alt:'青い模様'},B:{label:'Bの作品',asset:'/rating/b.svg',alt:'赤い模様'}},correct:'B',explanation:'余白と文字組みの整合性を見ます。'};
function state(phase,extra={}){return{selfId:'p1',hostId:'p1',serverTime:10000,players:[{id:'p1',name:'葵'}],event:{gameId:'RATING',phase,roundIndex:0,options:{roundLimit:3,seconds:45},question:q,...extra}};}

test('RATING answer screen offers two accessible image choices and sends only A/B choice',()=>withDocument(()=>{
 let command;const root=ratingScreen({state:state('ANSWER'),send:(...args)=>command=args}),nodes=flatten(root),cards=nodes.filter(n=>n.className.startsWith('rating-choice '));
 assert.equal(cards.length,2);assert.ok(cards.every(n=>n.className.includes('rating-choice-blind')));assert.deepEqual(cards.map(n=>n.attributes['aria-pressed']),['false','false']);assert.deepEqual(cards.map(card=>card.children.find(child=>child.className==='rating-choice-letter')?.textContent),['A','B']);assert.equal(nodes.find(n=>n.tagName==='IMG')?.alt,'青い模様');cards[1].listeners.click();assert.deepEqual(command,['event_answer',{value:{choice:'B'}}]);assert.ok(!nodes.some(n=>n.textContent===q.explanation));
}));


test('original practice questions are explicitly identified as non-evidence illustrations',()=>withDocument(()=>{
 const practice={...q,practiceNotice:'練習問題：オリジナル図版の観察です。実在の作品・プロ・骨董品を判定する資料ではありません。'};
 const nodes=flatten(ratingScreen({state:state('ANSWER',{question:practice}),send:()=>{}}));
 assert.ok(nodes.some(n=>n.textContent.includes('練習問題：オリジナル図版')));
 const verified=flatten(ratingScreen({state:state('ANSWER',{question:q}),send:()=>{}}));
 assert.ok(!verified.some(n=>n.textContent.includes('練習問題：オリジナル図版')));
}));

test('CLOSED places respondents into A/B rooms without exposing the answer',()=>withDocument(()=>{
 const root=ratingScreen({state:state('CLOSED',{waitingRooms:{A:['葵'],B:['蓮']},distribution:{A:1,B:1}}),send:()=>{}}),nodes=flatten(root);
 assert.ok(nodes.some(n=>n.textContent==='葵'));assert.ok(nodes.some(n=>n.textContent==='蓮'));assert.ok(!nodes.some(n=>n.textContent==='正解は B。'));
}));

test('REVEAL uses synchronized server time to start the two-door beat',()=>withDocument(()=>{
 const root=ratingScreen({state:state('REVEAL',{revealAt:8000}),send:()=>{}}),nodes=flatten(root);
 assert.ok(root.className.includes('is-revealing'));assert.equal(nodes.filter(n=>n.className.startsWith('rating-door ')).length,2);assert.equal(nodes.find(n=>n.className.startsWith('rating-door '))?.style.animationDelay,'-2s');
}));

test('TALK reveals explanation and standings only after the reveal phase',()=>withDocument(()=>{
 const result={correctChoice:'B',explanation:q.explanation,distribution:{A:1,B:1},standings:[{playerId:'p1',name:'葵',rankIndex:1,rankLabel:'二流',correct:2,total:3,place:1}]};
 const nodes=flatten(ratingScreen({state:state('TALK',{result}),send:()=>{}}));
 assert.ok(nodes.some(n=>n.textContent==='正解は B。'));assert.ok(nodes.some(n=>n.textContent==='Aの作品'));assert.ok(nodes.some(n=>n.textContent==='Bの作品'));assert.ok(nodes.some(n=>n.textContent===q.explanation));assert.ok(nodes.some(n=>n.textContent==='葵'));assert.ok(nodes.some(n=>n.textContent==='2 / 3 正解'));
}));

test('rating room setup hides the uninitialized answer counter and timer',async()=>{
 const css=await readFile(new URL('../public/js/events/rating.css',import.meta.url),'utf8');
 assert.match(css,/\.event-screen\[data-game=["']RATING["']\]\[data-phase=["']RULES["']\]\s+#event-status/);
 assert.match(css,/\.event-screen\[data-game=["']RATING["']\]\[data-phase=["']RULES["']\]\s+#event-timer/);
});
