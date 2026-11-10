import test from 'node:test';
import assert from 'node:assert/strict';
import {eventScreen} from '../public/js/events/screen.js';
import {createTierComparison} from '../public/js/events/tier.js';

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
function stateFor({ownAnswer=null,participating=true,roundLimit=1,roundIndex=0}={}){
  const items=[{id:'coffee',label:'浅煎りコーヒー'},{id:'tea',label:'紅茶'},{id:'cake',label:'季節のケーキ'}];
  return {items,state:{code:'CAFE',hostId:'host',selfId:'guest',players:[{id:'guest',ready:true}],event:{
      gameId:'TIER',name:'みんなのTier会議',rule:'カードをTierに分けます。',phase:'ANSWER',roundId:'round-1',roundIndex,
      options:{roundLimit},question:{prompt:'カフェで選びたいもの',talkPrompt:'理由を話そう',items},
      participating,answeredCount:1,participantCount:2,revision:0,deadlineAt:null,ownAnswer
    }}};
}
function descendants(root){const result=[];const walk=node=>{result.push(node);for(const child of node.children||[])walk(child);};walk(root);return result;}
function renderedText(node){return (node.children||[]).map(child=>child.nodeType===3?child.textContent:child.textContent||renderedText(child)).join('');}

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

test('interactive Tier board exposes keyboard placement only while a card is selected',()=>withDom(()=>{
  const {state}=stateFor(),root=eventScreen({state,send:()=>{},draft:{},leave:()=>{}}),all=()=>descendants(root);
  assert.ok(all().filter(node=>node.className==='tier-label').every(node=>node.disabled),'empty Tier labels cannot trap keyboard focus');
  all().find(node=>node.className==='tier-item').listeners.click();
  assert.ok(all().filter(node=>node.className==='tier-label').every(node=>!node.disabled),'selecting an item enables placement labels');
  all().find(node=>node.className==='tier-label').listeners.click();
  assert.ok(all().filter(node=>node.className==='tier-label').every(node=>node.disabled),'placing an item disables labels until another is selected');
}));

test('Tier answer screen provides a working skip action',()=>withDom(()=>{
  const {state}=stateFor();let sent;const root=eventScreen({state,send:(action,data)=>{sent={action,data};},draft:{},leave:()=>{}}),skip=descendants(root).find(node=>node.textContent==='今回はパス');
  assert.ok(skip);skip.listeners.click();assert.deepEqual(sent,{action:'event_answer',data:{skip:true}});
}));

test('late participant guidance does not promise a next round in a one-round game',()=>withDom(()=>{
  const {state}=stateFor({participating:false,roundLimit:1}),nodes=descendants(eventScreen({state,send:()=>{},draft:{},leave:()=>{}}));
  assert.ok(nodes.some(node=>node.textContent.includes('この1ラウンドには途中参加できません')));assert.ok(nodes.some(node=>node.textContent.includes('話し合いには参加できます')));assert.ok(!nodes.some(node=>node.textContent.includes('次のラウンドから回答できます')));
}));

test('a Tier board unlocks after send rejection and stays locked only after an accepted send',()=>withDom(()=>{
  const {state}=stateFor();let attempts=0;
  const root=eventScreen({state,send:(action,data)=>{assert.equal(action,'event_answer');assert.ok(data.value.tiers);return ++attempts===1?false:'request-2';},draft:{},leave:()=>{}});
  const all=()=>descendants(root),placeAll=()=>{while(all().some(node=>node.className==='tier-tray-cards'&&node.children.some(child=>child.className.startsWith('tier-item')))){const item=all().find(node=>node.className==='tier-tray-cards').children.find(child=>child.className.startsWith('tier-item'));item.listeners.click();all().find(node=>node.className.startsWith('tier-pick ')).listeners.click();}};
  placeAll();let submit=all().find(node=>node.className==='tier-submit');submit.listeners.click();
  submit=all().find(node=>node.className==='tier-submit');assert.equal(submit.disabled,false,'a failed send keeps the board editable');assert.equal(submit.textContent,'このTier表で確定');
  submit.listeners.click();submit=all().find(node=>node.className==='tier-submit');assert.equal(submit.disabled,true,'an accepted send prevents duplicate answers');assert.equal(submit.textContent,'確定しました ✓');
}));

