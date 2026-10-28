import {UPGRADE_BALANCE as U} from './balance.js';
// Presentation-only vocabulary. This module never changes game state or RNG.
export const ITEM_UI={
 A:{label:'大口径',symbol:'●',color:'#ffb897',category:'強化',hint:'主弾の直径 +22ポイント・威力 +20ポイント（最大3段階）'},
 Q:{label:'反射',symbol:'↶',color:'#ffda87',category:'強化',hint:'壁で2回跳ね返る金色の側射を追加（最大3段階）'},
 T:{label:'旋回砲',symbol:'◎',color:'#c6adff',category:'強化',hint:'自機の周囲を回りながら射撃する砲台を追加（2〜4基）'},
 D:{label:'防壁',symbol:'⬡',color:'#94d6ff',category:'防御',hint:'被弾を1回防ぐ青い防壁。重複しません'},
 P:{label:'火力',symbol:'↑',color:'#81f3c4',category:'強化',hint:'主砲威力 +25ポイント・レベル +1（最大8）'},
 S:{label:'連射',symbol:'»',color:'#81f3c4',category:'強化',hint:'連射速度 +22ポイント（最大5段階）'},
 W:{label:'拡幅',symbol:'↔',color:'#81f3c4',category:'強化',hint:'射線や側射を追加（最大3段階）'},
 L:{label:'光線',symbol:'╱',color:'#81f3c4',category:'強化',hint:'0.65秒ごとに補助光線（最大3段階）'},
 M:{label:'誘導',symbol:'↗',color:'#81f3c4',category:'強化',hint:'0.65秒ごとに誘導弾（最大3段階）'},
 O:{label:'支援',symbol:'◈',color:'#81f3c4',category:'強化',hint:'随伴数 +1（最大3）'},
 H:{label:'回復',symbol:'＋',color:'#ff9cb2',category:'回復',hint:'耐久を1回復'},
 B:{label:'ボム',symbol:'✦',color:'#ffce85',category:'補充',hint:'ボム +1（最大5）'},
 E:{label:'充電',symbol:'ϟ',color:'#94d6ff',category:'補充',hint:'エネルギー +40'},
 G:{label:'解放',symbol:'◇',color:'#bba5ff',category:'補充',hint:'解放ゲージ +28%'},
 '★':{label:'得点',symbol:'★',color:'#ffda87',category:'資源',hint:'スコア +1,000'},
 R:{label:'希少',symbol:'◆',color:'#ffda87',category:'資源',hint:'工廠用の希少素材 +1'},
 X:{label:'進化',symbol:'✧',color:'#ffda87',category:'進化',hint:'進化核と特級素材 +1。条件達成で兵装進化'},
 C:{label:'資金',symbol:'◉',color:'#ffda87',category:'資源',hint:'25 CR と通常素材5（精算時に受領）'},
 '?':{label:'未知',symbol:'?',color:'#edf2ef',category:'補給',hint:'火力・連射・拡幅・回復・充電・解放・ボムのいずれか'}
};
export function pickupFeedback(e){
 const id=e.applied||e.value,ui=ITEM_UI[id]||ITEM_UI['?'],a=e.before||{},b=e.after||{};
 const fields={A:['caliber','大口径段階 '],Q:['ricochet','反射段階 '],T:['orbitLevel','旋回砲段階 '],P:['level','主砲 Lv.'],S:['rapid','連射段階 '],W:['width','拡幅段階 '],L:['laserBoost','光線段階 '],M:['missileBoost','誘導段階 '],O:['options','随伴数 '],B:['bombs','ボム '],H:['hp','耐久 '],E:['energy','エネルギー '],G:['drive','解放ゲージ ']};
 let detail=ui.hint;
 if(fields[id]){const [key,label]=fields[id],before=Math.floor(a[key]||0),after=Math.floor(b[key]||0);detail=after>before?`${label}${before} → ${after}${id==='G'?'%':''}`:`${label}${after}${id==='G'?'%':''} · ${id==='H'?'全回復済み':id==='E'||id==='G'?'満タン':'最大強化'}`;}
 if(id==='P'&&b.level>a.level)detail+=` · 威力 ${Math.round((1+(a.level-1)*U.powerPerLevel)*100)} → ${Math.round((1+(b.level-1)*U.powerPerLevel)*100)}%`;
 if(id==='S'&&b.rapid>a.rapid)detail+=` · 速度 ${Math.round((1+a.rapid*U.rapidPerLevel)*100)} → ${Math.round((1+b.rapid*U.rapidPerLevel)*100)}%`;
 if(id==='W'&&b.width>a.width)detail+=' · 射線追加';
 if(id==='L'&&b.laserBoost>a.laserBoost)detail+=' · 補助光線を追加';
 if(id==='M'&&b.missileBoost>a.missileBoost)detail+=' · 誘導弾を追加';
 if(id==='A'&&b.caliber>a.caliber)detail+=' · 弾を大きく・強く';
 if(id==='Q'&&b.ricochet>a.ricochet)detail+=' · 金色の反射弾を追加';
 if(id==='T'&&b.orbitLevel>a.orbitLevel)detail+=` · ${b.orbitLevel+1}基展開`;
 if(id==='D')detail=a.shield>0?'防壁は展開済み · 重複しません':'青い防壁を展開 · 被弾を1回防ぐ';
 if(id==='C')detail='+25 CR · 通常素材 +5（精算時）';
 if(id==='R')detail=`希少素材 ${a.rare||0} → ${b.rare||0}`;
 if(id==='X')detail=a.core?'特級素材 +1 · 進化核は取得済み':'進化核を取得 · 特級素材 +1';
 if(id==='★')detail='スコア +1,000';
 return {...ui,id,title:`${e.value==='?'?'未知核 → ':''}${({H:'耐久回復',B:'ボム補充',E:'エネルギー補充',G:'解放チャージ'})[id]||ui.label+(ui.category==='強化'?'アップ':'獲得')}`,detail};
}
export function abilityStatus(game){
 const p=game.player,cost=game.options.ship===6?50:35;
 return {bomb:{ready:p.bombs>0,detail:`残り ${p.bombs}`},special:{ready:p.specialCD<=0&&p.energy>=cost,detail:p.specialCD>0?`あと ${Math.ceil(p.specialCD)}秒`:p.energy<cost?`EN ${cost}必要`:'使用可能'},overdrive:{ready:p.drive>=100&&p.driveTime<=0,detail:p.driveTime>0?`発動中 ${Math.ceil(p.driveTime)}秒`:p.drive>=100?'使用可能':`${Math.floor(p.drive)}%`}};
}
