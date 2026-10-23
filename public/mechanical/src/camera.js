import {THREE} from './scene.js';
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export class CameraRig{
 constructor(view){this.view=view;this.mode='全体';this.target=new THREE.Vector3(0,.43,.07);this.radius=1.24;this.theta=.08;this.phi=1.25;this.controller=new AbortController();this.pointers=new Map();this.pinch=null;this.last=null;this.element=view.canvas;
  this.element.addEventListener('pointerdown',e=>{if(e.button>0)return;this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});this.element.setPointerCapture(e.pointerId);this.last={x:e.clientX,y:e.clientY};},{signal:this.controller.signal});
  this.element.addEventListener('pointermove',e=>this.move(e),{signal:this.controller.signal});for(const type of ['pointerup','pointercancel','lostpointercapture'])this.element.addEventListener(type,e=>{this.pointers.delete(e.pointerId);this.pinch=null;this.last=null;},{signal:this.controller.signal});
  this.element.addEventListener('wheel',e=>{e.preventDefault();this.zoom(Math.exp(e.deltaY*.001));},{passive:false,signal:this.controller.signal});this.resize();}
 dispose(){this.controller.abort();this.pointers.clear();}
 setMode(mode){this.mode=mode;this.pointers.clear();this.pinch=null;if(mode==='全体'){this.target.set(0,.43,.07);this.radius=1.24;this.theta=.08;this.phi=1.25;}else if(mode!=='自由'){this.target.set(0,.40,.09);this.radius=.48;this.theta=.12;this.phi=1.02;}this.resize();}
 resize(){if(this.mode==='全体')this.radius=this.view.camera.aspect<.85?1.46:1.36;}
 zoom(factor){this.radius=clamp(this.radius*factor,.28,1.9);}
 pan(y){this.mode='自由';this.target.y=clamp(this.target.y+y,.03,.85);}
 move(e){if(!this.pointers.has(e.pointerId))return;const old=this.pointers.get(e.pointerId);this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(this.pointers.size===2){const pts=[...this.pointers.values()],dist=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y),cy=(pts[0].y+pts[1].y)/2;if(this.pinch){this.zoom(this.pinch.dist/Math.max(1,dist));this.target.y=clamp(this.target.y+(cy-this.pinch.cy)*this.radius*.001,.03,.85);}this.pinch={dist,cy};}
  else {if(e.shiftKey){this.target.x=clamp(this.target.x-(e.clientX-old.x)*this.radius*.001,-.22,.22);this.target.y=clamp(this.target.y+(e.clientY-old.y)*this.radius*.001,.03,.85);}else{this.theta-= (e.clientX-old.x)*.007;this.phi=clamp(this.phi-(e.clientY-old.y)*.005,.35,1.62);}}
  this.mode='自由';}
 update(dt){if(this.mode==='自動追尾'){
   const candidates=[...this.view.game.physics.balls.values()].filter(b=>b.pickup||b.body.translation().z>.045);const b=candidates.at(-1);const goal=b?new THREE.Vector3().copy(b.body.translation()):new THREE.Vector3(0,.4,.09);goal.y=clamp(goal.y,.24,.60);this.target.lerp(goal,1-Math.exp(-dt*3));this.radius+=(.45-this.radius)*(1-Math.exp(-dt*2));this.phi+=(1.0-this.phi)*(1-Math.exp(-dt*2));}
  const p=new THREE.Vector3().setFromSphericalCoords(this.radius,this.phi,this.theta).add(this.target);this.view.camera.position.copy(p);this.view.camera.lookAt(this.target);}
}
