// Relative dragging starts where the ship already is. Apply finger occlusion
// compensation only when the initial finger is close to the ship vertically;
// tapping repeatedly at the same location must not ratchet the ship upward.
export function touchAnchor(player,clientY,rect,offset){
 const finger=(clientY-rect.top)*720/Math.max(1,rect.height),gap=Number(offset)*720/Math.max(1,rect.height);
 return{x:player.x,y:Math.max(24,Math.min(695,Math.abs(finger-player.y)<90?Math.min(player.y,finger-gap):player.y))};
}
