import {isScaleValue,positionPercent} from '../../public/js/scale.js';
import { requireValue, entries, average, tagged } from './shared.js';
export default {
  validate(q, value) { requireValue(isScaleValue(q,value)); return value; },
  result(q, round, players) {
    const positions = entries(round,players).map(r=>r.value).sort((a,b)=>a-b);
    return {kind:'LINE', choices:q.choices, positions, ...(q.scale?{scale:q.scale}:{}), average:q.scale&&positions.length?Number((positions.reduce((a,b)=>a+b,0)/positions.length).toFixed(10)):average(positions), min:positions[0]??null, max:positions.at(-1)??null,total:positions.length};
  },
  scores(q, value) {const normalized=positionPercent(q,value);return {...tagged(q.valueTags.low,100-normalized),...tagged(q.valueTags.high,normalized)}; }
};
