/** Original, quiet Web Audio cues for tile selection and hand results.
 * The context is created/resumed only from the explicit sound-toggle gesture. */
export function createMahjongSound({audioContextFactory}={}) {
  const AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext;
  const factory=audioContextFactory||(AudioContextClass?()=>new AudioContextClass():null);
  let context=null, enabled=false, supported=!!factory;
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
  function tone({frequency,endFrequency=frequency,at,duration=.055,volume=.025,type='sine'}){
    const oscillator=context.createOscillator(),gain=context.createGain();
    oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,at);
    if(endFrequency!==frequency)oscillator.frequency.exponentialRampToValueAtTime(endFrequency,at+duration);
    gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    oscillator.connect(gain);gain.connect(context.destination);oscillator.start(at);oscillator.stop(at+duration+.008);
  }
  function cue(name){
    if(!enabled||!context||context.state==='suspended'||context.state==='closed')return false;
    try{
      const at=context.currentTime;
      if(name==='tile')tone({frequency:720,endFrequency:510,at,duration:.035,volume:.018,type:'triangle'});
      else if(name==='result'){
        tone({frequency:523.25,at,duration:.11,volume:.022});
        tone({frequency:659.25,at:at+.07,duration:.12,volume:.024});
        tone({frequency:783.99,at:at+.14,duration:.19,volume:.028});
      }else return false;
      return true;
    }catch{return false;}
  }
  return {get available(){return supported;},get enabled(){return enabled;},enableFromGesture,disable,cue};
}
