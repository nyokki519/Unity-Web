/** Original, quiet Web Audio cues for Mahjong actions and hand results.
 * The context is created/resumed only from the explicit sound-toggle gesture. */
export function createMahjongSound({audioContextFactory}={}) {
  const AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext;
  const factory=audioContextFactory||(AudioContextClass?()=>new AudioContextClass():null);
  let context=null, enabled=false, supported=!!factory;
  const activeVoices=[];
  const maxVoices=12;

  // Frequency, offset, duration, peak volume, waveform, optional slide endpoint.
  const patterns={
    tile:[[720,0,.035,.018,'triangle',510]],
    draw:[[700,0,.07,.018,'triangle',560]],
    discard:[[520,0,.065,.018,'triangle',390]],
    call:[[494,0,.09,.021,'sine'],[622,.075,.12,.023,'sine']],
    riichi:[[587.33,0,.13,.022,'sine'],[739.99,.11,.14,.024,'sine'],[880,.23,.25,.027,'sine']],
    win:[[523.25,0,.14,.022,'sine'],[659.25,.11,.16,.024,'sine'],[783.99,.22,.24,.028,'sine']],
    loss:[[392,0,.14,.019,'triangle'],[329.63,.12,.17,.02,'triangle'],[261.63,.26,.25,.022,'triangle']],
    result:[[587.33,0,.12,.02,'sine'],[739.99,.1,.14,.022,'sine'],[880,.2,.21,.025,'sine']]
  };

  function enableFromGesture(){
    if(!supported||!factory)return false;
    try{
      context ||= factory();
      if(!context){supported=false;return false;}
      const resumed=context.resume?.();
      if(resumed?.catch)resumed.catch(()=>{enabled=false;});
      enabled=true;
      return true;
    }catch{
      supported=false;enabled=false;context=null;return false;
    }
  }

  function disable(){enabled=false;}

  function tone({frequency,endFrequency=frequency,at,duration,volume,type}){
    const oscillator=context.createOscillator(),gain=context.createGain();
    oscillator.type=type;
    oscillator.frequency.setValueAtTime(frequency,at);
    if(endFrequency!==frequency)oscillator.frequency.exponentialRampToValueAtTime(endFrequency,at+duration);
    gain.gain.setValueAtTime(.0001,at);
    gain.gain.exponentialRampToValueAtTime(volume,at+.008);
    gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    oscillator.connect(gain);gain.connect(context.destination);
    oscillator.start(at);oscillator.stop(at+duration+.008);
    activeVoices.push(at+duration+.008);
  }

  function cue(name){
    if(!enabled||!context||context.state==='suspended'||context.state==='closed')return false;
    const pattern=patterns[name];
    if(!pattern)return false;
    try{
      const at=context.currentTime;
      for(let i=activeVoices.length-1;i>=0;i--)if(activeVoices[i]<=at)activeVoices.splice(i,1);
      if(activeVoices.length+pattern.length>maxVoices)return false;
      for(const [frequency,offset,duration,volume,type,endFrequency] of pattern){
        tone({frequency,endFrequency,at:at+offset,duration,volume,type});
      }
      return true;
    }catch{return false;}
  }

  return {get available(){return supported;},get enabled(){return enabled;},enableFromGesture,disable,cue};
}
