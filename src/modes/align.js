import { requireValue, entries, choiceScores } from './shared.js';
export default {
  validate(q, value) { requireValue(value === 'a' || value === 'b'); return value; },
  result(q, round, players) {
    const rows = entries(round, players);
    const groups = ['a','b'].map(key => rows.filter(r => r.value === key).map(r => ({ id:r.id, name:r.name })));
    return { kind:'ALIGN', choices:q.choices, counts:groups.map(g=>g.length), percentages:groups.map(g=>rows.length ? Math.round(g.length / rows.length * 100) : 0), groups, total:rows.length };
  },
  scores(q, value) { return choiceScores(q, value); }
};
