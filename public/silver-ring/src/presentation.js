// Presentation only: no collision, probability or coin rules live here.
export function mountPresentation({fire,setPower,setCamera,setAngle,previewSound}) {
 const $=id=>document.getElementById(id),power=$('shotPower'),more=$('moreControls'),extras=$('extraControls'),focus=$('focusBowl');
 let latest=null,zoomed=false;
 $('previewBreakthrough').addEventListener('click',previewSound);
 $('singleShot').addEventListener('click',()=>fire());
 power.addEventListener('input',()=>setPower(Number(power.value)/100));
 more.addEventListener('click',()=>{extras.hidden=!extras.hidden;more.setAttribute('aria-expanded',String(!extras.hidden));});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!extras.hidden){extras.hidden=true;more.setAttribute('aria-expanded','false');more.focus();}});
 focus.addEventListener('click',()=>{zoomed=!zoomed;const active=latest?.balls.filter(b=>b.mode==='bowl').map(b=>b.bi)||[];setCamera(zoomed?'cradle'+(Math.max(0,...active)+1):'auto');focus.textContent=zoomed?'自動視点へ':'皿を拡大';focus.setAttribute('aria-pressed',String(zoomed));});
 focus.setAttribute('aria-pressed','false');
 $('cameraLeft').addEventListener('click',()=>setAngle('cameraYaw',-10));
 $('cameraRight').addEventListener('click',()=>setAngle('cameraYaw',10));
 return {update(state,sim){
  latest=sim;
  zoomed=state.manualCamera.startsWith('cradle');focus.textContent=zoomed?'自動視点へ':'皿を拡大';focus.setAttribute('aria-pressed',String(zoomed));
  $('mAuto').disabled=state.phase!=='play'||state.jackpotLock;
  for(const b of document.querySelectorAll('#extraControls button,#quickControls button,#cameraControls button'))b.disabled=state.phase!=='play'||state.jackpotLock;
  $('cameraControls').hidden=!zoomed;
  const angleText=`角度 ${Math.round(state.cameraPitch)}° / 左右 ${Math.round(state.cameraYaw)}°`;if($('cameraReadout').value!==angleText)$('cameraReadout').value=angleText;
  if(document.activeElement!==power)power.value=String(Math.round(state.memory*100));
  const shownPower=Math.round(state.memory*100)+'%';
  if($('shotPowerValue').value!==shownPower)$('shotPowerValue').value=shownPower;
  power.disabled=state.randPow||state.phase!=='play';$('randomState').hidden=!state.randPow;
  $('singleShot').disabled=state.phase!=='play'||state.jackpotLock;
  const stages=sim.balls.filter(b=>b.mode==='bowl').map(b=>b.bi),stage=stages.length?Math.max(...stages):-1;
  const label=state.jackpotLock?'三段突破 · ボーナス':stage>=0?`${stage+1}段目を抽選中 · 金色の穴で次へ`:sim.liveCount()?'釘と回転盤を通過中':'釘と回転盤 → 入口 → 三段の皿';
  $('bowlWhisper').hidden=stage<0||state.phase!=='play'||state.jackpotLock;
  if($('routeStatus').textContent!==label)$('routeStatus').textContent=label;
 }};
}
