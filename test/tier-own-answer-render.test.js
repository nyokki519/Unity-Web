import test from 'node:test';
import assert from 'node:assert/strict';
import {eventScreen} from '../public/js/events/screen.js';

class TextNode {
  constructor(value){this.textContent=String(value);this.nodeType=3;this.children=[];}
}
class Element {
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.listeners={};this.className='';this.textContent='';this.classList={toggle:()=>{}};}
  append(...nodes){for(const node of nodes){const child=node instanceof Element?node:new TextNode(node);this.children.push(child);child.parentNode=this;}}
  replaceChildren(...nodes){this.children=[];this.append(...nodes);}
  setAttribute(name,value){this.attributes[name]=String(value);}
  addEventListener(name,callback){this.listeners[name]=callback;}
  querySelectorAll(selector){return descendants(this).filter(node=>selector==='[data-item]'&&node.dataset?.item!==undefined);}
  querySelector(selector){if(selector==='.tier-picker .tier-pick')return this.querySelectorAll('.tier-pick')[0]||null;return null;}
  focus(){}
}

function withDom(run){
  const originalDocument=globalThis.document,originalStorage=globalThis.localStorage;
  const head=new Element('head'),body=new Element('body');
  globalThis.document={head,body,createElement:tag=>new Element(tag)};
  globalThis.localStorage={getItem:()=>null};
  try{return run();}finally{
    if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;
    if(originalStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=originalStorage;
  }
}
function stateFor({ownAnswer=null}={}){
  const items=[{id:'coffee',label:'浅煎りコーヒー'},{id:'tea',label:'紅茶'},{id:'cake',label:'季節のケーキ'}];
  return {items,state:{code:'CAFE',hostId:'host',selfId:'guest',players:[{id:'guest',ready:true}],event:{
      gameId:'TIER',name:'みんなのTier会議',rule:'カードをTierに分けます。',phase:'ANSWER',roundId:'round-1',roundIndex:0,
      options:{roundLimit:1},question:{prompt:'カフェで選びたいもの',talkPrompt:'理由を話そう',items},
      participating:true,answeredCount:1,participantCount:2,revision:0,deadlineAt:null,ownAnswer
    }}};
}
function descendants(root){const result=[];const walk=node=>{result.push(node);for(const child of node.children||[])walk(child);};walk(root);return result;}

test('eventScreen mounts server-shaped private Tier ownAnswer as a read-only DOM board',()=>withDom(()=>{
  const {items,state}=stateFor({ownAnswer:{value:{tiers:{S:['coffee'],A:['tea'],B:[],C:['cake'],D:[]}}}});
  const nodes=descendants(eventScreen({state,send:()=>{},draft:{},leave:()=>{}}));
  assert.ok(nodes.some(node=>node.className==='tier-playfield'),'the controller.element must be appended');
  assert.deepEqual(nodes.filter(node=>node.className==='tier-item').map(node=>node.textContent),items.map(item=>item.label));
  assert.ok(!nodes.some(node=>node.textContent==='[object Object]'));
  assert.ok(nodes.filter(node=>node.className==='tier-item').every(node=>node.disabled),'saved board is read-only');
}));

test('eventScreen mounts an interactive Tier board as DOM while retaining the answer callback',()=>withDom(()=>{
  const {items,state}=stateFor();let submitted;
  const screen=eventScreen({state,send:(action,data)=>{submitted={action,data};},draft:{},leave:()=>{}});
  let nodes=descendants(screen);
  assert.ok(nodes.some(node=>node.className==='tier-playfield'),'the controller.element must be appended');
  assert.deepEqual(nodes.filter(node=>node.className==='tier-item').map(node=>node.textContent),items.map(item=>item.label));
  assert.ok(!nodes.some(node=>node.textContent==='[object Object]'));
  for(const item of items){
    nodes=descendants(screen);nodes.find(node=>node.className==='tier-item'&&node.dataset.item===item.id).listeners.click();
    nodes=descendants(screen);nodes.find(node=>node.className==='tier-pick tier-s').listeners.click();
  }
  nodes=descendants(screen);
  const submit=nodes.find(node=>node.className==='tier-submit');assert.ok(submit);
  submit.listeners.click();
  assert.equal(submitted.action,'event_answer');assert.deepEqual(submitted.data.value.tiers,{S:['coffee','tea','cake'],A:[],B:[],C:[],D:[]});
}));
