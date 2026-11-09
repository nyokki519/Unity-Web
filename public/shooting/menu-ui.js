import {SHIPS,WEAPONS,SUPPORTS,DIFFICULTIES} from './data.js';
import {shipPreview} from './renderer.js';
export const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const difficultyLabel=id=>{const key=Object.hasOwn(DIFFICULTIES,id)?id:'normal';return DIFFICULTIES[key].name;};
export const formatSetting=(id,value)=>id==='bgm'||id==='se'?`${Math.round(value*100)}%`:id==='sensitivity'?`${Number(value).toFixed(1)}倍`:id==='offset'?`${Math.round(value)}px`:String(value);
const tags=[['はじめて向け','バランス型'],['すばやい','軽い'],['攻撃が強い','体力多め'],['攻撃が当たりにくい','すばやい'],['体力たっぷり','ゆっくり'],['必殺技が得意'],['体力回復','体力多め'],['むずかしい','攻撃が強い']];
export function shipVisual(ship){
 const meters=[['体力',ship.hp,8,String(ship.hp)],['速さ',ship.speed,300,String(ship.speed)],['攻撃',ship.damage,1.35,`${Math.round(ship.damage*100)}%`]];
 return `<h3>${escape(ship.name)}</h3><img class="ship-preview" src="${shipPreview(ship.id)}" width="160" height="125" alt="${escape(ship.name)}の機体"><div class="ship-tags">${tags[ship.id].map(t=>`<span>${t}</span>`).join('')}</div><div class="ship-stats">${meters.map(([name,value,max,text])=>`<div><span>${name}</span><i role="meter" aria-label="${escape(ship.name)}の基礎${name}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}" aria-valuetext="${text}"><i style="width:${value/max*100}%"></i></i><b>${text}</b></div>`).join('')}</div>`;
}
export const MODE_DESCRIPTIONS={
 campaign:'全5ステージを順番に進みます。敵を倒して強化を集め、最後のボスを目指そう。途中でやめても続きから遊べます。',
 score:'1ステージでスコアに挑戦。機体と強さはみんな同じなので、腕試しにぴったりです。',
 daily:'毎日変わるステージに挑戦。みんな同じ条件で遊びます。記録はこのスマホに保存されます。',
 bossrush:'ボスと次々に対決。選んだ機体や強化を使って、どこまで勝ち進めるか挑戦します。',
 time:'選んだステージをどれだけ早くクリアできるか挑戦。選んだ機体や強化を使えます。'
};
export function effectiveSelection(selection){return ['score','daily'].includes(selection.mode)?{...selection,ship:0,weapon:0,support:0,difficulty:selection.mode==='score'?'normal':'hard'}:selection;}
export function loadoutSummary(selection){const s=effectiveSelection(selection);return `<div class="loadout-summary" aria-label="今回使う機体と武器"><div><span>機体</span><b>${escape(SHIPS[s.ship].name)}</b></div><div><span>メイン武器</span><b>${escape(WEAPONS[s.weapon].name)}</b></div><div><span>おたすけ</span><b>${escape(SUPPORTS[s.support].name)}</b></div><p>${difficultyLabel(s.difficulty)}${['score','daily'].includes(s.mode)?' · 機体と武器は固定':' · 強化が使えます'}</p></div>`;}
export function missionPanel(selection,button){
 const s=effectiveSelection(selection),fixed=['score','daily'].includes(s.mode);
 return `<section class="mission-panel panel"><div class="mission-selects"><label for="mode">あそび方<select id="mode">${Object.entries({campaign:'ストーリー',score:'スコアに挑戦',bossrush:'ボスと連戦',time:'タイムに挑戦',daily:'今日のチャレンジ'}).map(([id,name])=>`<option value="${id}" ${s.mode===id?'selected':''}>${name}</option>`).join('')}</select></label><label for="difficulty">強さ<select id="difficulty" ${fixed?'disabled':''}>${Object.keys(DIFFICULTIES).map(id=>`<option value="${id}" ${s.difficulty===id?'selected':''}>${difficultyLabel(id)}</option>`).join('')}</select></label></div><p id="mode-description" class="mode-description" aria-live="polite">${MODE_DESCRIPTIONS[s.mode]}</p>${loadoutSummary(selection)}${button('この内容でゲーム開始 →','launch','primary')}</section>`;
}
export function updateMissionPanel(selection){
 const description=document.querySelector('#mode-description');if(!description)return;
 description.textContent=MODE_DESCRIPTIONS[selection.mode];document.querySelector('.loadout-summary').outerHTML=loadoutSummary(selection);
 const select=document.querySelector('#difficulty'),s=effectiveSelection(selection);select.disabled=['score','daily'].includes(s.mode);select.value=s.difficulty;
}
export function quickControls(){
 const diagrams=[
 '<path d="M16 30h65m-52-9L16 30l13 9m39-18 13 9-13 9"/><circle cx="49" cy="43" r="10"/><path d="m49 5-8 15h16Z"/>',
 '<path d="m50 38-12 17h24Zm0-7V8m-13 24V17m26 15V17"/><path d="m46 13 4-6 4 6"/>',
 '<circle cx="50" cy="30" r="24"/><circle cx="50" cy="30" r="16"/><path d="m50 16 4 10 10 4-10 4-4 10-4-10-10-4 10-4Z"/>'
 ];
 return `<div class="quick-controls" aria-label="はじめに覚える3つの操作">${[['動かす','指でドラッグ<br>PCは矢印キー'],['射撃は自動','回避に集中<br>設定で切替可'],['困ったらボム','ボタン / X<br>敵弾を消す']].map(([title,description],i)=>`<div><svg class="control-diagram" aria-hidden="true" viewBox="0 0 100 60" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${diagrams[i]}</svg><b>${title}</b><small>${description}</small></div>`).join('')}</div>`;
}

