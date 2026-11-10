const SUIT=['萬','筒','索'];
const NUMERALS=['一','二','三','四','五','六','七','八','九'];
const HONORS=['東','南','西','北','白','發','中'];
const PIN_LAYOUT={
  1:[[36,48]],
  2:[[25,34],[47,62]],
  3:[[25,30],[36,48],[47,66]],
  4:[[25,31],[47,31],[25,65],[47,65]],
  5:[[25,31],[47,31],[36,48],[25,65],[47,65]],
  6:[[25,29],[47,29],[25,48],[47,48],[25,67],[47,67]],
  7:[[25,28],[47,28],[25,47],[47,47],[25,66],[36,25],[47,66]],
  8:[[25,27],[47,27],[25,41],[47,41],[25,55],[47,55],[25,69],[47,69]],
  9:[[25,27],[36,27],[47,27],[25,48],[36,48],[47,48],[25,69],[36,69],[47,69]]
};
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function normalize(value){
 if(value&&typeof value==='object')value=value.tile??value.id??value.type??value.label;
 if(Number.isInteger(Number(value))&&String(value).trim()!==''){
  const tile=Number(value);if(tile>=0&&tile<=36)return tile;
 }
 const match=String(value??'').match(/^([mps])([0-9])$/);
 if(match){const suit={m:0,p:1,s:2}[match[1]],rank=Number(match[2]);return rank===0?34+suit:suit*9+rank-1;}
 return -1;
}
export function tileLabel(value){
 const tile=normalize(value);if(tile<0)return String(value??'不明な牌');
 const type=tile<34?tile:[4,13,22][tile-34];
 if(type<27)return `${tile>=34?'赤5':type%9+1}${SUIT[Math.floor(type/9)]}`;
 return HONORS[type-27];
}
function pinPips(rank,color){return PIN_LAYOUT[rank].map(([x,y],index)=>`<circle class="mj-pin mj-pin-${index%2?'alt':'main'}${color==='red'?' mj-red':''}" cx="${x}" cy="${y}" r="${rank===1?8:5.3}"/>`).join('');}
function souSticks(rank,red){
 const positions=rank===1?[[36,39,0]]:Array.from({length:rank},(_,i)=>{
  const cols=Math.ceil(rank/2),row=Math.floor(i/cols),col=i%cols;
  return[24+col*(24/Math.max(1,cols-1)),33+row*26,(i+row)%2];
 });
 return positions.map(([x,y,index])=>`<g class="mj-sou"><rect x="${x-3.8}" y="${y-10}" width="7.6" height="20" rx="3.4" class="${red&&rank===5&&index===0?'mj-red':'mj-green'}"/><path d="M${x-2} ${y-6}l4 -3M${x-2} ${y}l4 -3M${x-2} ${y+6}l4 -3" class="mj-bamboo-seam"/></g>`).join('');
}
function face(type,tile){
 if(type<9)return `<text x="36" y="43" class="mj-man-number">${NUMERALS[type]}</text><text x="36" y="66" class="mj-suit-word">${tile>=34?'赤':''}萬</text>`;
 if(type<18)return pinPips(type-8,tile===35?'red':'green');
 if(type<27)return souSticks(type-17,tile===36);
 const honor=HONORS[type-27],tone=type===31?'#57775d':type===32?'#57815d':type===33?'#b65040':type===30?'#8c8877':'#425c78';
 if(type===31)return `<rect x="18" y="28" width="36" height="40" rx="3" class="mj-white-dragon"/><path d="M22 32h28v32H22z" class="mj-white-line"/><path d="M27 38h18M27 48h18M27 58h18" class="mj-white-line"/>`;
 return `<text x="36" y="59" class="mj-honor" fill="${tone}">${honor}</text>`;
}
export function renderTile(value,{compact=false,back=false}={}){
 const tile=normalize(value),label=tileLabel(value),size=compact?'mj-tile-svg mj-tile-compact':'mj-tile-svg';
 if(back)return `<svg class="${size} mj-tile-back-art" viewBox="0 0 72 96" role="img" aria-label="伏せた牌"><rect x="2" y="2" width="68" height="92" rx="8" class="mj-back-shadow"/><rect x="4" y="3" width="63" height="86" rx="7" class="mj-back-face"/><rect x="9" y="8" width="53" height="76" rx="5" class="mj-back-frame"/><path d="M16 15h39v62H16zM16 15l39 62m0-62L16 77" class="mj-back-pattern"/><circle cx="35.5" cy="46" r="9" class="mj-back-seal"/><path d="M31 46h9m-4.5-4.5v9" class="mj-back-mark"/></svg>`;
 const content=tile<0?'<text x="36" y="58" class="mj-unknown">?</text>':face(tile<34?tile:[4,13,22][tile-34],tile);
 return `<svg class="${size}" viewBox="0 0 72 96" role="img" aria-label="${escape(tile<0?'不明な牌':label)}"><rect x="2" y="3" width="68" height="92" rx="8" class="mj-tile-shadow"/><rect x="3" y="2" width="64" height="87" rx="7" class="mj-tile-edge"/><rect x="6" y="2" width="59" height="82" rx="5" class="mj-tile-face${tile>=34?' mj-tile-red-five':''}"/><path d="M11 6h48" class="mj-tile-glint"/>${content}${tile>=34?'<rect x="47" y="70" width="13" height="9" rx="3" class="mj-red-tag"/><text x="53.5" y="77" class="mj-red-label">赤</text>':''}</svg>`;
}
