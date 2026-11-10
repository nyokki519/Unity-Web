import test from 'node:test';
import assert from 'node:assert/strict';
import {createCpuGame} from '../public/mahjong/src/cpu-game.js';

function decisionEngine(trace){
  return {
    createMatch:({players,seed})=>({players,seed,phase:'DISCARD',activeSeat:0,revision:0}),
    legalActions:(match,seat)=>match.phase==='DISCARD'&&match.activeSeat===0&&seat===0?[{type:'discard',tile:'m1'}]:match.phase==='CPU'&&match.activeSeat===1&&seat===1?[{type:'discard',tile:'m2'},{type:'discard',tile:'p4'}]:[],
    applyAction:(match,seat,action,revision)=>{
      assert.equal(revision,match.revision);
      if(seat===0)return{...match,phase:'CPU',activeSeat:1,revision:revision+1};
      trace.push(action.tile);
      return{...match,phase:'DISCARD',activeSeat:0,revision:revision+1,cpuChoice:action.tile};
    },
    advanceTurn:match=>match,
    chooseAction:(match,seat,random)=>{
      const actions=[{type:'discard',tile:'m2'},{type:'discard',tile:'p4'}];
      return actions[Math.min(actions.length-1,Math.floor(random()*actions.length))];
    },
    view:match=>({phase:match.phase,revision:match.revision,activeSeat:match.activeSeat,players:match.players.map(player=>({name:player.name,points:25000})),legalActions:match.phase==='DISCARD'&&match.activeSeat===0?[{type:'discard',tile:'m1'}]:[],cpuChoice:match.cpuChoice})
  };
}

async function runOnce(seed){
  const choices=[],game=createCpuGame(decisionEngine(choices));
  const view=await game.startCpuMatch('moka',seed);
  assert.equal(view.phase,'DISCARD');
  await game.dispatchCpuAction({type:'discard',tile:'m1'});
  assert.equal(game.getView().phase,'DISCARD');
  assert.equal(game.getView().activeSeat,0,'the adapter returns control only after CPU legal actions resolve');
  return choices[0];
}

test('same CPU match seed reproduces CPU tie-break choices independently of Math.random',async()=>{
  const original=Math.random;let externalDraw=0;
  try{
    Math.random=()=>++externalDraw%2?.99:.01;
    const first=await runOnce('same-seed-match');
    const second=await runOnce('same-seed-match');
    assert.equal(first,second,'the same match seed should reproduce the CPU action sequence');
  }finally{Math.random=original;}
});
