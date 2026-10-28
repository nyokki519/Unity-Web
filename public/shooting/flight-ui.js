import {ITEM_UI,pickupFeedback,abilityStatus} from './feedback.js';
import {WEAPONS,STAGES,SHIPS} from './data.js';
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function itemGuide(){return `<details class="item-guide"><summary>アイテムの見方・効果一覧</summary><p>色と記号は盤面の補給と共通です。強化は出撃中のみ。資金・素材は精算時に保存されます。</p><div class="guide-grid">${Object.entries(ITEM_UI).map(([id,i])=>`<div><span class="item-chip" style="--item:${i.color}">${i.symbol} ${i.label}</span><span>${i.hint}</span></div>`).join('')}</div></details>`;}
export class FlightUI{
 constructor(){this.hud=document.querySelector('#hud');this.feed=document.querySelector('#pickup-feed');this.viewport=document.querySelector('#viewport');this.actions=document.querySelector('#actions');this.live=document.querySelector('#flight-announcement');this.history=[];this.key='';}
 reset(){this.history=[];this.damageUntil=0;this.key='';this.feedKey='';this.live.textContent='';this.feed.innerHTML='';this.viewport.classList.remove('damaged');}
 event(e,time){
  if(e.type==='item'||e.type==='evolve'){
   const item=e.type==='evolve'?{...ITEM_UI.X,id:'evolve',title:'兵装進化',detail:e.text}:pickupFeedback(e);
   const last=this.history.at(-1);if(last?.id===item.id&&time-last.time<1.2){Object.assign(last,item,{time,count:(last.count||1)+1});}else this.history.push({...item,time,count:1});this.history=this.history.slice(-6);this.live.textContent=item.title+'。'+item.detail;
  }
  if(e.type==='hit'&&e.player){this.damageUntil=time+.65;this.live.textContent='被弾。耐久が減少しました。';}
 }
 update(game,{replaying=false,autofire=true,paused=false}={}){
  const p=game.player,ratio=p.hp/p.maxHp,critical=p.hp<=1,low=ratio<=.5;
  this.viewport.classList.toggle('critical',critical&&p.hp>0);this.viewport.classList.toggle('damaged',game.time<this.damageUntil);
  const key=[game.stage,game.stats.score,p.hp,p.maxHp,Math.floor(p.energy),p.level,p.options,p.weapon,game.stats.combo,game.stats.graze,replaying].join(':');
  if(this.key!==key){this.key=key;this.hud.innerHTML=`<div class="mission-line"><span>${replaying?'リプレイ · ':''}${String(game.stage+1).padStart(2,'0')} <b>${escape(STAGES[game.stage].name)}</b></span><span class="score-label">SCORE <strong>${game.stats.score.toLocaleString()}</strong></span></div><div class="vitals"><div class="health ${critical?'is-critical':low?'is-low':''}"><div class="meter-label"><span>耐久${critical?' · 危険':low?' · 注意':''}</span><strong>${p.hp}<small> / ${p.maxHp}</small></strong></div><div class="hp-segments" role="meter" aria-label="残り耐久" aria-valuemin="0" aria-valuemax="${p.maxHp}" aria-valuenow="${p.hp}">${Array.from({length:p.maxHp},(_,i)=>`<i class="${i<p.hp?'filled':''}"></i>`).join('')}</div></div><div class="energy"><div class="meter-label"><span>エネルギー</span><strong>${Math.floor(p.energy)}<small> / ${p.maxEnergy}</small></strong></div><div class="energy-track"><i style="width:${Math.min(100,p.energy/p.maxEnergy*100)}%"></i></div></div></div><div class="loadout-line"><span>主砲 <b>Lv.${p.level}</b> ${escape(WEAPONS[p.weapon].name)}</span><span>連撃 ${game.stats.combo} <small>かすり ${game.stats.graze}</small></span></div>`;}
  const active=this.history.filter(e=>game.time-e.time<4.5).slice(-1),feedKey=JSON.stringify(active);
  if(feedKey!==this.feedKey){this.feedKey=feedKey;this.feed.innerHTML=active.map(i=>`<div class="pickup-card" style="--item:${i.color}"><span class="pickup-symbol">${i.symbol}</span><div><strong>${escape(i.title)}${i.count>1?` ×${i.count}`:''}</strong><span>${escape(i.detail)}</span></div></div>`).join('')||'<div class="pickup-idle"><span>✦</span> 補給に近づくと回収 · 上部へ進むと自動回収</div>';}
  const statuses=abilityStatus(game);
  for(const [name,status] of Object.entries(statuses)){
   const button=this.actions.querySelector(`[data-action=${name}]`);button.disabled=!status.ready||paused||replaying;button.classList.toggle('ready',status.ready);button.querySelector('.action-detail').textContent=status.detail;button.setAttribute('aria-label',`${{bomb:'ボム',special:SHIPS[game.options.ship].special,overdrive:'解放'}[name]}。${status.detail}`);
  }
  this.actions.querySelector('[data-action=fire] .action-detail').textContent=autofire?'自動 ON':'長押し';
  this.actions.querySelector('[data-action=focus] .action-detail').textContent=p.focus?'低速 ON':'低速移動';
 }
 summary(game){const p=game.player;return `<div class="pause-loadout"><b>${escape(WEAPONS[p.weapon].name)} · Lv.${p.level}</b><span>連射 ${p.rapid}/5 · 拡幅 ${p.width}/3 · 随伴 ${p.options}/3</span><span>光線 ${p.laserBoost}/3 · 誘導 ${p.missileBoost}/3 · 大口径 ${p.caliber}/3 · 反射 ${p.ricochet}/3 · 旋回砲 ${p.orbitLevel}/3</span><span>防壁 ${p.shield>0?'展開中':'なし'} · 進化核 ${p.core?'取得済み':'未取得'}</span></div>${this.history.length?`<div class="recent-pickups"><h3>直近の補給</h3>${this.history.slice(-3).reverse().map(i=>`<p><b style="color:${i.color}">${escape(i.title)}</b><br>${escape(i.detail)}</p>`).join('')}</div>`:''}${itemGuide()}`;}
}
