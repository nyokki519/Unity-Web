import {CFG} from './config.js';
// Unify the displayed aperture, sleeve and centre-clearance test. The final
// winning hole is a vertical bore; other holes retain the legacy model.
export function holeGeometry(bw,h,rotation=0){
 const exact=CFG.bowls.contacts.enabled&&Number.isFinite(h.aperture);
 const radial=CFG.bowls.contacts.enabled?(h.ringR??bw.ringR):bw.ringR,a=h.a+rotation;
 const aperture=exact?h.aperture:.0215;
 return {a,x:Math.cos(a)*radial,z:Math.sin(a)*radial,radial,aperture,
  capture:exact?Math.max(0,aperture*Math.cos(Math.PI/48)-CFG.ball.r):CFG.bowls.capture,
  fallDepth:exact?(h.entryDepth??CFG.bowls.contacts.fallDepth):CFG.bowls.contacts.fallDepth,
  ringRadius:exact?aperture+.0045:CFG.bowls.contacts.rimRadius,vertical:exact};
}
export function canEnterHole(x,z,h){return Number.isFinite(x)&&Number.isFinite(z)&&Math.hypot(x-h.x,z-h.z)<h.capture;}
