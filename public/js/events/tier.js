import {el,button} from '../dom.js';

export const TIER_ORDER=Object.freeze(['S','A','B','C','D']);
const TIER_LABELS=Object.freeze({S:'最高',A:'かなり好き',B:'いいね',C:'ふつう',D:'自分には合わない'});
let cssRequested=false;
export function ensureTierStyles(){if(cssRequested||typeof document==='undefined')return;cssRequested=true;const link=el('link');link.rel='stylesheet';link.href='/js/events/tier.css';document.head.append(link);}
const escapeText=value=>String(value??'');
function normalizeBoard(items,value={}){const result={};if(TIER_ORDER.some(t=>Array.isArray(value[t]))){for(const tier of TIER_ORDER)for(const id of value[tier]||[])result[String(id)]=tier;return result;}for(const item of items){const tier=value[String(item.id)];if(TIER_ORDER.includes(tier))result[String(item.id)]=tier;}return result;}
function boardRows(items,tiers){const result=Object.fromEntries(TIER_ORDER.map(tier=>[tier,[]]));for(const item of items){const tier=tiers[String(item.id)];if(result[tier])result[tier].push(String(item.id));}return result;}

export function validateTierBoard(items,tiers){
 if(!Array.isArray(items)||!items.length)throw new TypeError('items are required');
 if(!tiers||typeof tiers!=='object'||Array.isArray(tiers))throw new TypeError('tiers are required');
 const normalized=normalizeBoard(items,tiers),allowed=new Set(items.map(item=>String(item.id)));
 for(const key of Object.keys(tiers))if(!TIER_ORDER.includes(key)&&!allowed.has(key))throw new Error(`unknown item: ${key}`);
 for(const [id,tier]of Object.entries(tiers))if(!TIER_ORDER.includes(id)&&allowed.has(id)&&!TIER_ORDER.includes(tier))throw new Error(`invalid tier for ${id}`);
 const seen=new Set();for(const tier of TIER_ORDER)for(const id of tiers[tier]||[]){if(seen.has(String(id)))throw new Error(`duplicate item: ${id}`);seen.add(String(id));}
 for(const id of Object.keys(normalized))if(!allowed.has(id))throw new Error(`unknown item: ${id}`);
 for(const tier of TIER_ORDER)for(const id of tiers[tier]||[])if(!allowed.has(String(id)))throw new Error(`unknown item: ${id}`);
 for(const item of items){const id=String(item.id);if(!Object.hasOwn(normalized,id))throw new Error(`missing item: ${id}`);if(!TIER_ORDER.includes(normalized[id]))throw new Error(`invalid tier for ${id}`);}
 if(Object.keys(normalized).length!==items.length)throw new Error('unknown items');
 return true;
}

export function summarizeTierBoards(items,submissions){
 if(!Array.isArray(items)||!Array.isArray(submissions))throw new TypeError('items and submissions must be arrays');
 const n=submissions.length,rows={};let agreementTotal=0,comparisons=0;
 for(const item of items){
  const distribution=Object.fromEntries(TIER_ORDER.map(tier=>[tier,0]));
  for(const entry of submissions){const tier=normalizeBoard(items,entry.tiers)[String(item.id)];if(TIER_ORDER.includes(tier))distribution[tier]++;}
  const max=Math.max(0,...Object.values(distribution)),leaders=TIER_ORDER.filter(tier=>distribution[tier]===max&&max>0);
  const samePairs=TIER_ORDER.reduce((sum,tier)=>sum+distribution[tier]*(distribution[tier]-1)/2,0),totalPairs=n*(n-1)/2;
  agreementTotal+=totalPairs?samePairs/totalPairs:1;comparisons++;
  const active=TIER_ORDER.map(tier=>distribution[tier]).filter(count=>count>0);rows[item.id]={distribution,majority:leaders.length===1?leaders[0]:null,minorityCount:active.length?Math.min(...active):0};
 }
 return {participantCount:n,agreement:comparisons?Math.round(100*agreementTotal/comparisons):0,items:rows};
}

