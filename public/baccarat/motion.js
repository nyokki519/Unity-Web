// Cosmetic director only: all amounts and settlement are committed by Session first.
const live=new Set(),animations=new Set(),timers=new Set();
const reduced=s=>s.reduced||matchMedia('(prefers-reduced-motion:reduce)').matches||s.speed==='instant'||document.hidden;
function later(fn,ms){const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);}
function play(node,frames,options){if(!node?.animate)return;const a=node.animate(frames,options);animations.add(a);a.finished.then(()=>animations.delete(a),()=>animations.delete(a));return a;}
export function payoutTier(receipt){
 if(receipt.net<=0)return 0;
 if(receipt.net>=100000)return 3;
 return receipt.net>=10000||receipt.lines?.some(line=>line.side==='tie'&&line.profit>0)?2:1;
}
export function clearMotion(){for(const id of timers)clearTimeout(id);timers.clear();for(const a of animations)a.cancel();animations.clear();for(const node of live)node.remove();live.clear();document.querySelector('.felt')?.classList.remove('settlement-light');}
export function dealMotion(node,settings){if(reduced(settings))return;const shoe=document.querySelector('.shoe-stack'),box=node.getBoundingClientRect(),source=shoe?.getBoundingClientRect(),pose=getComputedStyle(node).transform;const base=pose==='none'?'':pose;const dx=source?source.left-box.left:60,dy=source?source.top-box.top:-100;
 play(node,[{transform:`${base} translate(${dx}px,${dy}px) rotate(-16deg) scale(.82)`,opacity:.15,filter:'brightness(.7)'},{offset:.72,transform:`${base} translate(0,-5px) rotate(2deg) scale(1.025)`,opacity:1,filter:'brightness(1.08)'},{transform:`${base} translate(0,0) rotate(0deg) scale(1)`,opacity:1,filter:'brightness(1)'}],{duration:settings.speed==='quick'?200:580,easing:'cubic-bezier(.19,.72,.24,1)'});
}
export function chipFlight(from,to,settings,{index=0,denomination='1000',onLand}={}){
 if(!from||!to||reduced(settings)||live.size>=18)return;
 const a=from.getBoundingClientRect(),b=to.getBoundingClientRect(),node=document.createElement('span');node.className='flying-chip';node.dataset.denom=denomination;node.textContent='';node.setAttribute('aria-hidden','true');document.body.append(node);live.add(node);
 const x=a.x+a.width/2-14,y=a.y+a.height/2-14,tx=b.x+b.width/2-14,ty=b.y+b.height/2-14;
 const finish=()=>{live.delete(node);node.remove();onLand?.();};
 const animation=play(node,[{transform:`translate(${x}px,${y}px) rotate(-25deg) scale(.8)`,opacity:0},{offset:.18,opacity:1},{offset:.58,transform:`translate(${(x+tx)/2+index*3}px,${Math.min(y,ty)-48}px) rotate(${120+index*22}deg) scale(1.12)`,opacity:1},{transform:`translate(${tx}px,${ty}px) rotate(220deg) scale(.65)`,opacity:0}],{duration:settings.speed==='quick'?200:620,easing:'cubic-bezier(.3,.1,.35,1)',fill:'forwards'});if(animation)animation.finished.then(finish,()=>{live.delete(node);node.remove();});else finish();
}
export function settleMotion(receipt,settings,audio){
 const tier=payoutTier(receipt),house=document.querySelector('#shoe-info'),wallet=document.querySelector('#balance'),felt=document.querySelector('.felt'),quick=settings.speed==='quick';
 if(reduced(settings))return;
 const duration=quick?220:660;
 if(tier){
  if(settings.flash!==false){felt?.classList.add('settlement-light');later(()=>felt?.classList.remove('settlement-light'),quick?350:1500);}
  if(settings.flash!==false)document.querySelectorAll('.playing-card.revealed .card-front').forEach((card,i)=>{
   const node=document.createElement('i');node.className='card-sheen';node.setAttribute('aria-hidden','true');card.append(node);live.add(node);
   const finish=()=>{live.delete(node);node.remove();};
   const animation=play(node,[{transform:'translateX(-180%) rotate(-18deg)',opacity:0},{offset:.35,opacity:.75},{transform:'translateX(390%) rotate(-18deg)',opacity:0}],{duration,delay:i*55,easing:'cubic-bezier(.17,.6,.29,1)',fill:'both'});
   if(animation)animation.finished.then(finish,finish);else finish();
  });
  play(document.querySelector('#receipt'),[{opacity:.15,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:quick?180:440,delay:quick?0:160,fill:'backwards'});
  if(settings.shake===true)play(felt,[{transform:'translateY(0)'},{transform:'translateY(-2px)'},{transform:'translateY(0)'}],{duration:240});
 }
 for(const line of receipt.lines){const zone=document.querySelector(`[data-action="bet:${line.side}"]`),count=tier&&line.profit>0&&settings.particles!==false?(quick?2:Math.min(9,3+tier*2)):1;
  for(let i=0;i<count;i++)later(()=>chipFlight(zone,line.returned?wallet:house,settings,{index:i,denomination:String([50000,10000,5000,1000,500,100].find(value=>line.stake>=value)||100),onLand:()=>{if(line.returned){audio?.event('chip');play(wallet,[{transform:'scale(1)',color:'#f2ede2'},{transform:'scale(1.06)',color:'#e8d3a1'},{transform:'scale(1)',color:'#f2ede2'}],{duration:180});}}}),tier?(quick?60:380)+i*(quick?45:85):0);
 }
}
