import test from 'node:test';
import assert from 'node:assert/strict';
import {mountApp} from '../public/mahjong/src/app.js';

test('selecting a tile after horizontal scrolling keeps that tile in view', async()=>{
  const handlers={};let hand=null,markup='';
  const root={
    addEventListener(type,callback){handlers[type]=callback;},
    querySelector(selector){return selector==='.hand'?hand:{focus(){}};}
  };
  Object.defineProperty(root,'innerHTML',{get(){return markup;},set(value){
    markup=value;
    hand=value.includes('class="hand"')?{scrollLeft:0,scrollWidth:700,clientWidth:350}:null;
  }});
  const view={phase:'DISCARD',revision:1,selfSeat:0,activeSeat:0,players:[
    {name:'自分',points:25000,hand:[1,2,3,4],discards:[],melds:[]},
    {name:'CPU 1',points:25000,handCount:13,discards:[],melds:[]},
    {name:'CPU 2',points:25000,handCount:13,discards:[],melds:[]},
    {name:'CPU 3',points:25000,handCount:13,discards:[],melds:[]}
  ],legalActions:[1,2,3,4].map(tile=>({type:'discard',tile}))};
  const app=mountApp(root,{cpu:{async startCpuMatch(){return view;}}});
  app.selectCharacter('moka');await app.selectMode('cpu');
  hand.scrollLeft=300;
  await handlers.click({target:{closest:()=>({dataset:{tile:'4'},disabled:false})}});
  assert.equal(app.state.selectedTile,'4');
  assert.equal(hand.scrollLeft,300,'a rerender must preserve the hand scroll offset');
});

test('a dealer continuation resets the previous hand horizontal position',async()=>{
  const handlers={};let hand=null,markup='';
  const root={addEventListener(type,callback){handlers[type]=callback;},querySelector(selector){return selector==='.hand'?hand:{focus(){}};}};
  Object.defineProperty(root,'innerHTML',{get(){return markup;},set(value){markup=value;hand=value.includes('class="hand"')?{scrollLeft:0,scrollWidth:700,clientWidth:350}:null;}});
  const players=[{name:'自分',points:25000,hand:[1,2],discards:[],melds:[]},...['CPU 1','CPU 2','CPU 3'].map(name=>({name,points:25000,handCount:13,discards:[],melds:[]}))];
  const first={phase:'HAND_RESULT',revision:1,handNumber:1,honba:0,roundWind:1,dealer:0,round:'東一局',selfSeat:0,players,legalActions:[],result:{type:'exhaustive',tenpai:[0]}};
  const next={...first,phase:'DISCARD',revision:2,honba:1,round:'東一局',activeSeat:0,result:null,legalActions:[{type:'discard',tile:1}]};
  const app=mountApp(root,{cpu:{async startCpuMatch(){return first;},async continueMatch(){return next;}}});
  app.selectCharacter('moka');await app.selectMode('cpu');hand.scrollLeft=300;
  await app.continueHand();
  assert.equal(hand.scrollLeft,0,'a new hand should start at the first tile');
});
