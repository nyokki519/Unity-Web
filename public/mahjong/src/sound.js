/** Licensed Kobalab WAV cues with a quiet Web Audio fallback, both gesture-gated. */
export function createMahjongSound({audioContextFactory,assetAudioFactory,fetchImpl=globalThis.fetch}={}) {
  const AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext;
  const factory=audioContextFactory||(AudioContextClass?()=>new AudioContextClass():null);
  const audioFactory=assetAudioFactory||(typeof globalThis.Audio==='function'?src=>new Audio(src):null);
  let context=null, enabled=false, supported=!!audioFactory||!!factory;
  const activeVoices=[];
  const activeAssets=new Set();
  const decodedAssets=new Map();
  let useWebAudioAssets=false;
  const maxVoices=12;
  const cues={tile:'beep.wav',draw:'beep.wav',discard:'dahai11.wav',call:'pon.wav',chi:'chii.wav',pon:'pon.wav',kan:'kan.wav',ankan:'kan.wav',kakan:'kan.wav',riichi:'richi.wav',win:'tsumo.wav',tsumo:'tsumo.wav',ron:'ron.wav',loss:'beep.wav',result:'nc43994.wav'};
  const volume={tile:.14,draw:.12,discard:.2,call:.22,chi:.22,pon:.22,kan:.24,ankan:.2,kakan:.22,riichi:.25,win:.3,tsumo:.3,ron:.3,loss:.12,result:.18};

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
  const fallbackCues={chi:'call',pon:'call',kan:'call',ankan:'call',kakan:'call',ron:'win',tsumo:'win'};

  function enableFromGesture(){
    if(!supported)return false;
    try{
      if(factory){
        context ||= factory?.();
        if(context){
          const resumed=context.resume?.();if(resumed?.catch)resumed.catch(()=>{enabled=false;});
          useWebAudioAssets=typeof context.decodeAudioData==='function'&&typeof fetchImpl==='function';
          if(useWebAudioAssets)for(const file of new Set(Object.values(cues)))if(!decodedAssets.has(file)){
            const promise=Promise.resolve().then(()=>fetchImpl(`/mahjong/assets/kobalab/audio/${file}`,{credentials:'same-origin'}))
              .then(response=>{if(!response?.ok)throw new Error(`Unable to load audio cue ${file}`);return response.arrayBuffer();})
              .then(bytes=>context.decodeAudioData(bytes)).then(buffer=>{decodedAssets.set(file,buffer);return buffer;})
              .catch(()=>{decodedAssets.set(file,null);return null;});
            decodedAssets.set(file,promise);
          }
        }else if(!audioFactory){supported=false;return false;}
      }
      if(!context&&!audioFactory){supported=false;return false;}
      enabled=true;
      return true;
    }catch{
      supported=false;enabled=false;context=null;return false;
    }
  }

  function releaseVoice(voice){
    const index=activeVoices.indexOf(voice);
    if(index!==-1)activeVoices.splice(index,1);
    try{voice.oscillator.disconnect?.();voice.gain.disconnect?.();}catch{}
  }

  function disable(){
    enabled=false;
    for(const voice of activeAssets){try{voice.pause?.();voice.currentTime=0;}catch{}}
    activeAssets.clear();
    for(const voice of [...activeVoices]){
      try{voice.source.stop(context.currentTime);}catch{}
      releaseVoice(voice);
    }
  }

  function tone({frequency,endFrequency=frequency,at,duration,volume,type}){
    const oscillator=context.createOscillator(),gain=context.createGain();
    oscillator.type=type;
    oscillator.frequency.setValueAtTime(frequency,at);
    if(endFrequency!==frequency)oscillator.frequency.exponentialRampToValueAtTime(endFrequency,at+duration);
    gain.gain.setValueAtTime(.0001,at);
    gain.gain.exponentialRampToValueAtTime(volume,at+.008);
    gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    oscillator.connect(gain);gain.connect(context.destination);
    const voice={source:oscillator,gain,endsAt:at+duration+.008};
    activeVoices.push(voice);
    oscillator.onended=()=>releaseVoice(voice);
    oscillator.start(at);oscillator.stop(voice.endsAt);
  }

  function playDecodedAsset(name,buffer,at){
    const source=context.createBufferSource(),gain=context.createGain();
    source.buffer=buffer;source.connect(gain);gain.connect(context.destination);
    gain.gain.setValueAtTime(volume[name]??.18,at);
    const voice={source,gain,endsAt:at+buffer.duration+.01};
    activeVoices.push(voice);source.onended=()=>releaseVoice(voice);source.start(at);return true;
  }

  function playProcedural(name,at){
    if(!context||context.state==='suspended'||context.state==='closed')return false;
    const pattern=patterns[fallbackCues[name]||name];
    if(!pattern||activeVoices.length+pattern.length>maxVoices)return false;
    try{
      for(const [frequency,offset,duration,volume,type,endFrequency] of pattern)tone({frequency,endFrequency,at:at+offset,duration,volume,type});
      return true;
    }catch{return false;}
  }

  function cue(name){
    if(!enabled)return false;
    const file=cues[name];if(!file)return false;
    const at=context?.currentTime||0;
    for(const voice of [...activeVoices])if(voice.endsAt<=at)releaseVoice(voice);
    if(useWebAudioAssets){
      const buffer=decodedAssets.get(file);
      if(typeof buffer?.then==='function')return false;
      if(buffer){
        if(!context||context.state!=='running'||activeVoices.length>=maxVoices)return false;
        try{return playDecodedAsset(name,buffer,at);}catch{return false;}
      }
      return playProcedural(name,at);
    }
    if(audioFactory){
      if(activeAssets.size>=10)return false;
      try{
        const voice=audioFactory(`/mahjong/assets/kobalab/audio/${file}`);
        if(!voice)return false;
        voice.preload='auto';voice.volume=volume[name]??.18;voice.currentTime=0;
        activeAssets.add(voice);
        const release=()=>activeAssets.delete(voice);
        voice.addEventListener?.('ended',release,{once:true});voice.addEventListener?.('error',release,{once:true});
        const result=voice.play?.();if(result?.catch)result.catch(release);
        return true;
      }catch{return false;}
    }
    return playProcedural(name,at);
  }

  return {get available(){return supported;},get enabled(){return enabled;},enableFromGesture,disable,cue};
}
