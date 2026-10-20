export const SETTINGS=Object.freeze({radius:.18,ballRadius:.0055,ballMass:.0054,holeRadius:.012,dt:1/240,initialBalls:20,maxLive:4,shotInterval:.65,maxBallAge:35,linearDamping:.055,rollingAngularDamping:.32});
export const holes=Object.freeze(Array.from({length:3},(_,id)=>{const a=-Math.PI/2+id*Math.PI*2/3;return Object.freeze({id,x:Math.cos(a)*.062,z:Math.sin(a)*.062,win:id===0});}));
export function surfaceHeight(r){return .025+.055*(r/SETTINGS.radius)**2+.020*Math.exp(-(r*r)/(.045*.045));}
export function seeded(seed){let n=Number(seed)>>>0;return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
// Three shallow, machined drainage valleys; part of the visible collision surface,
// not a force applied to a ball or a result chosen after entry.
export function surfaceAt(x,z){const r=Math.hypot(x,z);return surfaceHeight(r)-.0015*Math.sin(3*Math.atan2(z,x))*Math.exp(-(((r-.062)/.028)**2));}
