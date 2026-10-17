import test from 'node:test';
import assert from 'node:assert/strict';
import {createChallengeControls} from '../public/js/abyss/challenge-controls.js';
test('replay reset and input release cannot overwrite recorded tilt',()=>{
 const oldDocument=globalThis.document,oldWindow=globalThis.window;
 class Node extends EventTarget{constructor(tag){super();this.tag=tag;this.children=[];this.dataset={};}append(...xs){this.children.push(...xs);}prepend(x){this.children.unshift(x);}setAttribute(){}querySelectorAll(tag){return this.children.flatMap(x=>[...(x.tag===tag?[x]:[]),...x.querySelectorAll(tag)]);}}
 const dock=new Node('div'),events=[];let replay={},tilt=1;
 globalThis.document={createElement:tag=>new Node(tag)};globalThis.window=new Node('window');
 try{
 const game={setTilt:value=>{tilt=value;},status:'running',initialBalls:100,fired:0,jackpots:0};
 const controls=createChallengeControls({node:{querySelector:()=>dock},getGame:()=>game,getReplay:()=>replay,listen:(node,type,fn)=>events.push({node,type,fn})});
 controls.reset('replay');controls.stop();
 for(const e of events)if(['pointerup','pointercancel','keyup','blur'].includes(e.type))e.fn({code:'KeyJ'});
 assert.equal(tilt,1,'replay inputs must only come from the recorded commands');
 replay=null;controls.stop();assert.equal(tilt,0,'live play still releases tilt');
 }finally{globalThis.document=oldDocument;globalThis.window=oldWindow;}
});
