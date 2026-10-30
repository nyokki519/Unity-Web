// Original short UI motifs. Uses the contact audio's gesture-unlocked context and volume.
// Nothing plays while audio is OFF or paused; no downloaded casino samples.
export function salonCue(sound,kind){
 if(!sound?.enabled||sound.paused||!sound.volume||sound.context?.state!=='running')return;
 const c=sound.context,t=c.currentTime;
 const tones=kind==='win'?[523.25,659.25,783.99]:kind==='loss'?[220,174.61]:kind==='tie'?[392,392]:[880];
 tones.forEach((hz,i)=>{const o=c.createOscillator(),g=c.createGain(),start=t+i*.065,end=start+(kind==='chip'?.055:.18);o.type='sine';o.frequency.value=hz;g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(kind==='chip'?.025:.04,start+.005);g.gain.exponentialRampToValueAtTime(.00001,end);o.connect(g);g.connect(sound.bus);o.onended=()=>{o.disconnect();g.disconnect();};o.start(start);o.stop(end+.01);});
}