function tierCountText(tiers,items){return `${Object.keys(tiers).length} / ${items.length} 枚配置済み`;}
export function createTierBoard({items,initial={},disabled=false,onSubmit=()=>{}}){
 ensureTierStyles();
 const root=el('section','tier-playfield'),placed=normalizeBoard(items,initial);
 root.setAttribute('aria-label','Tier表の回答');
 let selected=null,locked=Boolean(disabled),submitted=false,focusPickerNext=false,restoreItemFocus=null,restoreSubmitFocus=false;
 const render=()=>{
  const focusPicker=focusPickerNext,focusItem=restoreItemFocus,focusSubmit=restoreSubmitFocus;focusPickerNext=false;restoreItemFocus=null;restoreSubmitFocus=false;
  root.replaceChildren();root.classList.toggle('is-locked',locked);
  const header=el('div','tier-board-head');header.append(el('span','tier-stage','CAFÉ MIX · ROUND 01'),el('span','tier-live','● YOUR BOARD'));root.append(header);
  const instruction=el('p','tier-instruction',locked?'提出済み · みんなの確定を待っています':'カードをつかんで移動。カードをタップしてからTierを選んでもOK');root.append(instruction);
  const count=el('p','tier-count',tierCountText(placed,items));count.setAttribute('role','status');root.append(count);
  const board=el('div','tier-board');board.setAttribute('aria-label','Tier表');
  for(const tier of TIER_ORDER){
   const row=el('section',`tier-row tier-${tier.toLowerCase()}`);row.dataset.tier=tier;
   const label=button('',()=>placeSelected(tier),'tier-label');label.disabled=locked;label.setAttribute('aria-label',`${tier} tier、${TIER_LABELS[tier]}。選択中カードをここに配置`);label.append(el('strong','',tier),el('small','',TIER_LABELS[tier]));row.append(label);
   const cells=el('div','tier-cells');cells.dataset.tier=tier;cells.setAttribute('aria-label',`${tier} Tierのカード`);
   cells.addEventListener('dragover',event=>{if(!locked){event.preventDefault();cells.classList.add('drop-hover');}});
   cells.addEventListener('dragleave',()=>cells.classList.remove('drop-hover'));
   cells.addEventListener('drop',event=>{event.preventDefault();cells.classList.remove('drop-hover');move(event.dataTransfer?.getData('text/plain'),tier);});
   for(const item of items)if(placed[item.id]===tier)cells.append(itemCard(item));
   row.append(cells);board.append(row);
  }
  root.append(board);
  const unassigned=items.filter(item=>!placed[item.id]);
  const tray=el('section','tier-tray');tray.append(el('div','tier-tray-head',`まだ置いていないカード · ${unassigned.length}`));
  const trayCards=el('div','tier-tray-cards');trayCards.dataset.tier='tray';trayCards.addEventListener('dragover',event=>{if(!locked){event.preventDefault();trayCards.classList.add('drop-hover');}});trayCards.addEventListener('dragleave',()=>trayCards.classList.remove('drop-hover'));trayCards.addEventListener('drop',event=>{event.preventDefault();trayCards.classList.remove('drop-hover');const id=event.dataTransfer?.getData('text/plain');if(id&&Object.hasOwn(placed,id)){delete placed[id];selected=null;render();}});
  for(const item of unassigned)trayCards.append(itemCard(item));
  if(!unassigned.length)trayCards.append(el('p','tier-all-placed','すべてのカードを置きました。Tierを見直してから確定できます。'));
  tray.append(trayCards);root.append(tray);
  if(selected){const picker=el('div','tier-picker');picker.setAttribute('role','group');picker.setAttribute('aria-label','選択中のカードを配置するTier');picker.append(el('span','tier-picker-prompt',`${items.find(item=>String(item.id)===selected)?.label||'カード'}を移動`));for(const tier of TIER_ORDER)picker.append(button(tier,()=>placeSelected(tier),`tier-pick tier-${tier.toLowerCase()}`));picker.append(button('戻す',unassignSelected,'tier-unassign'));root.append(picker);}
  const submit=button(submitted?'確定しました ✓':'このTier表で確定',()=>{if(locked||unassigned.length)return;validateTierBoard(items,placed);submitted=true;locked=true;restoreSubmitFocus=true;render();onSubmit({tiers:boardRows(items,placed)});},'tier-submit');submit.disabled=locked||unassigned.length>0;root.append(submit);
  if(submitted)root.append(el('p','tier-waiting','みんなの確定を待っています。結果が出たら、まずは違いを見つけよう。'));
  if(focusPicker)root.querySelector('.tier-picker .tier-pick')?.focus();else if(focusItem)Array.from(root.querySelectorAll('[data-item]')).find(node=>node.dataset.item===focusItem)?.focus();else if(focusSubmit)root.querySelector('.tier-submit')?.focus();
 };
 function itemCard(item){const card=button(item.label,()=>{if(locked)return;selected=String(item.id);focusPickerNext=true;render();},`tier-item${selected===String(item.id)?' is-selected':''}`);card.dataset.item=String(item.id);card.disabled=locked;card.draggable=!locked;card.setAttribute('aria-pressed',String(selected===String(item.id)));card.setAttribute('aria-label',`${item.label}${placed[item.id]?`、${placed[item.id]} tier`:''}。タップして選択し、Tierを選ぶ`);card.addEventListener('dragstart',event=>{if(locked){event.preventDefault();return;}event.dataTransfer?.setData('text/plain',String(item.id));if(event.dataTransfer)event.dataTransfer.effectAllowed='move';});return card;}
 function move(id,tier){if(locked||!id||!items.some(item=>String(item.id)===id)||!TIER_ORDER.includes(tier))return;placed[id]=tier;selected=null;restoreItemFocus=id;render();}
 function placeSelected(tier){if(selected)move(selected,tier);}
 function unassignSelected(){if(selected){restoreItemFocus=selected;delete placed[selected];selected=null;render();}}
 render();return {element:root,get tiers(){return {...placed};},get complete(){return items.every(item=>TIER_ORDER.includes(placed[item.id]));},get submitted(){return submitted;},setLocked(value){locked=Boolean(value);render();}};
}

