import { requireValue, entries, average, tagged } from './shared.js';
export default {
  validate(q,value) { requireValue(value && typeof value==='object' && !Array.isArray(value));const ids=q.choices.map(c=>c.id);requireValue(Object.keys(value).length===ids.length&&ids.every(id=>Number.isInteger(value[id])&&value[id]>=0&&value[id]<=100)&&ids.reduce((s,id)=>s+value[id],0)===100);return Object.fromEntries(ids.map(id=>[id,value[id]])); },
  result(q,round,players) { const rows=entries(round,players);return {kind:'AUCTION',allocation:q.choices.map(c=>({...c,average:average(rows.map(r=>r.value[c.id]))})).sort((a,b)=>b.average-a.average),total:rows.length}; },
  scores(q,value) {return Object.fromEntries(Object.entries(value).flatMap(([id,score])=>Object.entries(tagged(q.valueTags[id],score))));}
};
