import { requireValue, entries } from './shared.js';
export default {
  validate(q,value) { const ids=q.choices.map(c=>c.id);requireValue(Array.isArray(value)&&value.length===ids.length&&new Set(value).size===ids.length&&value.every(id=>ids.includes(id)));return [...value]; },
  result(q,round,players) {
    const rows=entries(round,players);
    const ranking=q.choices.map(c=>({...c,averageRank:rows.length ? Math.round(rows.reduce((sum,r)=>sum+r.value.indexOf(c.id)+1,0)/rows.length*10)/10 : 0,first:rows.filter(r=>r.value[0]===c.id).length})).sort((a,b)=>a.averageRank-b.averageRank);
    return {kind:'RANK',ranking,total:rows.length};
  },
  scores(q,value) { return Object.fromEntries(value.flatMap((id,i)=>Object.entries(tagged(q.valueTags[id],Math.round((value.length-1-i)/(value.length-1)*100))))); }
};
function tagged(tags,score) {return Object.fromEntries((tags||[]).map(t=>[t,score]));}
