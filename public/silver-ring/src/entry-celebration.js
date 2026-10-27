// Time-parametric presentation only: never consumes the simulation RNG.
export function entryBurstFrame(age,reduced=false){
 if(!Number.isFinite(age)||age<0||age>=1.05)return{visible:false,particles:[],opacity:0};
 const p=age/1.05,n=reduced?12:64;
 return{visible:true,opacity:(1-p)**1.5*(reduced?.45:1),ringRadius:.032+.055*p,
  particles:Array.from({length:n},(_,i)=>{const a=i*2.3999632297,r=.032+age*(.035+(i%7)*.008)*(reduced?.35:1),y=.009+Math.sin(Math.min(1,age)*Math.PI)*(.016+(i%5)*.005);return[Math.cos(a)*r,y,Math.sin(a)*r];})};
}
export function shouldCueEntry(played,cut,time,entry){
 if(!Number.isFinite(entry)||time<entry||played.has(cut))return false;
 played.add(cut);return true;
}
