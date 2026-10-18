// RAF timestamps may precede a clock reset during slow startup or resume.
export function frameDelta(now,previous){
 if(!Number.isFinite(now)||!Number.isFinite(previous))return 0;
 return Math.max(0,Math.min(.05,(now-previous)/1000));
}