export function manual(itemGuide){return `<div class="panel help"><h3>まずは、この3つだけ。</h3>${quickControls()}<details class="manual-detail"><summary>スマホ・PCの操作</summary><p>スマホは画面を指でなぞると機体が動きます。下のボタンでボムや必殺技を使えます。</p><p>パソコン：矢印キー / WASDで移動。Shiftでゆっくり移動。Xでボム、Cで必殺技、Vで全力攻撃。Esc / Pで一時停止・再開。自動射撃を切るとSpace / Zで撃てます。</p><p>タブを閉じたり離れたりすると一時停止します。戻って「再開」を押してください。</p></details><details class="manual-detail"><summary>アイテムと強化</summary><p>敵が落とすアイテムを取ると、その場で武器や体力が強くなります。ボムは敵の弾を消します。必殺技と全力攻撃にはゲージが必要です。</p><p>ステージ中に取った強化はそのプレイだけ有効です。クリアでもらったコインやパーツは、パワーアップで使えます。</p>${itemGuide()}</details><details class="manual-detail"><summary>あそび方と強さ</summary>${Object.entries(MODE_DESCRIPTIONS).map(([id,description])=>`<p><b>${({campaign:'ストーリー',score:'スコアに挑戦',daily:'今日のチャレンジ',bossrush:'ボスと連戦',time:'タイムに挑戦'})[id]}</b><br>${description}</p>`).join('')}<p>${Object.keys(DIFFICULTIES).map(difficultyLabel).join(' / ')}</p></details><details class="manual-detail"><summary>セーブとリプレイ</summary><p>進み具合はこのスマホ・ブラウザに自動保存されます。別の端末には引き継がれません。サイトのデータを消すと、保存内容も消えます。</p><p>リプレイは直前のプレイを見返す機能です。リプレイではコインや記録は増えません。</p></details></div>`;}
export function pauseAudioSettings(settings){
 return `<details class="pause-audio settings-panel"><summary>音量を調整</summary>${[['bgm','BGM音量'],['se','効果音量']].map(([id,label])=>`<label class="setting setting-range" for="pause-setting-${id}"><span>${label}</span><input id="pause-setting-${id}" type="range" data-setting="${id}" min="0" max="1" step=".05" value="${settings[id]}"><output for="pause-setting-${id}">${formatSetting(id,settings[id])}</output></label>`).join('')}<p class="muted">音量は自動保存され、再開後に反映されます。</p></details>`;
}
export function settingsPanel(profile){
 const rows=[['bgm','BGM音量',0,1,.05],['se','効果音量',0,1,.05],['sensitivity','タッチ感度',.5,2,.1],['offset','指からの上方距離',0,120,5]];
 return `<div class="panel settings-panel">${rows.map(([id,label,min,max,step])=>`<label class="setting setting-range" for="setting-${id}"><span>${label}</span><input id="setting-${id}" type="range" data-setting="${id}" min="${min}" max="${max}" step="${step}" value="${profile.settings[id]}"><output for="setting-${id}">${formatSetting(id,profile.settings[id])}</output></label>`).join('')}<section class="touch-preview-block"><h3>指と機体の距離プレビュー</h3><div id="touch-preview" role="img" aria-label="指より${profile.settings.offset}px上に機体がある距離の目安" style="--offset:${profile.settings.offset}px"><div class="preview-link"></div><div class="preview-ship"><span aria-hidden="true">✧</span><b>機体</b></div><div class="preview-finger"><span aria-hidden="true">◎</span><b>指</b></div></div><p id="sensitivity-example">指を10px動かすと、機体は${Math.round(profile.settings.sensitivity*10)}pxぶん移動します。</p><p class="muted">上方距離は指で機体が隠れないための目安です。開始位置や画面端では補正されます。</p></section><label class="setting">描画品質<select data-setting="quality"><option value="high">高品質</option><option value="low" ${profile.settings.quality==='low'?'selected':''}>軽量</option></select></label>${[['reduced','演出を控えめに（個別設定より優先）'],['shake','画面の揺れ'],['flash','画面フラッシュ'],['autofire','自動射撃']].map(([id,label])=>`<label class="setting">${label}<input data-setting="${id}" type="checkbox" ${profile.settings[id]?'checked':''}></label>`).join('')}<label class="setting">火花・煙・破片の量<select data-setting="particleAmount">${[[1,'標準'],[.5,'少なめ'],[0,'なし']].map(([value,label])=>`<option value="${value}" ${profile.settings.particleAmount===value?'selected':''}>${label}</option>`).join('')}</select></label><p class="muted">敵弾・攻撃の輪郭・範囲表示は常に表示します。</p></div>`;
}
export function updateSettingPreview(profile){
 const preview=document.querySelector('#touch-preview');if(!preview)return;
 preview.style.setProperty('--offset',profile.settings.offset+'px');preview.setAttribute('aria-label',`指より${profile.settings.offset}px上に機体がある距離の目安`);
 document.querySelector('#sensitivity-example').textContent=`指を10px動かすと、機体は${Math.round(profile.settings.sensitivity*10)}pxぶん移動します。`;
}
