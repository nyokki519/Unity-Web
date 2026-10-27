import {CFG} from './config.js';
// Visual dimensions remain the original game design. The final winning
// hole has a separate explicit central-hit rule, not a full rigid-body fit.
export function holeGeometry(bw,h,rotation=0){
 const exact=CFG.bowls.contacts.enabled&&Number.isFinite(h.centerCapture);
 const radial=CFG.bowls.contacts.enabled?(h.ringR??bw.ringR):bw.ringR,a=h.a+rotation;
 const aperture=.0215;
 return {a,x:Math.cos(a)*radial,z:Math.sin(a)*radial,radial,aperture,
  capture:exact?h.centerCapture:CFG.bowls.capture,
  fallDepth:exact?(h.entryDepth??CFG.bowls.contacts.fallDepth):CFG.bowls.contacts.fallDepth,
  ringRadius:CFG.bowls.contacts.rimRadius,vertical:exact};
}
export function canEnterHole(x,z,h){return Number.isFinite(x)&&Number.isFinite(z)&&Math.hypot(x-h.x,z-h.z)<h.capture;}