test('Tier screen keeps motion settings available without pushing repeated instructions above the board',()=>withDom(()=>{
  const {state}=stateFor();const root=eventScreen({state,send:()=>{},draft:{},leave:()=>{}}),nodes=descendants(root);
  assert.ok(nodes.some(node=>node.className==='event-display-settings'),'motion preference remains accessible under display settings');
  assert.ok(!nodes.some(node=>node.textContent.includes('2〜10人で遊べます')),'the board already explains how to play');
  assert.ok(!nodes.some(node=>node.className==='event-rule'),'the answer board should not be pushed down by repeated rule copy');
  assert.ok(nodes.some(node=>node.className==='tier-instruction'&&node.textContent.includes('公開まで本人だけ')),'the board keeps the privacy guidance beside the action');
}));

test('Tier results provide a per-item matrix across all responding participants',()=>withDom(()=>{
  const items=[{id:'coffee',label:'コーヒー'},{id:'cake',label:'ケーキ'}],boards=[
    {playerId:'p1',tiers:{S:['coffee'],A:['cake'],B:[],C:[],D:[]}},
    {playerId:'p2',tiers:{S:[],A:['coffee'],B:['cake'],C:[],D:[]}}
  ],participants=[{id:'p1',name:'あおい'},{id:'p2',name:'はる'}];
  const nodes=descendants(createTierComparison({items,boards,participants,participantCount:2}));
  assert.ok(nodes.some(node=>node.className==='tier-matrix'),'the comparison matrix is available');
  assert.deepEqual(nodes.filter(node=>node.className.startsWith('tier-matrix-cell')).map(renderedText),['S','A','A','B']);
  assert.ok(nodes.some(node=>node.textContent==='あおい'));
  assert.ok(nodes.some(node=>node.textContent==='はる'));
}));

test('Tier results surface the most-divided items with exact vote counts and a neutral discussion prompt',()=>withDom(()=>{
  const items=[{id:'coffee',label:'コーヒー'},{id:'cake',label:'ケーキ'},{id:'tea',label:'紅茶'}],boards=[
    {playerId:'p1',tiers:{S:['coffee'],A:['cake'],B:['tea'],C:[],D:[]}},
    {playerId:'p2',tiers:{S:[],A:['coffee','cake'],B:['tea'],C:[],D:[]}},
    {playerId:'p3',tiers:{S:[],A:[],B:['coffee','cake','tea'],C:[],D:[]}}
  ];
  const nodes=descendants(createTierComparison({items,boards,participants:[],participantCount:3}));
  const section=nodes.find(node=>node.className==='tier-discussion');assert.ok(section);
  assert.ok(nodes.some(node=>node.textContent==='コーヒー'));
  assert.ok(nodes.some(node=>node.textContent==='S · 1人'));
  assert.ok(nodes.some(node=>node.textContent==='A · 1人'));
  assert.ok(nodes.some(node=>node.textContent==='B · 1人'));
  assert.ok(nodes.some(node=>node.textContent==='評価が分かれたポイントはどこ？'));
}));

test('partial Tier results say the discussion reflects respondents rather than everyone',()=>withDom(()=>{
  const items=[{id:'coffee',label:'コーヒー'},{id:'cake',label:'ケーキ'}],boards=[{playerId:'p1',tiers:{S:['coffee'],A:['cake'],B:[],C:[],D:[]}}];
  const nodes=descendants(createTierComparison({items,boards,participants:[],participantCount:2})),intro=nodes.find(node=>node.className==='tier-discussion-intro')?.textContent||'';
  assert.match(intro,/1\s*\/\s*2人/);assert.ok(!intro.includes('全員の評価がそろいました'));assert.ok(!intro.includes('届いてから'));assert.match(intro,/未回答の人の分は含まれていません/);
}));
