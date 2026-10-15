// Short original tones; audio is created only after an explicit user gesture.
export function createBonusAudio(){
 let context=null,enabled=false;
 return{
  async setEnabled(value){enabled=!!value;if(!enabled)return;try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio){enabled=false;return;}context||=new Audio();await context.resume();}catch{enabled=false;}},
  play(type){if(!enabled||!context||context.state!=='running')return;const frequencies={fire:170,entry:360,pass:540,jackpot:880,miss:120};const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type='sine';oscillator.frequency.value=frequencies[type]||240;gain.gain.setValueAtTime(.035,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.13);oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+.15);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};},
  destroy(){enabled=false;context?.close().catch(()=>{});context=null;}
 };
}
