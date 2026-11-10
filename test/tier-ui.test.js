import test from 'node:test';
import assert from 'node:assert/strict';
import {createTierBoard,createTierComparison,summarizeTierBoards,validateTierBoard} from '../public/js/events/tier.js';
import {readFile} from 'node:fs/promises';

const items=[{id:'a',label:'眉毛'},{id:'b',label:'靴'}];
const screen=await readFile(new URL('../public/js/events/screen.js',import.meta.url),'utf8');
class Element {
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.listeners={};this.dataset={};this.style={};this.className='';this.textContent='';this.classList={toggle:()=>{},add:()=>{},remove:()=>{}};}
 append(...nodes){for(const node of nodes){this.children.push(node);node.parentNode=this;}}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 setAttribute(name,value){this.attributes[name]=String(value);}
 getAttribute(name){return this.attributes[name]??null;}
 addEventListener(name,callback){this.listeners[name]=callback;}
 querySelectorAll(selector){return descendants(this).filter(node=>selector==='.tier-item'&&node.className.startsWith('tier-item')||selector==='.tier-majority h3'&&node.className===''&&node.textContent==='項目ごとの最多Tier');}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 focus(){}
}
function descendants(root){return [root,...(root.children||[]).flatMap(descendants)];}
async function withDom(run){
 const oldDocument=globalThis.document,oldNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator'),ctxText=[],ctxPositions=[];
 const head=new Element('head');
 globalThis.document={head,createElement:tag=>{if(tag!=='canvas')return new Element(tag);const canvas=new Element(tag);canvas.getContext=()=>({fillRect(){},strokeRect(){},beginPath(){},roundRect(){},fill(){},measureText(text){return{width:String(text).length*10};},fillText(text,x,y){ctxText.push(String(text));ctxPositions.push({text:String(text),x,y});}});canvas.toBlob=callback=>callback(new Blob(['test'],{type:'image/png'}));return canvas;}};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{canShare:()=>true,share:async data=>{globalThis.__tierShare=data;}}});
 try{return await run({ctxText,ctxPositions});}finally{delete globalThis.__tierShare;if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;if(oldNavigator)Object.defineProperty(globalThis,'navigator',oldNavigator);else delete globalThis.navigator;}
}
test('board validation requires each item exactly once in a known tier',()=>{
 assert.equal(validateTierBoard(items,{a:'S',b:'D'}),true);
 assert.equal(validateTierBoard(items,{S:['a'],A:[],B:[],C:[],D:['b']}),true);
 assert.throws(()=>validateTierBoard(items,{S:['a','b'],A:[],B:[],C:[],D:['b']}),/duplicate/i);
 assert.throws(()=>validateTierBoard(items,{a:'S'}),/missing/i);
 assert.throws(()=>validateTierBoard(items,{a:'S',b:'S',extra:'A'}),/unknown|extra/i);
 assert.throws(()=>validateTierBoard(items,{a:'Z',b:'D'}),/tier/i);
});
test('summary reports a majority only when unique and measures pairwise agreement',()=>{
 const result=summarizeTierBoards(items,[
  {tiers:{a:'S',b:'B'}},{tiers:{a:'S',b:'A'}},{tiers:{a:'A',b:'D'}}
 ]);
 assert.equal(result.items.a.majority,'S');assert.equal(result.items.a.distribution.S,2);
 assert.equal(result.items.b.majority,null);assert.equal(result.items.b.distribution.D,1);
 assert.equal(result.agreement,17);
});
test('summary handles empty and single-player data without division errors',()=>{
 assert.deepEqual(summarizeTierBoards([],[]),{participantCount:0,agreement:0,items:{}});
 const result=summarizeTierBoards(items,[{tiers:{a:'C',b:'D'}}]);
 assert.equal(result.agreement,100);assert.equal(result.items.a.minorityCount,1);
});
test('server row-array tier answers are accepted and aggregated in the same public format',()=>{
 const answer={S:['a'],A:[],B:[],C:[],D:['b']};
 assert.equal(validateTierBoard(items,answer),true);
 const summary=summarizeTierBoards(items,[{playerId:'1',tiers:answer},{playerId:'2',tiers:{S:['a'],A:['b'],B:[],C:[],D:[]}}]);
 assert.equal(summary.items.a.majority,'S');assert.equal(summary.items.b.majority,null);
});

test('mobile Tier instruction leads with tap-to-place, keeps drag optional and explains answer privacy',async()=>withDom(()=>{
 const board=createTierBoard({items,onSubmit:()=>{}}),instruction=descendants(board.element).find(node=>node.className==='tier-instruction')?.textContent||'';
 assert.match(instruction,/タップ.*S〜D/);assert.match(instruction,/ドラッグ/);assert.match(instruction,/公開まで本人だけ/);
}));

test('Tier result names the majority correctly and includes the theme in the result/share image title',async()=>withDom(async({ctxText})=>{
 const boards=[{playerId:'p1',tiers:{S:['a'],A:['b'],B:[],C:[],D:[]}},{playerId:'p2',tiers:{S:['a'],A:[],B:['b'],C:[],D:[]}}];
 const result=createTierComparison({items,boards,participants:[{id:'p1',name:'あおい'},{id:'p2',name:'はる'}],participantCount:2,prompt:'初デートで行きたい場所Tier表'});
 const nodes=descendants(result),heading=nodes.find(node=>node.className==='tier-majority')?.children[0];
 assert.equal(heading?.textContent,'項目ごとの最多Tier');
 assert.ok(nodes.some(node=>node.className==='tier-theme-prompt'&&node.textContent==='初デートで行きたい場所Tier表'));
 const save=nodes.find(node=>node.className==='tier-image-button');assert.match(save?.getAttribute('aria-label')||'',/初デートで行きたい場所Tier表/);
 await save.listeners.click();
 assert.equal(globalThis.__tierShare?.title,'初デートで行きたい場所Tier表｜みんなのTier会議');
 assert.ok(ctxText.includes('初デートで行きたい場所Tier表'),'the downloadable image canvas includes the theme prompt');
}));

