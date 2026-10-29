// Cosmetic director: Session owns every card, outcome and balance.
const live=new Set(),animations=new Set(),timers=new Set(),marked=new Map();
let generation=0;
const reduced=s=>s.reduced||matchMedia('(prefers-reduced-motion:reduce)').matches||s.speed==='instant'||document.hidden;
function later(fn,ms){const epoch=generation,id=setTimeout(()=>{timers.delete(id);if(epoch===generation)fn();},ms);timers.add(id);}
function play(node,frames,options){if(!node?.animate)return;const a=node.animate(frames,options);animations.add(a);a.finished.then(()=>animations.delete(a),()=>animations.delete(a));return a;}
function mark(node,name,duration){if(!node)return;node.classList.add(name);if(!marked.has(node))marked.set(node,new Set());marked.get(node).add(name);later(()=>{node.classList.remove(name);marked.get(node)?.delete(name);},duration);}
function decoration(parent,name){if(!parent||live.size>=24)return;const node=document.createElement('i');node.className=name;node.setAttribute('aria-hidden','true');parent.append(node);live.add(node);return node;}
function remove(node){if(node){live.delete(node);node.remove();}}
export function payoutTier(receipt){if(receipt.net<=0)return 0;if(receipt.net>=100000)return 3;return receipt.net>=10000||receipt.lines?.some(line=>line.side==='tie'&&line.profit>0)?2:1;}
export function clearMotion(){generation++;for(const id of timers)clearTimeout(id);timers.clear();for(const a of animations)a.cancel();animations.clear();for(const node of live)node.remove();live.clear();for(const [node,names]of marked)for(const name of names)node.classList.remove(name);marked.clear();}
export function dealMotion(node,settings,onFace){
 if(reduced(settings)){onFace?.();return;}
 const quick=settings.speed==='quick',duration=quick?180:500,inner=node.querySelector('.card-inner'),shoe=document.querySelector('.shoe-stack'),box=node.getBoundingClientRect(),source=shoe?.getBoundingClientRect(),pose=getComputedStyle(node).transform,base=pose==='none'?'':pose;
 const dx=source?source.left-box.left:60,dy=source?source.top-box.top:-100;
 play(node,[{transform:`${base} translate(${dx}px,${dy}px) rotate(-14deg) scale(.86)`,opacity:.2},{offset:.42,transform:`${base} translate(0,-9px) rotate(1deg) scale(1.035)`,opacity:1},{offset:.84,transform:`${base} translate(0,-2px) scale(1.01)`,opacity:1},{transform:`${base} translate(0,0) scale(1)`,opacity:1}],{duration,easing:'cubic-bezier(.18,.7,.25,1)'});
 const flip=play(inner,[{transform:'rotateY(0deg)'},{offset:.5,transform:'rotateY(90deg)'},{offset:.88,transform:'rotateY(185deg)'},{transform:'rotateY(180deg)'}],{duration:quick?160:420,easing:'linear'});
 if(flip){const visible=quick?110:280;let attempts=0;const face=()=>{if(typeof flip.currentTime==='number'&&flip.currentTime<visible+8){if(attempts++<40)later(face,8);return;}onFace?.();};later(face,visible);}else onFace?.();
}
export function lockMotion(settings){if(reduced(settings))return;const quick=settings.speed==='quick';mark(document.querySelector('.felt'),'ceremony-lock',quick?180:420);play(document.querySelector('.phase-label'),[{opacity:.45,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:quick?160:320});}
export function thirdMotion(settings){if(reduced(settings))return;mark(document.querySelector('.felt'),'ceremony-third',settings.speed==='quick'?180:600);play(document.querySelector('.shoe-stack'),[{transform:'translateY(0)'},{transform:'translateY(-3px)'},{transform:'translateY(0)'}],{duration:settings.speed==='quick'?160:440});}
export function chipFlight(from,to,settings,{index=0,denomination='1000',onLand}={}){
 if(!from||!to||reduced(settings)||live.size>=24)return;
 const a=from.getBoundingClientRect(),b=to.getBoundingClientRect(),node=decoration(document.body,'flying-chip');if(!node)return;node.dataset.denom=denomination;
 if(['100','500','1000','5000','10000','50000'].includes(String(denomination)))node.style.backgroundImage=`url('./chips/${denomination}.svg')`;
 const x=a.x+a.width/2-14,y=a.y+a.height/2-14,tx=b.x+b.width/2-14,ty=b.y+b.height/2-14,epoch=generation;
 const finish=()=>{remove(node);if(epoch===generation)onLand?.();};
 const animation=play(node,[{transform:`translate(${x}px,${y}px) rotate(-25deg) scale(.8)`,opacity:0},{offset:.16,opacity:1},{offset:.55,transform:`translate(${(x+tx)/2+index*3}px,${Math.min(y,ty)-42}px) rotate(${110+index*17}deg) scale(1.1)`,opacity:1},{transform:`translate(${tx}px,${ty}px) rotate(210deg) scale(.7)`,opacity:0}],{duration:settings.speed==='quick'?180:560,easing:'cubic-bezier(.3,.1,.35,1)',fill:'forwards'});
 if(animation)animation.finished.then(finish,()=>remove(node));else finish();
}
export function settleMotion(receipt,settings,audio){
 if(reduced(settings))return;
 const tier=payoutTier(receipt),felt=document.querySelector('.felt'),wallet=document.querySelector('#balance'),house=document.querySelector('.shoe-stack')||document.querySelector('#shoe-info'),quick=settings.speed==='quick',winner=felt?.dataset.winner;
 const hand=['player','banker'].includes(winner)?document.querySelector(`.hand.${winner}`):null;
 // Anticipation (0–120), impact (120–370), afterglow (370–1300).
 if(tier){
  if(settings.flash!==false){mark(felt,'ceremony-anticipation',quick?60:120);later(()=>{mark(felt,'settlement-light',quick?300:1180);mark(hand,'ceremony-winner',quick?300:1180);mark(document.querySelector(`[data-action="bet:${winner}"]`),'ceremony-winning-zone',quick?300:1180);mark(document.querySelector('#outcome'),'ceremony-result',quick?300:1180);},quick?60:120);}
  later(()=>{play(document.querySelector('#outcome'),[{transform:'translateY(5px) scale(.97)',opacity:.5},{offset:.65,transform:'translateY(-1px) scale(1.025)',opacity:1},{transform:'translateY(0) scale(1)',opacity:1}],{duration:quick?160:250});play(document.querySelector('#receipt'),[{opacity:.3,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:quick?160:300});},quick?60:120);
  if(settings.shake===true)later(()=>play(felt,[{transform:'translateY(0)'},{transform:'translateY(-2px)'},{transform:'translateY(0)'}],{duration:quick?140:220}),quick?60:120);
  if(settings.flash!==false)hand?.querySelectorAll('.card-front').forEach((card,i)=>{const sheen=decoration(card,'ceremony-reflection');if(!sheen)return;const a=play(sheen,[{transform:'translateX(-170%)',opacity:0},{offset:.4,opacity:.25},{transform:'translateX(220%)',opacity:0}],{duration:quick?160:450,delay:quick?60:120+i*35});a?.finished.then(()=>remove(sheen),()=>remove(sheen));later(()=>remove(sheen),quick?300:750);});
  if(settings.particles!==false)for(let i=0;i<Math.min(8,tier*3);i++)later(()=>{const p=decoration(felt,'ceremony-spark');if(!p)return;p.style.setProperty('--arc',`${(i-3.5)*19}px`);play(p,[{transform:'translate(-50%,0) scale(.4)',opacity:0},{offset:.2,opacity:.8},{transform:`translate(calc(-50% + ${(i-3.5)*19}px),-65px) scale(.2)`,opacity:0}],{duration:quick?160:650,easing:'ease-out'});later(()=>remove(p),quick?180:670);},quick?60:120+i*24);
 }
 for(const line of receipt.lines||[]){const zone=document.querySelector(`[data-action="bet:${line.side}"]`),denomination=String([50000,10000,5000,1000,500,100].find(v=>line.stake>=v)||100);
  // One principal movement; profit is a distinct later movement only when positive.
  later(()=>chipFlight(zone,line.returned>0?wallet:house,settings,{denomination,onLand:()=>{if(line.returned>0)audio?.event('chip');}}),quick?40:120);
  if(line.profit>0){const count=settings.particles===false||tier===0?1:quick?2:tier===3?6:tier===2?4:2;for(let i=0;i<count;i++)later(()=>chipFlight(house,wallet,settings,{denomination,index:i+1,onLand:()=>{audio?.event('chip');play(wallet,[{transform:'scale(1)'},{transform:'scale(1.04)'},{transform:'scale(1)'}],{duration:130});}}),quick?110+i*35:410+i*65);}
 }
}
if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(document.hidden)clearMotion();});
