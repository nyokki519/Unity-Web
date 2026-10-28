import {roundPresentation} from './show-plan.js';
import {ShowState} from './show-state.js';
import {SHOW_TEXT} from './show-i18n.js';
// This director owns cosmetic timers only; it cannot settle, shuffle or edit a bet.
export class ShowDirector{
 constructor({storage,settings,reduced,source,back,audio,onRender,onHold,onSkip}){Object.assign(this,{storage,settings,reduced,source,back,audio,onRender,onHold,onSkip});this.dialog=document.createElement('dialog');this.dialog.id='squeeze-dialog';document.body.append(this.dialog);this.busy=false;this.token=0;this.timers=new Set();this.dialog.addEventListener('cancel',e=>{e.preventDefault();this.hold();});}
 text(key){return SHOW_TEXT[this.settings.language][key]||key;}
 bind(round){this.cancel();this.round=round;this.plan=roundPresentation(round);this.state=new ShowState(this.storage,round);return this.state.data.seen;}
 later(fn,ms){const token=this.token,id=setTimeout(()=>{this.timers.delete(id);if(token===this.token)fn();},ms);this.timers.add(id);return id;}
 cancel(){this.token++;for(const id of this.timers)clearTimeout(id);this.timers.clear();if(this.squeeze)this.saveSqueeze();this.squeeze=null;this.busy=false;this.dialog.onpointermove=null;this.dialog.replaceChildren();if(this.dialog.open)this.dialog.close();document.querySelectorAll('.show-cutin,.show-sparks').forEach(node=>node.remove());}
 hold(){if(!this.busy)return;this.cancel();this.onHold();}
 seen(count){this.state?.update({seen:count,squeeze:null});}
 reducedNow(){return this.reduced()||this.settings.speed==='instant';}
 beforeCard(index,reveal){
  if(!this.round||this.plan.mode==='off')return false;
  const cue=this.plan.cues.find(c=>c.at===index),key='cue:'+index,play=cue&&!this.state.data.played.includes(key);
  const mode=this.plan.mode,manual=this.settings.squeezeMode==='all'||this.settings.squeezeMode==='important'&&index===this.round.plan.cards.length-1;
  const sq=mode!=='quick'&&!this.reducedNow()&&(manual||index===this.round.plan.cards.length-1&&['squeeze','rich'].includes(mode)||this.state.data.squeeze?.index===index);
  if(!play&&!sq)return false;
  this.busy=true;
  const proceed=()=>{if(sq)this.openSqueeze(index,reveal,manual);else{reveal();this.busy=false;this.onRender();}};
  if(play){this.state.emit(key);this.cue(cue);this.later(()=>{document.querySelector('.show-cutin')?.remove();proceed();},this.reducedNow()?80:cue.ms);}else proceed();
  return true;
 }
 cue(cue){const felt=document.querySelector('.felt');if(!felt)return;felt.dataset.forecast=cue.tier;
  const layer=document.createElement('div');layer.className='show-cutin '+cue.kind;layer.dataset.tier=cue.tier;layer.setAttribute('role','status');
  // Original doorway / seal geometry, created with CSS; no borrowed logos or characters.
  const mark=document.createElement('span');mark.className='cutin-mark';mark.setAttribute('aria-hidden','true');mark.textContent=cue.kind==='seal'?'◇':cue.kind==='starlight'?'✧':'Ⅱ';
  const label=document.createElement('b');label.textContent=this.text(cue.tier);layer.append(mark,label);
  if(this.settings.dialogue&&this.plan.aux.includes('line')){const line=document.createElement('span');line.className='cutin-line';line.textContent=this.text('line'+(['trace','upgrade','doors','seal','starlight'].indexOf(cue.kind)+5)%5);layer.append(line);}
  felt.append(layer);if(this.plan.aux.includes('bell'))this.audio.hint(cue.tier,cue.kind);
 }
 openSqueeze(index,reveal,manual){
  const saved=this.state.data.squeeze;this.squeeze={index,progress:saved?.index===index?saved.progress:0,manual:saved?.index===index?saved.manual:manual,reveal,finished:false,auto:false};
  this.dialog.classList.remove('squeeze-complete');const d=this.dialog,t=k=>this.text(k),last=index===this.round.plan.cards.length-1,side=this.round.plan.cards[index].side;
  d.innerHTML=`<div class="squeeze-head"><span class="eyebrow">VESPER / CARD SQUEEZE</span><h2 id="squeeze-title"></h2><p id="squeeze-side"></p><p class="squeeze-omen"></p></div><div class="squeeze-stage"><div class="squeeze-card" role="img" aria-label="${t('unrevealed')}"><img class="squeeze-face" alt="" draggable="false"><div class="squeeze-cover"><img alt="" draggable="false"></div><div class="squeeze-fold"></div><div class="squeeze-grip"></div></div></div><p id="squeeze-help"></p><label class="squeeze-range">${t('progress')}<input id="squeeze-range" type="range" min="0" max="100" step="1" value="0" aria-label="${t('progress')}"><output for="squeeze-range">0%</output></label><div class="squeeze-actions"><button data-show="full" class="primary">${t('open')}</button><button data-show="auto">${t('autoOpen')}</button><button data-show="hold">${t('hold')}</button><button data-show="skip">${t('skipRound')}</button></div><p class="squeeze-save muted" role="status"></p>`;
  d.dataset.tier=document.querySelector('.felt')?.dataset.forecast||'none';d.setAttribute('aria-labelledby','squeeze-title');d.querySelector('#squeeze-title').textContent=t(last?'squeezeTitle':'squeezeOther');d.querySelector('#squeeze-help').textContent=t('squeezeHelp');d.querySelector('#squeeze-side').textContent=t('side')+' · '+(this.settings.language==='ja'?(side==='player'?'プレイヤー':'バンカー'):side.toUpperCase())+' · '+(index+1)+' / '+this.round.plan.cards.length;
  d.querySelector('.squeeze-face').src=this.source(this.round.plan.cards[index].card);d.querySelector('.squeeze-cover img').src=this.back;
  const omen=d.querySelector('.squeeze-omen');if(d.dataset.tier!=='none'){omen.textContent=t(d.dataset.tier);if(this.settings.dialogue&&this.plan.aux.includes('line'))omen.textContent+=' · '+t('line0');}else omen.hidden=true;
  const card=d.querySelector('.squeeze-card'),range=d.querySelector('input');let drag=null;
  card.addEventListener('pointerdown',e=>{if(e.button!==0||this.squeeze?.finished)return;e.preventDefault();this.stopAuto();drag={y:e.clientY,p:this.squeeze.progress};card.setPointerCapture(e.pointerId);});
  card.addEventListener('pointermove',e=>{if(!drag||!this.squeeze)return;this.progress(drag.p+(drag.y-e.clientY)/card.clientHeight,true);});
  const up=()=>{drag=null;this.saveSqueeze();};card.addEventListener('pointerup',up);card.addEventListener('pointercancel',up);card.addEventListener('lostpointercapture',up);
  range.addEventListener('input',()=>{this.stopAuto();this.progress(Number(range.value)/100,true);this.saveSqueeze();});
  d.onclick=e=>{const action=e.target.closest('[data-show]')?.dataset.show;if(action==='full')this.progress(1,true);if(action==='auto'){this.squeeze?.auto?this.stopAuto():this.startAuto();}if(action==='hold')this.hold();if(action==='skip'){this.cancel();this.onSkip();}};
  this.paint();this.saveSqueeze();d.showModal();range.focus({preventScroll:true});if(!this.squeeze.manual)this.startAuto();
 }
 paint(){const s=this.squeeze;if(!s)return;this.dialog.style.setProperty('--opened',s.progress);this.dialog.classList.toggle('squeeze-complete',s.progress>=1);this.dialog.querySelector('input').value=Math.round(s.progress*100);this.dialog.querySelector('output').value=Math.round(s.progress*100)+'%';this.dialog.querySelector('.squeeze-save').textContent=this.state.ok?'':this.text('checkpointFail');}
 saveSqueeze(){if(this.squeeze&&!this.squeeze.finished){this.state.update({squeeze:{index:this.squeeze.index,progress:this.squeeze.progress,manual:this.squeeze.manual}});const note=this.dialog.querySelector('.squeeze-save');if(note)note.textContent=this.state.ok?'':this.text('checkpointFail');}}
 progress(value,manual=false){const s=this.squeeze;if(!s||s.finished)return;const old=s.progress;s.progress=Math.max(0,Math.min(1,value));if(manual)s.manual=true;if(Math.abs(s.progress-old)>.003)this.audio.rustle();this.paint();const now=performance.now();if(!this.savedAt||now-this.savedAt>150){this.saveSqueeze();this.savedAt=now;}
  if(s.progress>=1){s.finished=true;this.stopAuto();this.dialog.querySelector('.squeeze-card').setAttribute('aria-label',this.text('revealed'));for(const b of this.dialog.querySelectorAll('[data-show=full],[data-show=auto],[data-show=hold]'))b.disabled=true;this.dialog.querySelector('input').disabled=true;s.reveal();this.later(()=>{this.squeeze=null;if(this.dialog.open)this.dialog.close();this.busy=false;this.onRender();},this.reducedNow()?50:650);}
 }
 stopAuto(){if(!this.squeeze)return;this.squeeze.auto=false;this.squeeze.autoEpoch=(this.squeeze.autoEpoch||0)+1;const b=this.dialog.querySelector('[data-show=auto]');if(b)b.textContent=this.text('autoOpen');}
 startAuto(){const s=this.squeeze;if(!s||s.finished)return;s.auto=true;const autoEpoch=s.autoEpoch=(s.autoEpoch||0)+1;this.dialog.querySelector('[data-show=auto]').textContent=this.text('stop');const begin=performance.now(),initial=s.progress;const tick=()=>{if(this.squeeze!==s||!s.auto||s.finished||s.autoEpoch!==autoEpoch)return;this.progress(initial+(performance.now()-begin)/1500);if(!s.finished)this.later(tick,16);};tick();}
 result(receipt){const felt=document.querySelector('.felt');if(!felt||this.plan?.mode==='off')return;felt.classList.add(receipt.net>0?'show-profit':receipt.net<0?'show-loss':'show-push');if(receipt.net>0&&!this.reducedNow()&&this.state.emit('result')){const layer=document.createElement('div');layer.className='show-sparks';layer.setAttribute('aria-hidden','true');for(let i=0;i<10;i++){const dot=document.createElement('i');dot.style.setProperty('--i',i);layer.append(dot);}felt.append(layer);this.later(()=>layer.remove(),1100);}}
 restoreFrame(round=this.round){const frame=document.querySelector('.felt');if(!round||round.id!==this.round?.id){if(frame){frame.dataset.forecast='none';frame.classList.remove('show-profit','show-loss','show-push');}return;}this.round=round;const last=this.plan?.cues.filter(c=>this.state.data.played.includes('cue:'+c.at)).at(-1);const felt=document.querySelector('.felt');if(felt){felt.dataset.forecast=last?.tier||'none';if(!this.round?.paid)felt.classList.remove('show-profit','show-loss','show-push');}}
}