test('long Tier themes wrap in the shared image above its legend and agreement definition',async()=>withDom(async({ctxText,ctxPositions})=>{
 const prompt='休日に友達と出かけるならどんな場所を選びたいか、初めての人にもおすすめしたい場所を含めて話し合うテーマ'.repeat(6);
 const boards=[{playerId:'p1',tiers:{S:['a'],A:['b'],B:[],C:[],D:[]}},{playerId:'p2',tiers:{S:['a'],A:[],B:['b'],C:[],D:[]}}];
 const result=createTierComparison({items,boards,participants:[],participantCount:2,prompt}),save=descendants(result).find(node=>node.className==='tier-image-button');
 await save.listeners.click();
 const titleIndex=ctxText.indexOf('みんなのTier会議'),statsIndex=ctxText.findIndex((text,index)=>index>titleIndex&&text.startsWith('一致率 ')),legendIndex=ctxText.findIndex(text=>text.startsWith('S · 最高')),definitionIndex=ctxText.findIndex(text=>text.startsWith('一致率は参加者ペア')),legendY=ctxPositions[legendIndex].y,promptLines=ctxPositions.filter(position=>position.y>=150&&position.y<legendY&&position.text!=='S').map(position=>position.text);
 assert.equal(promptLines.length,2,`two readable prompt lines leave room for the result stats: ${JSON.stringify(promptLines)}`);
 assert.match(promptLines.at(-1),/…$/);
 const promptYs=ctxPositions.filter(position=>promptLines.includes(position.text)).map(position=>position.y),statsY=ctxPositions[statsIndex].y,definitionY=ctxPositions[definitionIndex].y;
 assert.ok(Math.max(...promptYs)<legendY&&legendY<statsY&&statsY<definitionY,'theme, legend, stats and agreement definition are vertically ordered without overlap');
 assert.ok(ctxText.some(text=>text.startsWith('一致率 ')));
 assert.ok(ctxText.some(text=>text.startsWith('一致率は参加者ペア')));
}));

test('Tier result explains its agreement score and S-to-D meanings for both small and full rooms',async()=>withDom(()=>{
 for(const count of [2,10]){
  const boards=Array.from({length:count},(_,i)=>({playerId:`p${i+1}`,tiers:{S:i%2?[]:['a'],A:i%2?['a']:[],B:[],C:[],D:['b']}}));
  const nodes=descendants(createTierComparison({items,boards,participants:boards.map((_,i)=>({id:`p${i+1}`,name:`参加者${i+1}`})),participantCount:count}));
  const score=nodes.find(node=>node.className==='tier-agreement')?.textContent||'',legend=nodes.filter(node=>node.className.startsWith('tier-discussion-vote')).map(node=>node.textContent).join(' ');
  assert.match(score,new RegExp(`一致率 ${count===2?50:72}%`));assert.match(score,new RegExp(`回答 ${count} / 参加 ${count}人`));
  assert.ok(nodes.some(node=>node.textContent.includes('参加者ペアの一致率を、項目ごとに平均')));
  assert.match(legend,/S · 最高/);assert.match(legend,/A · かなり好き/);assert.match(legend,/B · いいね/);assert.match(legend,/C · ふつう/);assert.match(legend,/D · 自分には合わない/);
 }
}));

test('ten-person comparison wraps full-length nicknames into phone-sized matrix columns',async()=>withDom(()=>{
 const names=Array.from({length:10},(_,i)=>i===0?'喫茶店めぐりと季節のお菓子が大好きな参加者二十文字':`参加者${i+1}`),boards=names.map((_,i)=>({playerId:`p${i+1}`,tiers:{S:['a'],A:['b'],B:[],C:[],D:[]}}));
 const nodes=descendants(createTierComparison({items,boards,participants:names.map((name,i)=>({id:`p${i+1}`,name})),participantCount:10})),headers=nodes.filter(node=>node.className==='tier-matrix-person');
 assert.equal(headers.length,10);
 assert.equal(headers[0].textContent,names[0]);assert.match(headers[0].getAttribute('style'),/max-width:88px/);assert.match(headers[0].getAttribute('style'),/overflow-wrap:anywhere/);
 assert.equal(headers[0].getAttribute('aria-label'),names[0]);
 const scroller=nodes.find(node=>node.className==='tier-matrix-scroll');assert.equal(scroller.getAttribute('aria-label'),'項目ごとのTier比較。横にスクロールできます。');
}));

test('both interactive and already-submitted Tier screens mount the returned DOM element, not its controller object',()=>{
 assert.match(screen,/const board=createTierBoard\(\{items:e\.question\.items,onSubmit:value=>send\('event_answer',\{value\}\)\}\);screen\.tierBoardController=board;screen\.append\(board\.element,button\('今回はパス'/);
 assert.match(screen,/const board=createTierBoard\(\{items:e\.question\.items,initial:value\.tiers\|\|value,disabled:true\}\);screen\.tierBoardController=board;screen\.append\(board\.element\)/);
});
