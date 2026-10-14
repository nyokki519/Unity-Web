import {validateQuestions,questions} from '../src/questions.js';
console.log(`${validateQuestions()} questions validated`);
for(const mode of['ALIGN','PREDICT','LINE','RANK','AUCTION','QUICK'])console.log(`${mode}: ${questions.filter(q=>q.mode===mode).length}`);

const {eventQuestions,games}=await import('../src/events/catalog.js');
for(const game of Object.keys(games)){const count=eventQuestions.filter(q=>q.game===game).length;if(count<15)throw new Error('Missing event prompts '+game);console.log(game+': '+count+' event prompts');}
