// Gameplay revision; old replays are not interpreted using changed combat rules.
export const GAME_VERSION='1.3.0';
export const UPGRADE_BALANCE=Object.freeze({powerPerLevel:.11,powerLatePerLevel:.025,rapidPerLevel:.12,rapidLatePerLevel:.04,auxInterval:.65,auxReferenceInterval:1.2,laserBase:3,laserPerLevel:2,missileBase:5,missilePerLevel:3,sideDamage:.08,ricochetInterval:.65,orbitInterval:.42});
// Early pickups retain their strength; later pickups add smaller, positive gains.
export function powerScale(level){const n=Math.max(0,level-1);return 1+Math.min(3,n)*UPGRADE_BALANCE.powerPerLevel+Math.max(0,n-3)*UPGRADE_BALANCE.powerLatePerLevel;}
export function rapidScale(level){return 1+Math.min(2,level)*UPGRADE_BALANCE.rapidPerLevel+Math.max(0,level-2)*UPGRADE_BALANCE.rapidLatePerLevel;}
export function orbitPositions(player,time){
 const level=player.orbitLevel||0;if(!level)return [];
 return Array.from({length:level+1},(_,i)=>{const angle=time*2+i*Math.PI*2/(level+1);return{x:player.x+Math.cos(angle)*48,y:player.y+Math.sin(angle)*48,angle};});
}

// Native damage per trigger, used to share power across additional side lanes.
// This is a shot budget, not an adaptive enemy-health or hit-result correction.
export function wideningScale(kind,level,width){
 if(kind==='shot'){const old=(level>=6?3:level>=3?2:1)+Math.min(2,width),visible=(level>=6?3:level>=3?2:1)+width;return old/visible;}
 if(kind==='spread')return 1;
 const native={focus:2.55,charge:7,homing:2,plasma:1.5,chain:.85,explosive:1.4,reflect:2,drill:1.3,wave:3,saber:1.32,turret:1.3,drone:3,burst:10.4,fusion:2.7}[kind]||1;
 return native/(native+2*width*UPGRADE_BALANCE.sideDamage);
}
