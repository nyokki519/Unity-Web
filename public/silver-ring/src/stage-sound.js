export function stageSoundMix(finalActive){return {ambient:finalActive ? .24 : 1,pins:finalActive ? .45 : 1};}
export function contactVoice(type,strength){
 if(!Number.isFinite(strength)||strength<=0)return null;
 const config={rim:[1850,.045,.045],pair:[3100,.028,.055],air:[700,.075,.035]}[type];
 if(!config)return null;
 return {frequency:config[0],duration:config[1],gain:Math.min(config[2],.006+Math.min(2,strength)*.025)};
}
