#!/usr/bin/env node
import Majiang from '@kobalab/majiang-core';
import {evaluateYaku} from '../src/mahjong/yaku.js';

function option(name,fallback){const value=process.argv.find(arg=>arg.startsWith(`--${name}=`))?.split('=').at(1);return value??fallback;}
const samples=Number(option('samples','3000'));
const seed=Number(option('seed','20261112'))>>>0;
if(!Number.isInteger(samples)||samples<1||samples>100000){console.error('samples must be 1..100000');process.exit(2);}
let state=seed||1;
function random(){state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/0x100000000;}
function createStandardHand(){
  for(let attempt=0;attempt<1000;attempt++){
    const hand=[],counts=Array(34).fill(0),pair=Math.floor(random()*34);
    hand.push(pair,pair);counts[pair]+=2;
    for(let index=0;index<4;index++){
      if(random()<.6){const suit=Math.floor(random()*3),start=suit*9+Math.floor(random()*7);for(let tile=start;tile<start+3;tile++){hand.push(tile);counts[tile]++;}}
      else{const tile=Math.floor(random()*34);for(let copy=0;copy<3;copy++){hand.push(tile);counts[tile]++;}}
    }
    if(Math.max(...counts)<=4)return hand;
  }
  throw new Error('Unable to produce a legal standard hand');
}
function tileCode(tile){const suit=tile<27?['m','p','s'][Math.floor(tile/9)]:'z';const rank=tile<27?tile%9+1:tile-26;return`${suit}${rank}`;}
function notation(tiles){const suits={m:[],p:[],s:[],z:[]};for(const tile of tiles){const code=tileCode(tile);suits[code[0]].push(code[1]);}return['m','p','s','z'].map(suit=>suits[suit].length?`${suit}${suits[suit].join('')}`:'').join('');}
let compared=0,noYaku=0,mismatches=0;
const examples=[];
for(let sample=0;sample<samples;sample++){
  const hand=createStandardHand(),winningTile=hand[Math.floor(random()*hand.length)],remaining=[...hand];
  remaining.splice(remaining.indexOf(winningTile),1);
  const winType=sample%2?'ron':'tsumo';
  const seatWind=Math.floor(random()*4)+1,roundWind=Math.floor(random()*4)+1;
  const params=Majiang.Util.hule_param({zhuangfeng:roundWind-1,menfeng:seatWind-1});
  const local=evaluateYaku({concealed:hand,winningTile,winType,seatWind,roundWind});
  const upstreamHand=winType==='ron'?notation(remaining):notation(remaining)+tileCode(winningTile);
  const upstream=Majiang.Util.hule(Majiang.Shoupai.fromString(upstreamHand),winType==='ron'?`${tileCode(winningTile)}+`:null,params);
  const scoredUpstream=upstream&&upstream.defen>0?upstream:null;
  if(!local&&!scoredUpstream){noYaku++;continue;}
  const localYakuman=local?.yaku.reduce((sum,item)=>sum+(item.yakuman||0),0)||0;
  const upstreamYakuman=scoredUpstream?.damanguan||0;
  const same=!!local===!!scoredUpstream&&(localYakuman?localYakuman===upstreamYakuman:local.han===scoredUpstream.fanshu&&local.fu===scoredUpstream.fu);
  compared++;
  if(!same){mismatches++;if(examples.length<20)examples.push({hand:notation(hand),winningTile:tileCode(winningTile),winType,local:local&&{han:local.han,fu:local.fu,yaku:local.yaku},upstream:scoredUpstream&&{han:scoredUpstream.fanshu,fu:scoredUpstream.fu,yakuman:upstreamYakuman}});}
}
const report={seed,samples,compared,noYaku,mismatches,examples,coverage:'Generated closed standard four-group-and-pair hands; alternating ron/tsumo. This is a differential smoke test, not exhaustive proof and does not cover calls, dora, or optional rule variants.'};
console.log(JSON.stringify(report,null,2));
if(mismatches)process.exitCode=1;
