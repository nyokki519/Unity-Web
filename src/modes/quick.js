import { requireValue, entries } from './shared.js';
export default {
  validate(q,value) {requireValue(typeof value==='string' && value.length<=200);return value.trim();},
  result(q,round,players) {return {kind:'QUICK',answers:entries(round,players).map(r=>({name:r.name,text:r.value||'口頭で話します'}))};},
  scores() {return {};}
};
