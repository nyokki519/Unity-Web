import {validateQuestions,questions} from '../src/questions.js';
console.log(`${validateQuestions()} questions validated`);
for(const mode of['ALIGN','PREDICT','LINE','RANK','AUCTION','QUICK'])console.log(`${mode}: ${questions.filter(q=>q.mode===mode).length}`);
