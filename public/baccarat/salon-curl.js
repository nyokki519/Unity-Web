const clamp = n => Math.max(0, Math.min(1, n));
export function gripNormal(x, y) {
 const ax=Math.abs(x), ay=Math.abs(y); let nx=0, ny=0;
 if (ax > .6 && ay > .6) { nx=Math.sign(x); ny=Math.sign(y); }
 else if (ax > ay) nx=Math.sign(x) || 1; else ny=Math.sign(y) || 1;
 const length=Math.hypot(nx,ny); return {x:nx/length,y:ny/length};
}
export function projectedProgress(start, delta, normal, travel) {
 return clamp(start - (delta.x*normal.x + delta.y*normal.y) / travel);
}
export function foldPoint(point, normal, progress, radius=.12) {
 const qmax=Math.abs(normal.x)*.5+Math.abs(normal.y)*.6945;
 const fold=qmax-clamp(progress)*(2*qmax+Math.PI*radius), q=point.x*normal.x+point.y*normal.y;
 const d=Math.max(0,q-fold), angle=Math.min(Math.PI,d/radius);
 const qp=d===0?q:d<Math.PI*radius?fold+radius*Math.sin(angle):fold-(d-Math.PI*radius);
 return {x:point.x+normal.x*(qp-q),y:point.y+normal.y*(qp-q),z:radius*(1-Math.cos(angle))};
}
// Clip the unturned back against the same crease, in normalized card coordinates.
export function backPolygon(normal, progress) {
 const qmax=Math.abs(normal.x)*.5+Math.abs(normal.y)*.6945, fold=qmax-clamp(progress)*(2*qmax+Math.PI*.12);
 let input=[[-.5,-.6945],[.5,-.6945],[.5,.6945],[-.5,.6945]], out=[];
 for(let i=0;i<input.length;i++) { const a=input[i],b=input[(i+1)%input.length],qa=a[0]*normal.x+a[1]*normal.y-fold,qb=b[0]*normal.x+b[1]*normal.y-fold;
  if(qa<=0)out.push(a); if((qa<0 && qb>0)||(qa>0 && qb<0)) { const t=qa/(qa-qb); out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]); }
 }
 return out.length ? `polygon(${out.map(([x,y])=>`${(x+.5)*100}% ${(1-(y+.6945)/1.389)*100}%`).join(',')})` : 'inset(100%)';
}