export function createTierComparison({items,submissions,boards,summary,participants=[],participantCount}){
 ensureTierStyles();const root=el('section','tier-results'),entries=boards||submissions||[],calculated=summary||summarizeTierBoards(items,entries),agreement=calculated.agreementPct??calculated.agreement??0,responded=calculated.participantCount??entries.length,total=participantCount??responded;root.setAttribute('aria-label','みんなのTier比較結果');
 root.append(el('p','tier-stage','CAFÉ MIX · REVEAL'),el('h2','tier-results-title','みんなのTierを、見比べよう'),el('p','tier-agreement',`${calculated.agreementPct==null&&calculated.agreement==null?'一致率 —（2人以上で表示）':`一致率 ${agreement}%`} · 回答 ${responded} / 参加 ${total}人`));
 const shared=el('section','tier-majority');shared.append(el('h3','','みんなの真ん中'));
 const infos=Array.isArray(calculated.items)?Object.fromEntries(calculated.items.map(info=>[info.id,info])):calculated.items||{};
 const strip=el('div','tier-majority-strip');for(const item of items){const info=infos[item.id]||{},majority=info.majorityTier??info.majority??(info.majorityTiers?.length===1?info.majorityTiers[0]:null),counts=info.counts||info.distribution||{},count=majority?(counts[majority]??0):0,minorityCount=Array.isArray(info.minorityTiers)?info.minorityTiers.reduce((sum,tier)=>sum+(counts[tier]||0),0):(info.minorityCount||0),caption=majority?(minorityCount?`少数派 ${minorityCount}人`:'全員一致'):entries.length===1?'比較できません':entries.length?(info.majorityTiers?.length>1?'同数で分かれた':'票が分かれた'):'回答なし';const piece=el('article',`tier-majority-item${majority?' tier-'+majority.toLowerCase():''}`);piece.append(el('strong','',majority||'—'),el('span','',item.label),el('small','',majority?`${count}人の多数派 · ${caption}`:caption));strip.append(piece);}shared.append(strip);root.append(shared);
 const list=el('div','tier-submission-list');entries.forEach((entry,index)=>{const participant=participants.find(p=>p.id===(entry.playerId??entry.id)),name=participant?.name||entry.name||`参加者 ${index+1}`,tiers=normalizeBoard(items,entry.tiers);const details=el('details','tier-submission');if(index===0)details.open=true;const summaryEl=el('summary');summaryEl.append(el('span','tier-avatar',String(index+1).padStart(2,'0')),el('strong','',name),el('span','tier-submission-hint','タップして表を見る'));details.append(summaryEl);const board=el('div','tier-mini-board');for(const tier of TIER_ORDER){const row=el('section',`tier-mini-row tier-${tier.toLowerCase()}`);row.append(el('strong','',tier));const cell=el('div','tier-mini-items');for(const item of items)if(tiers[String(item.id)]===tier)cell.append(el('span','tier-mini-item',item.label));row.append(cell);board.append(row);}details.append(board);list.append(details);});root.append(list);
 root.append(button('比較結果を画像で保存',()=>saveTierImage({items,entries,participants,calculated,agreement}),'tier-image-button'));return root;
}

