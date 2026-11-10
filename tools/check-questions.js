import {validateQuestions,questions} from '../src/questions.js';
console.log(`${validateQuestions()} questions validated`);
for(const mode of['ALIGN','PREDICT','LINE','RANK','AUCTION','QUICK'])console.log(`${mode}: ${questions.filter(q=>q.mode===mode).length}`);

const {eventQuestions,games}=await import('../src/events/catalog.js');
for(const game of Object.keys(games).filter(game=>game!=='RATING')){const count=eventQuestions.filter(q=>q.game===game).length;if(count<15)throw new Error('Missing event prompts '+game);console.log(game+': '+count+' event prompts');}
const rating=eventQuestions.filter(q=>q.game==='RATING'),enabled=rating.filter(q=>q.enabled),verified=enabled.filter(q=>q.source.kind==='verified-comparison');if(!enabled.length)throw new Error('No enabled RATING questions');console.log(`RATING: ${enabled.length} enabled / ${verified.length} evidence-verified questions (separate pool)`);
