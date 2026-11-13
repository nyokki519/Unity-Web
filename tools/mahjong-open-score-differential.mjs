#!/usr/bin/env node
/** Seeded open-hand scoring differential against the pinned Kobalab rules core. */
import Majiang from '@kobalab/majiang-core';
import {evaluateYaku} from '../src/mahjong/yaku.js';

function option(name,fallback){const value=process.argv.find(arg=>arg.startsWith(`--${name}=`))?.slice(name.length+3);return value??fallback;}
const samples=Number(option('samples','3000'));
const seed=Number(option('seed','20261113'))>>>0;
if(!Number.isInteger(samples)||samples<1||samples>100000){console.error('samples must be an integer from 1 to 100000');process.exit(2);}
let rng=seed||1;
function random(){rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return(rng>>>0)/0x100000000;}
function tileCode(tile){return tile<27?`${['m','p','s'][Math.floor(tile/9)]}${tile%9+1}`:`z${tile-26}`;}
function notation(tiles){const suits={m:[],p:[],s:[],z:[]};for(const tile of tiles){const code=tileCode(tile);suits[code[0]].push(code[1]);}return['m','p','s','z'].map(suit=>suits[suit].length?`${suit}${suits[suit].join('')}`:'').join('');}
function openMeldCode(meld){const tiles=[...meld.tiles].sort((a,b)=>a-b),codes=tiles.map(tileCode),suit=codes[0][0];return`${suit}${codes.map(code=>code[1]).join('')}${meld.type==='chi'?'-':'+'}`;}
function makeHand(){
  for(let retry=0;retry<2000;retry++){
    const openKind=['chi','pon','kan'][Math.floor(random()*3)];
    const openType=openKind==='chi'?Math.floor(random()*3)*9+Math.floor(random()*7):Math.floor(random()*34);
    const open={type:openKind,tiles:openKind==='chi'?[openType,openType+1,openType+2]:Array(openKind==='kan'?4:3).fill(openType),open:true};
    const concealed=[],counts=Array(34).fill(0);
    for(const tile of open.tiles)counts[tile]++;
    const pair=Math.floor(random()*34);concealed.push(pair,pair);counts[pair]+=2;
    for(let group=0;group<3;group++){
      if(random()<.58){const suit=Math.floor(random()*3),start=suit*9+Math.floor(random()*7);for(let offset=0;offset<3;offset++){concealed.push(start+offset);counts[start+offset]++;}}
      else{const tile=Math.floor(random()*34);for(let copy=0;copy<3;copy++){concealed.push(tile);counts[tile]++;}}
    }
    if(Math.max(...counts)<=4)return{open,concealed};
  }
  throw new Error('Unable to generate legal open hand');
}
let compared=0,noYaku=0,mismatches=0;
const examples=[],byMeld={chi:{samples:0,compared:0,mismatches:0},pon:{samples:0,compared:0,mismatches:0},kan:{samples:0,compared:0,mismatches:0}};
for(let index=0;index<samples;index++){
  const {open,concealed}=makeHand(),winningTile=concealed[Math.floor(random()*concealed.length)],winType=index%2?'ron':'tsumo';
  const seatWind=1+Math.floor(random()*4),roundWind=1+Math.floor(random()*4),local=evaluateYaku({concealed,melds:[open],winningTile,winType,seatWind,roundWind});
  const referenceTiles=[...concealed];
  referenceTiles.splice(referenceTiles.indexOf(winningTile),1);
  const input=`${notation(referenceTiles)}${winType==='tsumo'?tileCode(winningTile):''},${openMeldCode(open)}`;
  let upstream;
  try{upstream=Majiang.Util.hule(Majiang.Shoupai.fromString(input),winType==='ron'?`${tileCode(winningTile)}+`:null,Majiang.Util.hule_param({zhuangfeng:roundWind-1,menfeng:seatWind-1}));}
  catch(error){throw new Error(`Reference parser rejected generated open hand ${input}: ${error.message}`);}
  const scoredUpstream=upstream&&upstream.defen>0?upstream:null,entry=byMeld[open.type];entry.samples++;
  if(!local&&!scoredUpstream){noYaku++;continue;}
  const localYakuman=local?.yaku.reduce((sum,yaku)=>sum+(yaku.yakuman||0),0)||0,upstreamYakuman=scoredUpstream?.damanguan||0;
  const same=!!local===!!scoredUpstream&&(localYakuman?localYakuman===upstreamYakuman:local.han===scoredUpstream.fanshu&&local.fu===scoredUpstream.fu);
  compared++;entry.compared++;
  if(!same){mismatches++;entry.mismatches++;if(examples.length<30)examples.push({hand:input,winningTile:tileCode(winningTile),winType,local:local&&{han:local.han,fu:local.fu,yaku:local.yaku},upstream:scoredUpstream&&{han:scoredUpstream.fanshu,fu:scoredUpstream.fu,yakuman:upstreamYakuman}});}
}
const report={seed,samples,compared,noYaku,mismatches,byMeld,examples,coverage:'Generated complete hands with one exposed chi, pon, or kan; alternating ron and tsumo and varied winds. For tsumo, the winning tile is removed from the concealed base and appended as the draw, matching the game adapter. Compares han/fu or yakuman units to pinned Kobalab. No bonus tiles, multiple melds, optional rules or match progression.'};
console.log(JSON.stringify(report,null,2));
if(mismatches)process.exitCode=1;
