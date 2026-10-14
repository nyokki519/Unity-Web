import {answerRenderers} from '../answer.js';
import {resultRenderers} from '../results.js';
import {el,field} from '../dom.js';
export function narrativeInput(game,draft,submit){
 const wrap=el('div','event-input');
 if(game==='STORY'){
  draft.value??={title:'',text:''};const title=el('input');title.name='story-title';title.maxLength=80;title.value=draft.value.title;title.addEventListener('input',()=>{draft.value.title=title.value;check();});wrap.append(field('見出し（40文字以内）',title),el('p','muted','きっかけ → 起きたこと → 今思うこと。答えにくい体験は書かず、パスできます。'));
 }else draft.value??='';
 const area=el('textarea');area.name='event-text';area.rows=game==='STORY'?8:4;area.value=game==='STORY'?draft.value.text:draft.value;
 const limit=game==='STORY'?600:120;area.maxLength=limit*2;const count=el('p','small muted');count.setAttribute('role','status');
 const check=()=>{const v=game==='STORY'?draft.value.text:draft.value;count.textContent=`${[...v].length} / ${limit}文字`;submit.disabled=!v.trim()||[...v].length>limit||(game==='STORY'&&(!draft.value.title.trim()||[...draft.value.title].length>40));};
 area.addEventListener('input',()=>{if(game==='STORY')draft.value.text=area.value;else draft.value=area.value;check();});wrap.append(field(game==='STORY'?'体験談（600文字以内）':'匿名の答え（120文字以内）',area),count);check();return wrap;
}
export function individualInput(e,draft,submit){if(['WHO','STORY'].includes(e.gameId))return narrativeInput(e.gameId,draft,submit);return answerRenderers[e.gameId==='VALUES'?'RANK':'LINE'](e.question,draft,submit);}
export function individualResults(e,state){const fake={...state,round:{ownAnswer:e.ownAnswer}};const wrap=resultRenderers[e.gameId==='VALUES'?'RANK':'LINE'](e.result,fake);if(e.gameId==='VALUES')for(const row of e.result.ranking)wrap.append(el('p','small muted',`${row.label}：${row.distribution.map((n,i)=>`${i+1}位 ${n}人`).join(' / ')}`));return wrap;}
