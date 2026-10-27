import {entryBurstFrame} from './entry-celebration.js';
import {winFunnelSpec} from './physics.js';
export function createFinalEntryFX(refs){
 const T=refs.THREE,f=winFunnelSpec(2),root=new T.Group();root.name='final-entry-celebration';root.position.set(f.x,f.top+.002,f.z);refs.ballsIM.parent.add(root);root.visible=false;
 const geo=new T.BufferGeometry(),positions=new Float32Array(64*3),colors=new Float32Array(64*3);
 const c=new T.Color();for(let i=0;i<64;i++){c.setHex(i%4===0?0x9effdc:i%4===1?0xfff9e1:0xffcf70);c.toArray(colors,i*3);}
 geo.setAttribute('position',new T.BufferAttribute(positions,3));geo.setAttribute('color',new T.BufferAttribute(colors,3));
 const pixels=new Uint8Array(32*32*4);for(let y=0;y<32;y++)for(let x=0;x<32;x++){const dx=(x-15.5)/15.5,dy=(y-15.5)/15.5,r=Math.hypot(dx,dy),a=Math.max(Math.exp(-r*r*18),Math.exp(-Math.abs(dx)*35-Math.abs(dy)*5),Math.exp(-Math.abs(dy)*35-Math.abs(dx)*5));const o=(y*32+x)*4;pixels[o]=pixels[o+1]=pixels[o+2]=255;pixels[o+3]=Math.round(255*a*Math.max(0,1-r));}
 const texture=new T.DataTexture(pixels,32,32);texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearFilter;texture.needsUpdate=true;
 const mat=new T.PointsMaterial({size:.016,map:texture,vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});
 const points=new T.Points(geo,mat);points.frustumCulled=false;root.add(points);
 const ringPoints=Array.from({length:80},(_,i)=>new T.Vector3(Math.cos(i*Math.PI/40),0,Math.sin(i*Math.PI/40)));
 const ringMat=new T.LineBasicMaterial({color:0xffdf94,transparent:true,depthWrite:false,opacity:0,toneMapped:false});const ring=new T.LineLoop(new T.BufferGeometry().setFromPoints(ringPoints),ringMat);root.add(ring);
 return{root,draw(age,reduced=false){const s=entryBurstFrame(age,reduced);root.visible=s.visible;if(!s.visible)return;
  for(let i=0;i<s.particles.length;i++)positions.set(s.particles[i],i*3);
  geo.setDrawRange(0,s.particles.length);geo.attributes.position.needsUpdate=true;mat.opacity=s.opacity;
  ring.visible=!reduced;ring.scale.setScalar(s.ringRadius);ringMat.opacity=s.opacity*.65;
 },clear(){root.visible=false;}};
}
