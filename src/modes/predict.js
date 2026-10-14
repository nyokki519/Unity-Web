import { requireValue, entries, choiceScores } from './shared.js';
export default {
  validate(q, value) { requireValue(value === 'a' || value === 'b'); return value; },
  result(q, round, players) {
    const rows = entries(round, players); const actual = rows.find(r=>r.id===round.targetId)?.value ?? null;
    const predictions = rows.filter(r=>r.id!==round.targetId).map(r=>({name:r.name, correct:actual === null ? null : r.value===actual}));
    return { kind:'PREDICT', choices:q.choices, target:{id:round.targetId,name:players[round.targetId]?.name||'参加者'}, actual, correct:predictions.filter(p=>p.correct).length, total:predictions.length, predictions };
  },
  scores(q, value, id, round) { return id===round.targetId ? choiceScores(q,value) : {}; }
};
