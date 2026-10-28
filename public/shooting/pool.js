export class BulletPool {
 constructor(capacity=8192){this.capacity=capacity;this.count=0;this.free=[];this.hitTargets=Array(capacity).fill(null);
 for(const key of ['x','y','px','py','vx','vy','r','age','life','damage','turn','acceleration','splitAt'])this[key]=new Float32Array(capacity);
 for(const key of ['active','owner','grazed','homing','split','bounces'])this[key]=new Uint8Array(capacity);
 this.kind=new Int16Array(capacity);this.pierce=new Int16Array(capacity);this.lastHit=new Int32Array(capacity);
 for(let i=capacity-1;i>=0;i--)this.free.push(i);
 }
 add(x,y,vx,vy,opt={}){if(!this.free.length)return-1;const i=this.free.pop();this.count++;this.active[i]=1;this.hitTargets[i]=null;this.x[i]=this.px[i]=x;this.y[i]=this.py[i]=y;this.vx[i]=vx;this.vy[i]=vy;
 for(const k of ['age','grazed','lastHit'])this[k][i]=0;
 for(const[k,v]of Object.entries({r:4,life:9,damage:1,owner:0,kind:0,pierce:0,turn:0,acceleration:0,homing:0,split:0,splitAt:1.1,bounces:0}))this[k][i]=opt[k]??v;
 return i;}
 remove(i){if(this.active[i]){this.active[i]=0;this.hitTargets[i]=null;this.count--;this.free.push(i);}}
 clear(owner){for(let i=0;i<this.capacity;i++)if(this.active[i]&&(owner===undefined||this.owner[i]===owner))this.remove(i);}
}
export function segmentDistance2(x,y,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,d=dx*dx+dy*dy,t=d?Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/d)):0;return(x-ax-dx*t)**2+(y-ay-dy*t)**2;}
export function random(seed){let x=2166136261;for(const c of String(seed))x=Math.imul(x^c.charCodeAt(0),16777619);return()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
