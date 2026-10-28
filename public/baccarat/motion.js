// Presentation only. No animation callback ever changes a wager or balance.
const live=new Set();
export function clearMotion(){for(const node of live){node.getAnimations?.().forEach(a=>a.cancel());node.remove();}live.clear();}
export function chipFlight(from,to,settings){
 if(!from||!to||settings.reduced||matchMedia('(prefers-reduced-motion:reduce)').matches||settings.speed==='instant'||document.hidden||live.size>=12)return;
 const a=from.getBoundingClientRect(),b=to.getBoundingClientRect(),node=document.createElement('span');node.className='flying-chip';node.textContent='◇';node.setAttribute('aria-hidden','true');document.body.append(node);live.add(node);
 const start=`translate(${a.x+a.width/2-14}px,${a.y+a.height/2-14}px)`,end=`translate(${b.x+b.width/2-14}px,${b.y+b.height/2-14}px)`;
 const finish=()=>{live.delete(node);node.remove();};
 if(!node.animate){finish();return;}
 const animation=node.animate([{transform:start+' scale(.8)',opacity:.7},{transform:end+' scale(1)',opacity:1}],{duration:settings.speed==='quick'?140:300,easing:'cubic-bezier(.2,.7,.2,1)',fill:'forwards'});animation.finished.then(finish,finish);
}
export function settleMotion(receipt,settings){
 const house=document.querySelector('#shoe-info'),wallet=document.querySelector('#balance');
 for(const line of receipt.lines){const zone=document.querySelector(`[data-action="bet:${line.side}"]`);if(line.returned)chipFlight(line.profit?house:zone,wallet,settings);else chipFlight(zone,house,settings);}
}
