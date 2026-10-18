import{engravingPixels}from'./coin-engraving.js';
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
  note.style.setProperty('--lane',String(Math.floor(i/2)%3));
  for(const [key,value] of Object.entries({'--depth-from':`${-150+(i%5)*45}px`,'--depth-to':`${-90+(i%4)*70}px`,'--spin-time':`${3.8+(i%5)*.7}s`,'--axis-x':String(.3+(i%4)*.23),'--axis-y':String(.7+(i%3)*.17),'--axis-z':String(.15+(i%5)*.08),'--tilt':`${i*37%80-40}deg`,'--drift-from':`${i%3*8-12}px`,'--drift-to':`${i%2?12:-14}px`}))note.style.setProperty(key,value);note.style.setProperty('--duration',`${18+(i%4)*2}s`);note.style.setProperty('--delay',`${-i*1.9}s`);const coin=document.createElement('div');coin.className='unity-coin';
  for(const side of ['front','back']){const face=document.createElement('div');face.className=`coin-face coin-${side}`;face.style.backgroundImage=`url("${image}")`;coin.append(face);}
  for(let j=0;j<16;j++){const rim=document.createElement('div');rim.className='coin-rim';rim.style.setProperty('--rim-angle',`${j*22.5}deg`);coin.append(rim);}
  const flight=document.createElement('div');flight.className='coin-flight';flight.append(coin);note.append(flight);layer.append(note);
 }
 document.body.prepend(layer);
 // Use the existing community identity, never the game-engine company mark.
 if(typeof Image!=='undefined'){
  const mark=new Image();mark.onload=()=>{
   const ink=document.createElement('canvas');ink.width=110;ink.height=152;const ig=ink.getContext('2d');ig.drawImage(mark,0,0,110,152);const pixels=ig.getImageData(0,0,110,152);engravingPixels(pixels.data);ig.putImageData(pixels,0,0);g.drawImage(ink,73,37);
   image=cv.toDataURL();for(const face of layer.querySelectorAll('.coin-face'))face.style.backgroundImage=`url("${image}")`;layer.dataset.icon='ready';
  };mark.src=new URL('../../assets/unity-mark.webp',import.meta.url).href;
 }
 let lastClip='';
 function excludeRect({left,right,top,bottom},width,height){
  const l=Math.round(Math.max(0,Math.min(width,left-8))),r=Math.round(Math.max(0,Math.min(width,right+8))),t=Math.round(Math.max(0,Math.min(height,top-8))),b=Math.round(Math.max(0,Math.min(height,bottom+8)));
  // Full background with a hole covering the projected cabinet. Never crosses it.
  const clip=`polygon(evenodd,0px 0px,${width}px 0px,${width}px ${height}px,0px ${height}px,0px 0px,${l}px ${t}px,${l}px ${b}px,${r}px ${b}px,${r}px ${t}px,${l}px ${t}px)`;
  if(clip!==lastClip){layer.style.clipPath=clip;lastClip=clip;}
  layer.dataset.exclusion=JSON.stringify({left:l,right:r,top:t,bottom:b});
 }

 function update(_dt,{reduced=false,enabled=true}={}){layer.hidden=!enabled;}
 update(0);return{layer,update,excludeRect};
}
