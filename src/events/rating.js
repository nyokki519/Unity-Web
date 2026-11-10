import {randomUUID} from 'node:crypto';
import {fail} from '../errors.js';
const text=(value,max)=>{if(typeof value!=='string'||![...value].length||[...value].length>max||!value.trim())fail('BAD_SETTINGS');return value.replace(/[\u0000-\u001f\u007f]/g,'').trim();};

export const RATING_CATEGORIES=Object.freeze(['センス格付け','AI画像格付け','芸術格付け','プロの仕事','骨董品鑑定','盛り付け格付け']);
export const RATING_RANKS=Object.freeze(['一流','二流','三流','四流','映す価値なし']);

export function validateRatingQuestion(input){
 if(!input||typeof input!=='object'||input.game!=='RATING'||!RATING_CATEGORIES.includes(input.category))fail('BAD_SETTINGS');
 if(input.difficulty!==undefined&&!['気軽','ひと工夫','じっくり'].includes(input.difficulty))fail('BAD_SETTINGS');
 const id=typeof input.id==='string'&&/^[\w-]{1,80}$/.test(input.id)?input.id:randomUUID();
 if(!input.choices||typeof input.choices!=='object'||Array.isArray(input.choices))fail('BAD_SETTINGS');
 const choices={};
 for(const key of ['A','B']){
  const choice=input.choices[key];if(!choice||typeof choice!=='object')fail('BAD_SETTINGS');
  const asset=text(choice.asset,200);if(!/^\/rating\/(?:verified\/)?[a-z0-9-]+\.(?:svg|png|jpe?g|webp)$/.test(asset))fail('BAD_SETTINGS');
  const row={label:text(choice.label,100),asset,alt:text(choice.alt,160)};
  if(choice.provenance){const p=choice.provenance;if(!['licensed','generated'].includes(p.kind))fail('BAD_SETTINGS');if(p.kind==='licensed'){if(!/^https:\/\//.test(p.sourceUrl||'')||!text(p.creator,160)||!text(p.license,80)||!text(p.attribution,300))fail('BAD_SETTINGS');row.provenance={kind:'licensed',sourceUrl:text(p.sourceUrl,300),creator:text(p.creator,160),license:text(p.license,80),attribution:text(p.attribution,300)};}else{row.provenance={kind:'generated',tool:text(p.tool,120),createdAt:text(p.createdAt,40),promptNote:text(p.promptNote,240)};}}
  choices[key]=row;
 }
 if(input.correct!=='A'&&input.correct!=='B')fail('BAD_SETTINGS');
 if(input.enabled!==undefined&&typeof input.enabled!=='boolean')fail('BAD_SETTINGS');
 const source=input.source;if(!source||!['original-created','verified-comparison'].includes(source.kind))fail('BAD_SETTINGS');if(source.kind==='verified-comparison'&&(!choices.A.provenance||!choices.B.provenance))fail('BAD_SETTINGS');if(typeof source.assetLicense!=='string'||!source.assetLicense.trim())fail('BAD_SETTINGS');
 return{id,game:'RATING',category:input.category,prompt:text(input.prompt,220),talkPrompt:text(input.talkPrompt,240),choices,correct:input.correct,explanation:text(input.explanation,500),source:{kind:source.kind,assetLicense:text(source.assetLicense,300),editorialNote:text(source.editorialNote||'本プロジェクト用オリジナル問題',300)},difficulty:input.difficulty||'気軽',enabled:input.enabled!==false};
}

export function validateRatingAnswer(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||!['A','B'].includes(value.choice))fail('INVALID_ANSWER');
 return{choice:value.choice};
}

export function ratingResult(event,room){
 const distribution={A:0,B:0},waitingRooms={A:[],B:[]};
 for(const id of event.participants){const answer=event.answers[id];if(!answer?.value)continue;const choice=answer.value.choice;distribution[choice]++;waitingRooms[choice].push(room.players[id]?.name||'参加者');}
 for(const id of event.participants){
  const answer=event.answers[id];if(!answer?.value)continue;
  const standing=event.ratingStandings[id];standing.total++;
  if(answer.value.choice===event.question.correct)standing.correct++;
  else standing.rankIndex=Math.min(RATING_RANKS.length-1,standing.rankIndex+1);
 }
 const ordered=event.participants.map(id=>({playerId:id,name:room.players[id]?.name||'参加者',...event.ratingStandings[id],rankLabel:RATING_RANKS[event.ratingStandings[id].rankIndex]})).sort((a,b)=>a.rankIndex-b.rankIndex||b.correct-a.correct||a.name.localeCompare(b.name,'ja'));
 let place=0,lastKey='';const standings=ordered.map((row,index)=>{const key=`${row.rankIndex}:${row.correct}`;if(key!==lastKey)place=index+1;lastKey=key;return{...row,place};});
 return{correctChoice:event.question.correct,explanation:event.question.explanation,distribution,waitingRooms,standings,sources:Object.fromEntries(Object.entries(event.question.choices).map(([key,choice])=>[key,choice.provenance||null]))};
}
