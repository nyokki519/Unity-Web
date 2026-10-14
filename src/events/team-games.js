import {fail} from '../errors.js';import {text} from './catalog.js';
export function cafeCost(q,selection){
 let total=0;for(const c of q.categories){const o=c.options.find(o=>o.id===selection?.[c.id]);if(!o)fail('INVALID_ANSWER');total+=o.cost;}return{total,remaining:q.budget-total,overBudget:total>q.budget};
}
export function validateTeamAnswer(game,q,value,draft=false){
 if(game==='QUEST')return text(value,300);
 const name=text(value?.name,40,draft),concept=text(value?.concept,300,draft);const selection={};for(const c of q.categories){const id=value?.selection?.[c.id];if(id===undefined&&draft)continue;if(!c.options.some(o=>o.id===id))fail('INVALID_ANSWER');selection[c.id]=id;}
 if(!draft&&cafeCost(q,selection).overBudget)fail('BUDGET_EXCEEDED');return{name,concept,selection};
}
export function teamResult(e){return{teams:e.teams.map(t=>({id:t.id,name:t.name,answer:e.answers[t.id]||{missing:true},approved:false,cost:e.gameId==='CAFE'&&e.answers[t.id]?.value?cafeCost(e.question,e.answers[t.id].value.selection):null}))};}
export function teamGameView(room,id){const e=room.event,t=e.teams.find(t=>t.memberIds.includes(id));return{teams:e.teams.map(t=>({id:t.id,name:t.name,memberIds:t.memberIds,captainId:t.captainId})),team:t?{id:t.id,name:t.name,captainId:t.captainId,memberIds:t.memberIds,draft:e.gameId==='CAFE'&&e.phase==='CONSULT'?t.draft||null:null}:null};}
