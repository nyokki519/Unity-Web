// Recorded positions only: playback never steps or changes the simulation.
export class ReplayHistory {
 constructor(limit=960){this.limit=limit;this.tracks=new Map();this.entries=new Map();}
 add(id,t,p){let a=this.tracks.get(id);if(!a)this.tracks.set(id,a=[]);a.push({t,p:[...p]});if(a.length>this.limit)a.splice(0,a.length-this.limit);}
 mark(id,t){this.entries.set(id,t);}
 clip(id,from,to){return(this.tracks.get(id)||[]).filter(s=>s.t>=from&&s.t<=to).map(s=>({t:s.t,p:[...s.p]}));}
 winningClip(id){const t=this.entries.get(id);return Number.isFinite(t)?this.clip(id,t-.85,t+.22):[];}
 prune(ids){for(const id of this.tracks.keys())if(!ids.has(id)){this.tracks.delete(id);this.entries.delete(id);}}
}
export function sampleReplay(track,t){
 if(!track.length)return null;
 let lo=0,hi=track.length-1;
 if(t<=track[lo].t)return [...track[lo].p];if(t>=track[hi].t)return [...track[hi].p];
 while(hi-lo>1){const mid=(lo+hi)>>1;if(track[mid].t<=t)lo=mid;else hi=mid;}
 const a=track[lo],b=track[hi],k=(t-a.t)/(b.t-a.t);
 return a.p.map((v,i)=>v+(b.p[i]-v)*k);
}
