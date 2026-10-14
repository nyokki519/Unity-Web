import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {fail} from '../errors.js';
export const games={VALUES:{name:'価値観ランキング',rule:'選択肢を並べ替え、平均順位と匿名分布を見て話します。個別順位は本人だけに表示。',seconds:90},WHO:{name:'この回答、誰でしょう？',rule:'120文字以内の匿名回答を一件ずつ予想。予想締切後に正解を公開して本人が話します。自分の回答への投票は禁止。',seconds:90},BOUNDARY:{name:'みんなの境界線',rule:'0〜100で回答し、締切後に匿名分布を見ます。名前と数値は紐づけて公開しません。自分の数値を話すかは自由。',seconds:90},QUEST:{name:'共通点クエスト',rule:'チームで対面相談して代表が提出。締切後に公開し、司会が承認します。',seconds:180},CAFE:{name:'架空のカフェ会議',rule:'チームで予算内のカフェ案を相談。代表の下書きは同チームだけに共有します。好みに正解・不正解はありません。',seconds:180},STORY:{name:'エピソードの持ち主',rule:'見出しと600文字以内の体験談を匿名で提出。一件ずつ読んで予想し、正解後は本人とじっくり話します。自分の回答への投票は禁止。',seconds:180}};
export const teamGame=g=>['QUEST','CAFE'].includes(g);
export const guessGame=g=>['WHO','STORY'].includes(g);
export const text=(value,max,optional=false)=>{if(typeof value!=='string'||[...value].length>max||(!optional&&!value.trim()))fail('INVALID_ANSWER');return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim();};
export function validateEventQuestion(input){
 if(!input||!games[input.game])fail('BAD_SETTINGS');
 const q={id:typeof input.id==='string'&&/^[\w-]{1,80}$/.test(input.id)?input.id:randomUUID(),game:input.game,prompt:text(input.prompt,200),talkPrompt:text(input.talkPrompt,200),difficulty:input.difficulty||'気軽',enabled:input.enabled!==false};
 if(!['気軽','ひと工夫','じっくり'].includes(q.difficulty))fail('BAD_SETTINGS');
 if(q.game==='VALUES'){
  if(!Array.isArray(input.choices)||input.choices.length<4||input.choices.length>5)fail('BAD_SETTINGS');
  q.choices=input.choices.map(c=>({id:text(c.id,30),label:text(c.label,80)}));if(new Set(q.choices.map(c=>c.id)).size!==q.choices.length)fail('BAD_SETTINGS');
 }
 if(q.game==='BOUNDARY'){if(!Array.isArray(input.choices)||input.choices.length!==2)fail('BAD_SETTINGS');q.choices=input.choices.map(c=>text(c,80));}
 if(q.game==='CAFE'){
  if(!Number.isInteger(input.budget)||input.budget<1||input.budget>10000)fail('BAD_SETTINGS');q.budget=input.budget;
  q.categories=['location','menu','interior'].map(id=>{
   const c=input.categories?.find(c=>c.id===id);if(!c||!Array.isArray(c.options)||c.options.length<2||c.options.length>8)fail('BAD_SETTINGS');
   const options=c.options.map(o=>{if(!Number.isInteger(o.cost)||o.cost<0||o.cost>10000)fail('BAD_SETTINGS');return{id:text(o.id,30),label:text(o.label,80),cost:o.cost};});
   if(new Set(options.map(o=>o.id)).size!==options.length)fail('BAD_SETTINGS');return{id,label:text(c.label,40),options};
  });if(q.categories.reduce((n,c)=>n+Math.min(...c.options.map(o=>o.cost)),0)>q.budget)fail('BAD_SETTINGS');
 }
 return q;
}
export const eventQuestions=JSON.parse(readFileSync(new URL('../../data/event-questions.json',import.meta.url))).map(validateEventQuestion);
export function questionsFor(event,gameId){return event.questions.filter(q=>q.game===gameId&&q.enabled&&(!event.options.difficulty||event.options.difficulty==='すべて'||q.difficulty===event.options.difficulty));}
export function optionsFor(gameId,input={}){
 if(!games[gameId])fail('BAD_SETTINGS');const o={roundLimit:input.roundLimit??(guessGame(gameId)?1:3),itemLimit:input.itemLimit??(gameId==='STORY'?4:6),seconds:input.seconds??games[gameId].seconds,guessSeconds:input.guessSeconds??45,teamCount:input.teamCount??2,difficulty:input.difficulty??'すべて'};
 if(!Number.isInteger(o.itemLimit)||o.itemLimit<1||o.itemLimit>15||!Number.isInteger(o.roundLimit)||o.roundLimit<1||o.roundLimit>15||!Number.isInteger(o.seconds)||o.seconds<30||o.seconds>600||!Number.isInteger(o.guessSeconds)||o.guessSeconds<30||o.guessSeconds>600||!Number.isInteger(o.teamCount)||o.teamCount<2||o.teamCount>4||!['すべて','気軽','ひと工夫','じっくり'].includes(o.difficulty))fail('BAD_SETTINGS');return o;
}
