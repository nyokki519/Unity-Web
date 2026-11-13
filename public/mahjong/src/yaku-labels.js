const LABELS=Object.freeze({
  riichi:'立直',
  'double-riichi':'ダブル立直',
  ippatsu:'一発',
  'menzen-tsumo':'門前清自摸和',
  tanyao:'断么九',
  pinfu:'平和',
  iipeikou:'一盃口',
  ryanpeikou:'二盃口',
  'yakuhai-round':'場風牌',
  'yakuhai-seat':'自風牌',
  chankan:'槍槓',
  rinshan:'嶺上開花',
  haitei:'海底摸月',
  houtei:'河底撈魚',
  chiitoitsu:'七対子',
  toitoi:'対々和',
  sanankou:'三暗刻',
  sankantsu:'三槓子',
  'sanshoku-doujun':'三色同順',
  'sanshoku-doukou':'三色同刻',
  ittsu:'一気通貫',
  chanta:'混全帯么九',
  junchan:'純全帯么九',
  honroutou:'混老頭',
  honitsu:'混一色',
  chinitsu:'清一色',
  shousangen:'小三元',
  daisangen:'大三元',
  shousuushii:'小四喜',
  daisuushii:'大四喜',
  tsuuiisou:'字一色',
  chinroutou:'清老頭',
  ryuuiisou:'緑一色',
  kokushi:'国士無双',
  suuankou:'四暗刻',
  suukantsu:'四槓子',
  chuuren:'九蓮宝燈',
  tenhou:'天和',
  chiihou:'地和',
  dora:'ドラ',
  'ura-dora':'裏ドラ',
  'aka-dora':'赤ドラ'
});
const DRAGONS=Object.freeze({'31':'白','32':'發','33':'中'});
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function yakuLabel(yaku){
  const id=String(yaku?.id??'');
  const dragon=id.match(/^yakuhai-dragon-(31|32|33)$/);
  return dragon?`役牌 ${DRAGONS[dragon[1]]}`:LABELS[id]||id||'役';
}
export function renderYakuSummary(yaku){
  if(!Array.isArray(yaku)||!yaku.length)return '';
  const items=yaku.map(item=>{
    const yakuman=Math.max(0,Number(item?.yakuman)||0),han=Math.max(0,Number(item?.han)||0);
    const amount=yakuman>0?(yakuman>1?`ダブル役満 ×${yakuman}`:'役満'):`${han}翻`;
    return `<li class="yaku-item${yakuman?' yaku-yakuman':''}"><span>${escape(yakuLabel(item))}</span><small>${escape(amount)}</small></li>`;
  }).join('');
  return `<ul class="yaku-summary" aria-label="成立役">${items}</ul>`;
}
