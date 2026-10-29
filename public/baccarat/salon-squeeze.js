import * as THREE from '../vendor/three/three.module.js';
import {createCard, frameForCard} from './salon-card.js';
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
  this.cancel(); const serial = ++this.serial; this.progress = 0; this.reduced = reduced;
  this.host.hidden = false; this.host.dataset.progress = '0'; this.host.classList.add('salon-squeeze');
  this.host.innerHTML = `<div class="salon-squeeze__panel"><p class="salon-squeeze__label"></p><p class="salon-squeeze__hint">カードの下端を上へなぞると、少しずつめくれます。</p><div class="salon-squeeze__stage" role="button" tabindex="0" aria-label="カードをなぞるか、Enterキーでめくる"><div class="salon-squeeze__fallback"></div></div><button class="salon-squeeze__reveal" data-squeeze="finish" type="button">このカードをめくる</button></div>`;
  this.host.querySelector('.salon-squeeze__label').textContent = label;
  this.stage = this.host.querySelector('.salon-squeeze__stage'); this.fallback = this.host.querySelector('.salon-squeeze__fallback');
  this.face = createCard(card); this.back = createCard(card, {hidden:true}); this.fallback.append(this.face, this.back);
  this.promise = new Promise(resolve => { this.resolve = resolve; });
  this.button = this.host.querySelector('button'); this.button.onclick = () => this.finish(); this.stage.focus({preventScroll:true});
  this.stage.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.finish(); } };
  this.stage.onpointerdown = e => { if (e.button !== 0 || this.pointer) return; const rect = this.stage.getBoundingClientRect(); this.pointer = {id:e.pointerId,x:e.clientX,y:e.clientY,start:this.progress,rect}; this.stage.setPointerCapture(e.pointerId); this.onSound('drag'); };
  this.stage.onpointermove = e => { const p = this.pointer; if (!p || p.id !== e.pointerId) return; const distance = p.y - e.clientY; this.setProgress(p.start + distance / (p.rect.height * .65), (p.x - p.rect.left) / p.rect.width * 2 - 1); };
  this.stage.onpointerup = e => { const p = this.pointer; if (!p || p.id !== e.pointerId) return; this.pointer = null; if (Math.hypot(e.clientX-p.x,e.clientY-p.y) < 10 || this.progress >= .9) this.finish(); };
  this.stage.onpointercancel = () => { this.pointer = null; };
  if (!reduced) cardImages(card).then(images => { if (this.resolve && this.serial === serial) this.createRenderer(images); }).catch(() => {});
  return this.promise;
 }
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
 setProgress(progress, grip = 0) {
  if (!this.resolve) return; this.progress = clamp(progress); this.host.dataset.progress = String(this.progress); this.grip = grip; this.fallback.style.setProperty('--peek', `${this.progress * 100}%`); this.draw(); this.onProgress(this.progress);
 }
 draw() {
  const g = this.graphics; if (!g) return; const rect = this.stage.getBoundingClientRect(); if (!rect.width || !rect.height) return;
  g.renderer.setSize(rect.width, rect.height, false); const aspect = rect.width / rect.height;
  const a = g.geometry.attributes.position, p = this.progress, radius = .12, bend = (this.grip || 0) * .22 * Math.sin(p * Math.PI);
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < a.count; i++) { const x = g.base[i*3], y = g.base[i*3+1], fold = -.6945 + p * (1.389 + Math.PI * radius) + x * bend, d = Math.max(0, fold - y), angle = Math.min(Math.PI, d/radius); const yy = d === 0 ? y : d < Math.PI * radius ? fold-radius*Math.sin(angle) : fold+(d-Math.PI*radius); a.setXYZ(i,x,yy,radius*(1-Math.cos(angle))); minY=Math.min(minY,yy); maxY=Math.max(maxY,yy); }
  const center = (minY+maxY)/2; for (let i=0;i<a.count;i++) a.setY(i,a.getY(i)-center);
  const extent = Math.max(.68, (maxY-minY)/2+.035, .52/aspect); g.camera.left = -extent*aspect; g.camera.right = extent*aspect; g.camera.top = extent; g.camera.bottom = -extent; g.camera.updateProjectionMatrix();
  a.needsUpdate = true; g.geometry.computeVertexNormals(); g.renderer.render(g.scene,g.camera);
 }
 finish() { if (!this.resolve) return; this.setProgress(1); this.onSound('reveal'); const resolve = this.resolve; this.resolve = null; this.releaseGraphics(); this.host.hidden = true; this.host.replaceChildren(); this.onReveal(); resolve(true); }
 cancel() { if (!this.resolve) return; const resolve = this.resolve; this.resolve = null; ++this.serial; this.pointer = null; this.releaseGraphics(); this.host.hidden = true; this.host.replaceChildren(); resolve(false); }
 releaseGraphics() { this.observer?.disconnect(); this.observer = null; const g = this.graphics; if (!g) return; g.geometry.dispose(); g.front.dispose(); g.back.dispose(); g.frontTexture.dispose(); g.backTexture.dispose(); g.renderer.dispose(); g.renderer.forceContextLoss(); g.canvas.remove(); this.graphics = null; }
 dispose() { this.cancel(); this.releaseGraphics(); this.host.replaceChildren(); this.host.classList.remove('salon-squeeze'); }
}
