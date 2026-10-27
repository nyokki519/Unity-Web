import {shouldCueEntry} from './entry-celebration.js';
import {sampleReplay} from './replay-history.js';
import {winFunnelSpec} from './physics.js';
// One renderer and the actual scene/materials; no video encoder or extra GPU context.
export function createReplayView(refs,{entryFX,onEntry=()=>{}}={}){
 const {THREE,camera,controls,ballsIM:im}=refs;
 const panel=document.createElement('section');panel.id='entryReplay';panel.hidden=true;panel.setAttribute('aria-label','大当たり入賞リプレイ');
 panel.innerHTML='<div class="replay-heading"><strong>大当たり · 入賞リプレイ</strong><span id="replayAngle" role="status"></span><small>実際の玉の動き · スロー再生</small></div><button type="button" class="btn" id="skipReplay">リプレイをスキップ</button>';
 document.body.append(panel);
 const label=panel.querySelector('#replayAngle'),skip=panel.querySelector('button');
 const poses=[[-.11,.43,.37],[-.29,.36,.32],[.29,.36,.32]],names=['正面寄りから','左斜めから','右斜めから'];
 const m=new THREE.Matrix4(),target=new THREE.Vector3(),eye=new THREE.Vector3();
 let state=null;
 function finish(){if(!state)return;const s=state;state=null;entryFX?.clear();panel.hidden=true;delete document.body.dataset.replay;camera.position.copy(s.pos);camera.quaternion.copy(s.quat);camera.fov=s.fov;camera.updateProjectionMatrix();controls.enabled=s.controls;im.count=s.count;for(let i=0;i<s.matrices.length;i++)im.setMatrixAt(i,s.matrices[i]);im.instanceMatrix.needsUpdate=true;if(s.focus?.isConnected)s.focus.focus({preventScroll:true});s.resolve();}
 const canSkip=()=>!document.hidden&&document.body.dataset.phase!=='paused';
 skip.addEventListener('click',()=>{if(canSkip())finish();});
 addEventListener('keydown',e=>{if(state&&canSkip()&&e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();finish();}},true);
 return {
  get active(){return !!state;},get elapsed(){return state?.elapsed??0;},finish,
  play(track,{entryTime,reduced=false}={}){if(state||track.length<2)return Promise.resolve();
   const f=winFunnelSpec(2);target.set(f.x,f.top,f.z);im.parent.updateWorldMatrix(true,false);im.parent.localToWorld(target);
   const matrices=[];for(let i=0;i<im.count;i++){const mat=new THREE.Matrix4();im.getMatrixAt(i,mat);matrices.push(mat);}
   return new Promise(resolve=>{state={track,entryTime,reduced,played:new Set(),elapsed:0,resolve,pos:camera.position.clone(),quat:camera.quaternion.clone(),fov:camera.fov,aspect:camera.aspect,controls:controls.enabled,count:im.count,matrices,focus:document.activeElement};controls.enabled=false;panel.hidden=false;document.body.dataset.replay='true';skip.focus({preventScroll:true});});
  },
  update(dt){if(!state)return;const s=state,duration=(s.track.at(-1).t-s.track[0].t)/.33+.35;s.elapsed+=dt;
   const cut=Math.floor(s.elapsed/duration);if(cut>=3){finish();return;}
   panel.dataset.angle=String(cut+1);const text=`${cut+1} / 3 · ${names[cut]}`;if(label.textContent!==text)label.textContent=text;
   const t=s.track[0].t+Math.min(duration-.35,s.elapsed%duration)*.33,p=sampleReplay(s.track,t);
   if(shouldCueEntry(s.played,cut,t,s.entryTime))onEntry();
   entryFX?.draw(t-s.entryTime,s.reduced);
   im.count=1;m.makeTranslation(...p);im.setMatrixAt(0,m);im.instanceMatrix.needsUpdate=true;
   refs.applyPendingResize();
   if(camera.aspect!==s.aspect){s.fov=camera.fov;s.aspect=camera.aspect;}
   eye.set(...poses[cut]);camera.position.copy(target).add(eye);camera.lookAt(target);camera.fov=42;camera.updateProjectionMatrix();
   refs.maskBackground();refs.renderer.setRenderTarget(null);refs.renderer.render(refs.scene,camera);
  }
 };
}
