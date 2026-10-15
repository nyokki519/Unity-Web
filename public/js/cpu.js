import {el,button} from './dom.js';
export function cpuControls(send){
 const section=el('section','cpu-controls');section.setAttribute('aria-label','CPUテスト参加者');
 section.append(el('h2','','ひとりで動作確認'),el('p','small muted','CPUを加えると、1台で回答・公開・次ラウンドを試せます。追加・削除は待合室で司会だけが操作できます。'));
 const actions=el('div','cpu-actions');
 for(const [label,action,data]of [['CPUを1人追加','cpu_add',{count:1}],['合計6人にする','cpu_add',{total:6}],['合計15人にする','cpu_add',{total:15}],['CPUをすべて削除','cpu_clear',{}]]){
  const b=button(label,()=>send(action,data),'button secondary');b.dataset.cpuAction=action;if(data.total)b.dataset.cpuTotal=data.total;actions.append(b);
 }
 const count=el('p','small muted');count.id='cpu-count';count.setAttribute('role','status');section.append(actions,count);return section;
}
export function updateCpuNotice(state){
 const count=state.players.filter(p=>p.cpu).length;let note=document.querySelector('#cpu-notice');
 if(!count){note?.remove();return;}
 if(!note){note=el('aside','cpu-notice');note.id='cpu-notice';document.querySelector('#main').prepend(note);}
 note.textContent=`CPUテスト中：人${state.players.length-count}人＋CPU${count}人。CPUは自動回答します。自由回答・共通点・体験談・カフェ案は架空のサンプルです。`;
}
