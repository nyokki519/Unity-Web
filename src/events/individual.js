import RANK from '../modes/rank.js';
import LINE from '../modes/line.js';
export function validateIndividual(q,value){return(q.game==='VALUES'?RANK:LINE).validate(q,value);}
export function individualResult(q,answers){
 const clean=Object.fromEntries(Object.entries(answers).filter(([,a])=>!a.skip&&!a.hidden));const round={answers:clean,participants:Object.keys(clean)};const players=Object.fromEntries(round.participants.map(id=>[id,{name:''}]));
 if(q.game==='BOUNDARY')return LINE.result(q,round,players);
 const result=RANK.result(q,round,players);for(const r of result.ranking)r.distribution=q.choices.map((_,i)=>Object.values(clean).filter(a=>a.value[i]===r.id).length);return result;
}
