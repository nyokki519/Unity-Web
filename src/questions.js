import { readFileSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import { modes } from './modes/index.js';
export const questions = JSON.parse(readFileSync(new URL('../data/questions.json', import.meta.url)));
export const catalog = JSON.parse(readFileSync(new URL('../data/catalog.json', import.meta.url)));
export function validateQuestions() {
  const ids = new Set();
  for (const q of questions) {
    if (ids.has(q.id) || !q.id || !modes[q.mode] || !catalog.categories[q.category] || !['LIGHT','BALANCED','DEEP'].includes(q.depth) || !q.question || !Array.isArray(q.choices) || !q.talkPrompt || !q.valueTags) throw new Error(`Invalid question: ${q.id}`);
    ids.add(q.id);
    if (['ALIGN','PREDICT','LINE'].includes(q.mode) && q.choices.length !== 2) throw new Error(`Two choices needed: ${q.id}`);
    if (['RANK','AUCTION'].includes(q.mode) && (q.choices.length < 3 || new Set(q.choices.map(c=>c.id)).size!==q.choices.length)) throw new Error(`Invalid items: ${q.id}`);
    for (const tag of Object.values(q.valueTags).flat()) if (!catalog.values[tag]) throw new Error(`Invalid value tag: ${tag}`);
  }
  return questions.length;
}
validateQuestions();
export function pool(settings, mode, used=[]) {
  const depths = settings.depth==='LIGHT' ? ['LIGHT'] : settings.depth==='BALANCED' ? ['LIGHT','BALANCED'] : ['BALANCED','DEEP'];
  return questions.filter(q=>q.enabled!==false&&q.mode===mode&&depths.includes(q.depth)&&(!settings.category||settings.category==='ALL'||q.category===settings.category)&&!used.includes(q.id));
}
export function drawQuestion(settings,index,used) {
  const preferred=settings.mode==='MIX' ? Object.keys(modes)[index % 6] : settings.mode;
  const candidates=[preferred,...Object.keys(modes).filter(m=>m!==preferred)];
  for (const mode of settings.mode==='MIX' ? candidates : [preferred]) {
    const available=pool(settings,mode,used);
    if (available.length) return structuredClone(available[randomInt(available.length)]);
  }
  return null;
}