function saveTierImage({items,entries,participants,calculated,agreement}){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),width=1200,rowHeight=72,boardHeight=5*rowHeight+86,height=240+Math.max(1,entries.length)*boardHeight+60;canvas.width=width;canvas.height=height;
 ctx.fillStyle='#102a25';ctx.fillRect(0,0,width,height);ctx.fillStyle='#28564a';ctx.fillRect(0,0,width,190);ctx.strokeStyle='#c89c57';ctx.lineWidth=3;ctx.strokeRect(18,18,width-36,height-36);
 ctx.fillStyle='#e2c98f';ctx.font='700 20px system-ui, sans-serif';ctx.fillText('UNITY MIX  /  CAFÉ TIER MEETING',48,58);ctx.fillStyle='#fff8e8';ctx.font='800 42px system-ui, sans-serif';ctx.fillText('みんなのTier会議',48,116);ctx.font='600 22px system-ui, sans-serif';ctx.fillStyle='#e8e0ce';ctx.fillText(`一致率 ${calculated.agreementPct==null&&calculated.agreement==null?'—':`${agreement}%`}　·　${calculated.participantCount??entries.length}人`,48,158);
 let y=215;const names=entries.map((entry,index)=>participants.find(p=>p.id===(entry.playerId??entry.id))?.name||entry.name||`参加者 ${index+1}`);
 if(!entries.length){ctx.fillStyle='#fff8e8';ctx.font='600 24px system-ui, sans-serif';ctx.fillText('今回は回答がありませんでした。',48,y+40);}
 entries.forEach((entry,index)=>{ctx.fillStyle='#183e35';ctx.beginPath();ctx.roundRect(32,y,width-64,boardHeight-12,18);ctx.fill();ctx.fillStyle='#f5f0e5';ctx.font='800 24px system-ui, sans-serif';ctx.fillText(names[index],54,y+38);const tiers=normalizeBoard(items,entry.tiers);let ry=y+52;for(const tier of TIER_ORDER){const color={S:'#ff7d85',A:'#ffc07d',B:'#f6ed72',C:'#9de783',D:'#73b4ef'}[tier];ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(48,ry,54,54,8);ctx.fill();ctx.fillStyle='#19211e';ctx.font='900 27px Georgia, serif';ctx.fillText(tier,64,ry+37);ctx.fillStyle='#fff8e8';ctx.font='600 18px system-ui, sans-serif';const labels=items.filter(item=>tiers[String(item.id)]===tier).map(item=>item.label).join('　·　')||'—';ctx.fillText(labels.length>92?`${labels.slice(0,90)}…`:labels,118,ry+32,1015);ry+=rowHeight;}
 y+=boardHeight;});
 canvas.toBlob(async blob=>{if(!blob)return;const file=new File([blob],'unity-mix-tier-result.png',{type:'image/png'});try{if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'みんなのTier会議'});return;}}catch(error){if(error?.name==='AbortError')return;}const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='unity-mix-tier-result.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},'image/png');
}
