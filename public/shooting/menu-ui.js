import {SHIPS,WEAPONS,SUPPORTS,DIFFICULTIES} from './data.js';
import {shipPreview} from './renderer.js';
export const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const difficultyLabel=id=>{const key=Object.hasOwn(DIFFICULTIES,id)?id:'normal';return `${DIFFICULTIES[key].name}（${key.toUpperCase()}）`;};
export const formatSetting=(id,value)=>id==='bgm'||id==='se'?`${Math.round(value*100)}%`:id==='sensitivity'?`${Number(value).toFixed(1)}倍`:id==='offset'?`${Math.round(value)}px`:String(value);
const tags=[['初心者向け','標準型'],['高速','軽量'],['高火力','高耐久'],['小さな当たり判定','高速'],['最高耐久','低速'],['エネルギー運用'],['装甲修復','中耐久'],['上級者向け','高火力']];
export function shipVisual(ship){
 const meters=[['耐久',ship.hp,8,String(ship.hp)],['機動',ship.speed,300,String(ship.speed)],['火力',ship.damage,1.35,`${Math.round(ship.damage*100)}%`]];
 return `<h3>${escape(ship.name)}</h3><img class="ship-preview" src="${shipPreview(ship.id)}" width="160" height="125" alt="${escape(ship.name)}の機体"><div class="ship-tags">${tags[ship.id].map(t=>`<span>${t}</span>`).join('')}</div><div class="ship-stats">${meters.map(([name,value,max,text])=>`<div><span>${name}</span><i role="meter" aria-label="${escape(ship.name)}の基礎${name}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}" aria-valuetext="${text}"><i style="width:${value/max*100}%"></i></i><b>${text}</b></div>`).join('')}</div>`;
}
export const MODE_DESCRIPTIONS={
 campaign:'5つの航路を順に攻略。装備と工廠の強化を使い、素材・資金を持ち帰る基本の任務です。選んだ航路から開始します。',
 score:'スコアを競う1航路の任務。標準（NORMAL）・第1航路・初期の固定装備で出撃し、工廠の強化は適用しません。',
 daily:'日本時間の日付で決まる日替わり航路に挑戦。激戦（HARD）・初期の固定装備。工廠の強化は適用しません。記録はこの端末内に保存されます。',
 bossrush:'ボス戦を続けて攻略。各航路で中ボス・ボスが早く出現します。選択した装備と工廠の強化を使えます。',
 time:'選択した1航路のクリア時間を競う任務。装備と工廠の強化を使えます。短いクリア時間ほど上位に記録されます。'
};
export function effectiveSelection(selection){return ['score','daily'].includes(selection.mode)?{...selection,ship:0,weapon:0,support:0,difficulty:selection.mode==='score'?'normal':'hard'}:selection;}
export function loadoutSummary(selection){const s=effectiveSelection(selection);return `<div class="loadout-summary" aria-label="今回の出撃装備"><div><span>機体</span><b>${escape(SHIPS[s.ship].name)}</b></div><div><span>主兵装</span><b>${escape(WEAPONS[s.weapon].name)}</b></div><div><span>支援機</span><b>${escape(SUPPORTS[s.support].name)}</b></div><p>${difficultyLabel(s.difficulty)}${['score','daily'].includes(s.mode)?' · 固定装備・工廠強化なし':' · 選択した装備・工廠強化あり'}</p></div>`;}
export function missionPanel(selection,button){
 const s=effectiveSelection(selection),fixed=['score','daily'].includes(s.mode);
 return `<section class="mission-panel panel"><div class="mission-selects"><label for="mode">任務<select id="mode">${Object.entries({campaign:'キャンペーン',score:'スコアアタック',bossrush:'ボスラッシュ',time:'タイムアタック',daily:'デイリー挑戦'}).map(([id,name])=>`<option value="${id}" ${s.mode===id?'selected':''}>${name}</option>`).join('')}</select></label><label for="difficulty">難度<select id="difficulty" ${fixed?'disabled':''}>${Object.keys(DIFFICULTIES).map(id=>`<option value="${id}" ${s.difficulty===id?'selected':''}>${difficultyLabel(id)}</option>`).join('')}</select></label></div><p id="mode-description" class="mode-description" aria-live="polite">${MODE_DESCRIPTIONS[s.mode]}</p>${loadoutSummary(selection)}${button('この装備で発進 →','launch','primary')}</section>`;
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

export function manual(itemGuide){return `<div class="panel help"><h3>まずは、この3つだけ。</h3>${quickControls()}<details class="manual-detail"><summary>スマホ・PCの詳しい操作</summary><p>スマホはドラッグした分だけ機体が動きます。設定の感度・指からの上方距離を調整できます。画面下のボタンで特技と解放を使います。</p><p>PC：矢印 / WASD で移動、Shiftで低速移動。Xでボム、Cで特技、Vで解放。Esc / Pで停止・再開。自動射撃OFFなら Space / Z を押して射撃します。</p><p>精密移動では小さな当たり判定が表示されます。タブを離れると停止し、戻って「再開」で続けられます。</p></details><details class="manual-detail"><summary>強化・エネルギー・解放</summary><p>補給を拾って出撃中の機体を強化。画面下に実際の変化が表示されます。特技はエネルギー、ボムは残数、解放は100%のゲージを使います。敵弾をかすめるとグレイズ加点。ボスの部位を破壊すると攻撃が弱まります。</p><p>出撃中の補給強化は次回出撃へ持ち越しません。精算した資金・素材は工廠での永久強化に使えます。</p>${itemGuide()}</details><details class="manual-detail"><summary>任務と難度の違い</summary>${Object.entries(MODE_DESCRIPTIONS).map(([id,description])=>`<p><b>${({campaign:'キャンペーン',score:'スコアアタック',daily:'デイリー',bossrush:'ボスラッシュ',time:'タイムアタック'})[id]}</b><br>${description}</p>`).join('')}<p>${Object.keys(DIFFICULTIES).map(difficultyLabel).join(' / ')}</p></details><details class="manual-detail"><summary>保存・リプレイについて</summary><p>進行はこの端末・ブラウザ内に自動保存。別端末との同期はありません。サイトデータの削除で消えるため注意してください。保存を拒否したブラウザでは進行を保持できない場合があります。</p><p>リプレイは直近の出撃を保存。再生では報酬・実績を獲得しません。戦闘仕様の異なる旧版リプレイは再生対象外です。</p></details></div>`;}
export function settingsPanel(profile){
 const rows=[['bgm','BGM音量',0,1,.05],['se','効果音量',0,1,.05],['sensitivity','タッチ感度',.5,2,.1],['offset','指からの上方距離',0,120,5]];
 return `<div class="panel settings-panel">${rows.map(([id,label,min,max,step])=>`<label class="setting setting-range" for="setting-${id}"><span>${label}</span><input id="setting-${id}" type="range" data-setting="${id}" min="${min}" max="${max}" step="${step}" value="${profile.settings[id]}"><output for="setting-${id}">${formatSetting(id,profile.settings[id])}</output></label>`).join('')}<section class="touch-preview-block"><h3>指と機体の距離プレビュー</h3><div id="touch-preview" role="img" aria-label="指より${profile.settings.offset}px上に機体がある距離の目安" style="--offset:${profile.settings.offset}px"><div class="preview-link"></div><div class="preview-ship"><span aria-hidden="true">✧</span><b>機体</b></div><div class="preview-finger"><span aria-hidden="true">◎</span><b>指</b></div></div><p id="sensitivity-example">指を10px動かすと、機体は${Math.round(profile.settings.sensitivity*10)}pxぶん移動します。</p><p class="muted">上方距離は指で機体が隠れないための目安です。開始位置や画面端では補正されます。</p></section><label class="setting">描画品質<select data-setting="quality"><option value="high">高品質</option><option value="low" ${profile.settings.quality==='low'?'selected':''}>軽量</option></select></label>${[['reduced','演出を控えめに（個別設定より優先）'],['shake','画面の揺れ'],['flash','画面フラッシュ'],['autofire','自動射撃']].map(([id,label])=>`<label class="setting">${label}<input data-setting="${id}" type="checkbox" ${profile.settings[id]?'checked':''}></label>`).join('')}<label class="setting">火花・煙・破片の量<select data-setting="particleAmount">${[[1,'標準'],[.5,'少なめ'],[0,'なし']].map(([value,label])=>`<option value="${value}" ${profile.settings.particleAmount===value?'selected':''}>${label}</option>`).join('')}</select></label><p class="muted">敵弾・攻撃の輪郭・範囲表示は常に表示します。</p></div>`;
}
export function updateSettingPreview(profile){
 const preview=document.querySelector('#touch-preview');if(!preview)return;
 preview.style.setProperty('--offset',profile.settings.offset+'px');preview.setAttribute('aria-label',`指より${profile.settings.offset}px上に機体がある距離の目安`);
 document.querySelector('#sensitivity-example').textContent=`指を10px動かすと、機体は${Math.round(profile.settings.sensitivity*10)}pxぶん移動します。`;
}
