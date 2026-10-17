// Decorative, non-redeemable Unity notes. Never consumes the simulation RNG.
export function createBanknoteRain(){
 const cv=document.createElement('canvas');cv.width=384;cv.height=176;const g=cv.getContext('2d');
 g.fillStyle='#c4b790';g.fillRect(0,0,384,176);g.strokeStyle='#52634b';g.lineWidth=6;g.strokeRect(10,10,364,156);g.lineWidth=2;g.strokeRect(20,20,344,136);
 g.fillStyle='#364b3c';g.textAlign='center';g.font='bold 31px serif';g.fillText('UNITY',192,60);g.font='bold 48px serif';g.fillText('1000',192,113);g.font='15px sans-serif';g.fillText('喫茶Unity · ゲーム内専用',192,146);
 for(const x of [58,326]){g.beginPath();g.ellipse(x,85,25,39,0,0,Math.PI*2);g.stroke();g.beginPath();g.moveTo(x,53);g.bezierCurveTo(x-22,77,x+22,93,x,117);g.stroke();}
 const layer=document.createElement('div');layer.id='unity-banknote-background';layer.setAttribute('aria-hidden','true');
 const image=cv.toDataURL();
 for(let i=0;i<14;i++){
  const note=document.createElement('div');note.className='unity-note';note.dataset.side=i%2?'right':'left';
  note.style.setProperty('--lane',String(Math.floor(i/2)%3));note.style.setProperty('--duration',`${12+(i%4)*1.7}s`);note.style.setProperty('--delay',`${-i*1.9}s`);note.style.backgroundImage=`url("${image}")`;layer.append(note);
 }
 document.body.prepend(layer);
 function update(_dt,{reduced=false,enabled=true}={}){layer.hidden=!enabled||reduced;}
 update(0);return{layer,update};
}
