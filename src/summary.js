import { modes } from './modes/index.js';
import { catalog } from './questions.js';
export function summarize(room, viewerId, now=Date.now()) {
  const observations = {};
  for (const item of room.history) {
    const q=item.question;
    for (const [id,answer] of Object.entries(item.answers)) {
      if (answer.skip || !item.participants.includes(id)) continue;
      const scores=modes[q.mode].scores(q,answer.value,id,item);
      const own=observations[id] ||= {};
      for (const [tag,score] of Object.entries(scores)) (own[tag] ||= []).push(score);
    }
  }
  const perPlayer=Object.fromEntries(Object.entries(observations).map(([id,tags])=>[id,Object.fromEntries(Object.entries(tags).map(([tag,vs])=>[tag,{score:Math.round(vs.reduce((a,b)=>a+b,0)/vs.length),observations:vs.length}]))]));
  const build=values=>Object.entries(values).map(([id,v])=>({id,label:catalog.values[id],...v})).sort((a,b)=>b.score-a.score);
  const group={};
  for (const tag of Object.keys(catalog.values)) {
    const players=Object.values(perPlayer).filter(p=>p[tag]);
    if (players.length) group[tag]={score:Math.round(players.reduce((s,p)=>s+p[tag].score,0)/players.length),observations:players.reduce((s,p)=>s+p[tag].observations,0),people:players.length};
  }
  const people=new Set(room.history.flatMap(h=>h.participants)).size;
  const groupValues=build(group), ownValues=build(perPlayer[viewerId]||{});
  const message=values=>values.length ? `今回は「${values[0].label}」${values[1] ? `や「${values[1].label}」` : ''}を大切にする回答が見られました。` : '今日は言葉を交わす時間が中心でした。印象に残った話を、もう一度。';
  return {people,questions:room.history.length,minutes:Math.max(1,Math.round(((room.endedAt||now)-(room.startedAt||now))/60000)),date:new Date(room.startedAt||now).toISOString(),group:{values:groupValues,message:message(groupValues)},own:{values:ownValues,message:message(ownValues)},note:'性格診断ではありません。このゲームでの選択傾向だけをまとめています。二択は選択率、LINEは位置、RANKは順位の得点、AUCTIONは配分率を使い、個人内で平均してからグループを平均しています。PREDICTは本人の回答だけを集計。項目の数値は互いに合計100にはなりません。'};
}
