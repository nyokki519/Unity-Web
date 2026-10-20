// Original synthesis, no sampled music or third-party recordings.
export class AtelierAudio{
 constructor(){this.enabled=false;this.ctx=null;}
 async setEnabled(value){this.enabled=value;if(value){this.ctx??=new(window.AudioContext||window.webkitAudioContext)();await this.ctx.resume();}else if(this.ctx)await this.ctx.suspend();}
 play(win=false){if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;const t=this.ctx.currentTime;
 for(const [i,f]of(win?[880,1320,1760]:[520]).entries()){const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='sine';o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.045,t+.005+i*.09);g.gain.exponentialRampToValueAtTime(.0001,t+.3+i*.09);o.connect(g).connect(this.ctx.destination);o.start(t+i*.09);o.stop(t+.4+i*.09);}}
 impact(strength){if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='sine';o.frequency.setValueAtTime(2700+strength*1200,t);g.gain.setValueAtTime(.015*strength,t);g.gain.exponentialRampToValueAtTime(.0001,t+.075);o.connect(g).connect(this.ctx.destination);o.start(t);o.stop(t+.08);}
 suspend(){this.ctx?.suspend();}
 dispose(){this.ctx?.close();}
}
