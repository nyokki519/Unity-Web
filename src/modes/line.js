import { requireValue, entries, average, tagged } from './shared.js';
export default {
  validate(q, value) { requireValue(Number.isInteger(value) && value>=0 && value<=100); return value; },
  result(q, round, players) {
    const positions = entries(round,players).map(r=>r.value).sort((a,b)=>a-b);
    return {kind:'LINE', choices:q.choices, positions, average:average(positions), min:positions[0]??null, max:positions.at(-1)??null,total:positions.length};
  },
  scores(q, value) { return {...tagged(q.valueTags.low,100-value),...tagged(q.valueTags.high,value)}; }
};
