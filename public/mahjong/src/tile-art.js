const SUIT=['萬','筒','索'];
const HONORS=['東','南','西','北','白','發','中'];

function normalize(value){
 if(value&&typeof value==='object')value=value.tile??value.id??value.type??value.label;
 if(Number.isInteger(Number(value))&&String(value).trim()!==''){
  const tile=Number(value);if(tile>=0&&tile<=36)return tile;
 }
 const match=String(value??'').match(/^([mps])([0-9])$/);
 if(match){const suit={m:0,p:1,s:2}[match[1]],rank=Number(match[2]);return rank===0?34+suit:suit*9+rank-1;}
 return -1;
}
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function tileLabel(value){
 const tile=normalize(value);if(tile<0)return '不明な牌';
 const type=tile<34?tile:[4,13,22][tile-34];
 if(type<27)return `${tile>=34?'赤5':type%9+1}${SUIT[Math.floor(type/9)]}`;
 return HONORS[type-27];
}

/** Return the exact locally bundled reference face for a Unity MIX tile id. */
export function tileAssetPath(value){
 const tile=normalize(value);if(tile<0)return null;
 if(tile>=34)return `${['m','p','s'][tile-34]}0.gif`;
 if(tile<27)return `${['m','p','s'][Math.floor(tile/9)]}${tile%9+1}.gif`;
 return `z${tile-26}.gif`;
}

export function renderTile(value,{compact=false,back=false}={}){
 const tile=normalize(value),label=tileLabel(value),asset=back?'pai.gif':tileAssetPath(value);
 const size=back?'tile-back':compact?'mj-tile-svg mj-tile-compact':'mj-tile-svg';
 const src=asset?`/mahjong/assets/kobalab/tiles/${asset}`:'';
 return `<img class="${size}${!asset?' mj-tile-invalid':''}" src="${src}" alt="${escape(back?'伏せた牌':label)}" aria-label="${escape(back?'伏せた牌':label)}" decoding="async" loading="eager" draggable="false">`;
}
