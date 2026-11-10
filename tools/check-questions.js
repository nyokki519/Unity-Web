import {validateQuestions,questions} from '../src/questions.js';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
console.log(`${validateQuestions()} questions validated`);
for(const mode of['ALIGN','PREDICT','LINE','RANK','AUCTION','QUICK'])console.log(`${mode}: ${questions.filter(q=>q.mode===mode).length}`);

const {eventQuestions,games}=await import('../src/events/catalog.js');
for(const game of Object.keys(games).filter(game=>game!=='RATING')){const count=eventQuestions.filter(q=>q.game===game).length;if(count<15)throw new Error('Missing event prompts '+game);console.log(game+': '+count+' event prompts');}
const rating=eventQuestions.filter(q=>q.game==='RATING'),enabled=rating.filter(q=>q.enabled),verified=enabled.filter(q=>q.source.kind==='verified-comparison');if(!enabled.length)throw new Error('No enabled RATING questions');console.log(`RATING: ${enabled.length} enabled / ${verified.length} evidence-verified questions (separate pool)`);
const originalRating=enabled.filter(q=>q.source.kind==='original-created'),seenPairs=new Map(),seenPrompts=new Map();
for(const q of originalRating){
 const promptKey=`${q.category}:${q.prompt}`;if(seenPrompts.has(promptKey))throw new Error(`Duplicate RATING prompt in ${q.category}: ${q.id} and ${seenPrompts.get(promptKey)}`);seenPrompts.set(promptKey,q.id);
 const assetDigests=[];
 for(const choice of Object.values(q.choices)){
  const local=resolve(process.cwd(),'public',choice.asset.replace(/^\//,''));if(!existsSync(local))throw new Error(`Missing RATING image: ${q.id} ${choice.asset}`);
  const bytes=readFileSync(local);assetDigests.push(createHash('sha256').update(bytes).digest('hex'));
  if(local.endsWith('.svg')){const svg=bytes.toString('utf8'),viewBox=svg.match(/viewBox=["']\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)\s*["']/i);if(!viewBox)throw new Error(`RATING SVG is missing viewBox: ${choice.asset}`);const ratio=Number(viewBox[3])/Number(viewBox[4]);if(ratio<1.3||ratio>1.8)throw new Error(`RATING SVG aspect ratio does not fit its image card: ${choice.asset} (${ratio.toFixed(2)})`);if(/<text\b/i.test(svg))throw new Error(`RATING practice artwork embeds text over the comparison image: ${choice.asset}`);}
 }
 const pairKey=assetDigests.sort().join(':');if(seenPairs.has(pairKey))throw new Error(`RATING practice image pair reused under a new answer key: ${q.id} and ${seenPairs.get(pairKey)}`);seenPairs.set(pairKey,q.id);
}
console.log(`RATING practice: ${originalRating.length} distinct prompt/image pairs; landscape artwork and embedded-text checks passed`);
