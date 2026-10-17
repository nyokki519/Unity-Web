// Decorative, non-redeemable Unity gold coins. Never consumes the simulation RNG.
export function createBanknoteRain(){
 const cv=document.createElement('canvas');cv.width=cv.height=256;const g=cv.getContext('2d');
 const gold=g.createRadialGradient(82,70,10,128,128,126);gold.addColorStop(0,'#fff4b0');gold.addColorStop(.45,'#e3bb4b');gold.addColorStop(.8,'#98701a');gold.addColorStop(1,'#ffe59b');
 g.fillStyle=gold;g.beginPath();g.arc(128,128,124,0,Math.PI*2);g.fill();g.strokeStyle='#785015';g.lineWidth=4;g.beginPath();g.arc(128,128,111,0,Math.PI*2);g.stroke();
 g.fillStyle='#684818';g.textAlign='center';g.font='bold 24px serif';g.fillText('UNITY',128,220);
 const layer=document.createElement('div');layer.id='unity-banknote-background';layer.dataset.decoration='gold-coins';layer.setAttribute('aria-hidden','true');
 let image=cv.toDataURL();
 for(let i=0;i<14;i++){
  const note=document.createElement('div');note.className='unity-note';note.dataset.side=i%2?'right':'left';
  note.style.setProperty('--lane',String(Math.floor(i/2)%3));note.style.setProperty('--duration',`${18+(i%4)*2}s`);note.style.setProperty('--delay',`${-i*1.9}s`);const coin=document.createElement('div');coin.className='unity-coin';
  for(const side of ['front','back']){const face=document.createElement('div');face.className=`coin-face coin-${side}`;face.style.backgroundImage=`url("${image}")`;coin.append(face);}
  note.append(coin);layer.append(note);
 }
 document.body.prepend(layer);
 // Use the existing community identity, never the game-engine company mark.
 if(typeof Image!=='undefined'){
  const mark=new Image();mark.onload=()=>{g.globalCompositeOperation='multiply';g.drawImage(mark,73,37,110,152);g.globalCompositeOperation='source-over';image=cv.toDataURL();for(const face of layer.querySelectorAll('.coin-face'))face.style.backgroundImage=`url("${image}")`;layer.dataset.icon='ready';};mark.src=new URL('../../assets/unity-mark.webp',import.meta.url).href;
 }
 function excludeRect({left,right,top,bottom},width,height){
  const l=Math.max(0,Math.min(width,left-8)),r=Math.max(0,Math.min(width,right+8)),t=Math.max(0,Math.min(height,top-8)),b=Math.max(0,Math.min(height,bottom+8));
  // Full background with a hole covering the projected cabinet. Never crosses it.
  layer.style.clipPath=`polygon(evenodd,0px 0px,${width}px 0px,${width}px ${height}px,0px ${height}px,0px 0px,${l}px ${t}px,${l}px ${b}px,${r}px ${b}px,${r}px ${t}px,${l}px ${t}px)`;
  layer.dataset.exclusion=JSON.stringify({left:l,right:r,top:t,bottom:b});
 }

 function update(_dt,{reduced=false,enabled=true}={}){layer.hidden=!enabled;}
 update(0);return{layer,update,excludeRect};
}
