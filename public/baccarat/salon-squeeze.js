import * as THREE from '../vendor/three/three.module.js';
import {createCard, frameForCard} from './salon-card.js';
import {gripNormal, projectedProgress, foldPoint, backPolygon} from './salon-curl.js';
const clamp = n => Math.max(0, Math.min(1, n));
let mastersPromise;
function masters() {
 return mastersPromise ||= Promise.all([import('./card-data.js'), import('./classic-card.js')]);
}
function imageFromSvg(svg) {
 return new Promise((resolve, reject) => {
  const url = URL.createObjectURL(new Blob([svg], {type:'image/svg+xml'}));
  const image = new Image();
  image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
  image.onerror = () => { URL.revokeObjectURL(url); reject(Error('CARD_IMAGE')); };
  image.src = url;
 });
}
async function cardImages(card) {
 const [{FACES, BACK}, {classicCardFace, classicCardBack}] = await masters();
 return Promise.all([imageFromSvg(classicCardFace(FACES[frameForCard(card)])), imageFromSvg(classicCardBack(BACK))]);
}
function texture(image) {
 const canvas = document.createElement('canvas'); canvas.width = 720; canvas.height = 1000;
 canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
 const result = new THREE.CanvasTexture(canvas); result.colorSpace = THREE.SRGBColorSpace; return result;
}
export class SqueezeView {
 constructor(host, {onProgress = () => {}, onReveal = () => {}, onSound = () => {}} = {}) {
  this.host = host; this.onProgress = onProgress; this.onReveal = onReveal; this.onSound = onSound; this.serial = 0;
 }
 open({card, label = 'Card', reduced = false}) {
  this.cancel(); const serial = ++this.serial; this.progress = 0; this.normal = {x:0,y:-1}; this.reduced = reduced;
  this.host.hidden = false; this.host.dataset.progress = '0'; this.host.dataset.direction = 'bottom'; this.host.classList.add('salon-squeeze');
  this.host.innerHTML = `<div class="salon-squeeze__panel"><p class="salon-squeeze__label"></p><p class="salon-squeeze__hint">カードの辺や角から内側へなぞると、少しずつめくれます。</p><div class="salon-squeeze__stage" role="button" tabindex="0" aria-label="カードをなぞるか、Enterキーでめくる"><div class="salon-squeeze__fallback"></div><div class="salon-squeeze__hit" aria-hidden="true"></div></div><button class="salon-squeeze__reveal" data-squeeze="finish" type="button">このカードをめくる</button></div>`;
  this.host.querySelector('.salon-squeeze__label').textContent = label;
  this.stage = this.host.querySelector('.salon-squeeze__stage'); this.fallback = this.host.querySelector('.salon-squeeze__fallback');
  this.hit = this.host.querySelector('.salon-squeeze__hit'); this.face = createCard(card); this.back = createCard(card, {hidden:true}); this.fallback.append(this.face, this.back);
  this.promise = new Promise(resolve => { this.resolve = resolve; });
  this.button = this.host.querySelector('button'); this.button.onclick = () => this.finish(); this.stage.focus({preventScroll:true});
  this.stage.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.finish(); } };
  this.hit.onpointerdown = e => {
   if (e.button !== 0 || this.pointer) return;
   const rect=this.getCardRect(), x=(e.clientX-rect.left)/rect.width*2-1, y=1-(e.clientY-rect.top)/rect.height*2;
   const nearCenter=Math.max(Math.abs(x),Math.abs(y)) < .35;
   const normal=nearCenter ? null : gripNormal(x,y);
   if (normal && (normal.x !== this.normal.x || normal.y !== this.normal.y)) { this.normal=normal; this.setProgress(0); }
   this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY,start:this.progress,normal,rect};
   this.hit.setPointerCapture(e.pointerId); this.onSound('drag');
  };
  this.hit.onpointermove = e => {
   const p=this.pointer; if (!p || p.id!==e.pointerId) return;
   const delta={x:e.clientX-p.x,y:p.y-e.clientY}; if (Math.hypot(delta.x,delta.y)>=10) p.moved=true;
   if (!p.normal && Math.hypot(delta.x,delta.y)>8) { p.normal=gripNormal(-delta.x,-delta.y); if (p.normal.x!==this.normal.x || p.normal.y!==this.normal.y) { this.normal=p.normal; this.setProgress(0); p.start=0; } }
   if (!p.normal) return;
   const scale=p.rect.width, qmax=Math.abs(p.normal.x)*.5+Math.abs(p.normal.y)*.6945;
   this.setProgress(projectedProgress(p.start,delta,p.normal,scale*(2*qmax+Math.PI*.12)));
  };
  this.hit.onpointerup = e => { const p=this.pointer; if (!p || p.id!==e.pointerId) return; this.pointer=null; if (!p.moved || this.progress>=.9) this.finish(); };
  this.hit.onpointercancel = e => { if (this.pointer?.id===e.pointerId) this.pointer=null; };
  this.hit.onlostpointercapture = e => { if (this.pointer?.id===e.pointerId) this.pointer=null; };
  this.layoutHit();
  if (!reduced) cardImages(card).then(images => { if (this.resolve && this.serial === serial) this.createRenderer(images); }).catch(() => {});
  return this.promise;
 }
 getCardRect() { return this.hit.getBoundingClientRect(); }
 layoutHit() { this.hit.style.width="72%"; this.hit.style.height="auto"; this.hit.style.aspectRatio="144 / 200"; }
 createRenderer(images) {
  try {
   const canvas = document.createElement('canvas'); canvas.className = 'salon-squeeze__canvas';
   const renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true}); renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
   const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1,1,1.3,-1.3,.1,10); camera.position.set(0,0,4);
   const geometry = new THREE.PlaneGeometry(1, 1.389, 24, 80), base = geometry.attributes.position.array.slice();
   const frontTexture = texture(images[0]), backTexture = texture(images[1]); frontTexture.repeat.x = -1; frontTexture.offset.x = 1;
   const back = new THREE.MeshStandardMaterial({map:backTexture,side:THREE.FrontSide,roughness:.65});
   const front = new THREE.MeshStandardMaterial({map:frontTexture,side:THREE.BackSide,roughness:.65});
   scene.add(new THREE.AmbientLight(0xffffff, 1.3)); const light = new THREE.DirectionalLight(0xffe8bc, 2); light.position.set(-2, 3, 4); scene.add(light);
   scene.add(new THREE.Mesh(geometry, back), new THREE.Mesh(geometry, front));
   this.graphics = {renderer,scene,camera,geometry,base,frontTexture,backTexture,front,back,canvas};
   this.stage.append(canvas); this.fallback.classList.add('is-rendered');
   this.observer = new ResizeObserver(() => this.draw()); this.observer.observe(this.stage); this.draw();
  } catch (_) { this.releaseGraphics(); }
 }
 setProgress(progress) {
  if (!this.resolve) return; this.progress = clamp(progress); this.host.dataset.progress = String(this.progress); this.host.dataset.direction = [this.normal.y>0?'top':this.normal.y<0?'bottom':'',this.normal.x<0?'left':this.normal.x>0?'right':''].filter(Boolean).join('-'); this.back.style.clipPath = backPolygon(this.normal,this.progress); this.draw(); this.onProgress(this.progress);
 }
 draw() {
  const g = this.graphics; if (!g) return; const rect = this.stage.getBoundingClientRect(); if (!rect.width || !rect.height) return;
  g.renderer.setSize(rect.width, rect.height, false); const aspect = rect.width / rect.height;
  const a = g.geometry.attributes.position; let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for (let i=0;i<a.count;i++) { const v=foldPoint({x:g.base[i*3],y:g.base[i*3+1]},this.normal,this.progress); a.setXYZ(i,v.x,v.y,v.z); minX=Math.min(minX,v.x); maxX=Math.max(maxX,v.x); minY=Math.min(minY,v.y); maxY=Math.max(maxY,v.y); }
  const cx=(minX+maxX)/2, cy=(minY+maxY)/2; for(let i=0;i<a.count;i++) { a.setX(i,a.getX(i)-cx); a.setY(i,a.getY(i)-cy); }
  const extent=Math.max(.68,(maxY-minY)/2+.035,(maxX-minX+.07)/(2*aspect)); g.camera.left=-extent*aspect; g.camera.right=extent*aspect; g.camera.top=extent; g.camera.bottom=-extent; g.camera.updateProjectionMatrix();
  this.hit.style.width=`${(maxX-minX)/(2*extent*aspect)*100}%`; this.hit.style.height=`${(maxY-minY)/(2*extent)*100}%`;
  a.needsUpdate = true; g.geometry.computeVertexNormals(); g.renderer.render(g.scene,g.camera);
 }
 finish() { if (!this.resolve) return; this.setProgress(1); this.onSound('reveal'); const resolve = this.resolve; this.resolve = null; this.releaseGraphics(); this.host.hidden = true; this.host.replaceChildren(); this.onReveal(); resolve(true); }
 cancel() { if (!this.resolve) return; const resolve = this.resolve; this.resolve = null; ++this.serial; this.pointer = null; this.releaseGraphics(); this.host.hidden = true; this.host.replaceChildren(); resolve(false); }
 releaseGraphics() { this.observer?.disconnect(); this.observer = null; const g = this.graphics; if (!g) return; g.geometry.dispose(); g.front.dispose(); g.back.dispose(); g.frontTexture.dispose(); g.backTexture.dispose(); g.renderer.dispose(); g.renderer.forceContextLoss(); g.canvas.remove(); this.graphics = null; }
 dispose() { this.cancel(); this.releaseGraphics(); this.host.replaceChildren(); this.host.classList.remove('salon-squeeze'); }
}
