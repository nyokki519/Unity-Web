// Gameplay revision; old replays are not interpreted using changed combat rules.
export const GAME_VERSION='1.1.0';
export const UPGRADE_BALANCE=Object.freeze({powerPerLevel:.25,rapidPerLevel:.22,auxInterval:.65,laserBase:9,laserPerLevel:4,missileBase:12,missilePerLevel:5});
export function orbitPositions(player,time){
 const level=player.orbitLevel||0;if(!level)return [];
 return Array.from({length:level+1},(_,i)=>{const angle=time*2+i*Math.PI*2/(level+1);return{x:player.x+Math.cos(angle)*48,y:player.y+Math.sin(angle)*48,angle};});
}
