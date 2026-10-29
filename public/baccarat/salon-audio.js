/** Original, oscillator-composed lounge and soft contact sounds. No audio before unlock. */
export class SalonAudio {
  constructor(options = {}) {
    this.options = { muted:false, bgm:.12, se:.35, ui:.25 };
    this.ctx = null; this.nodes = new Set(); this.last = new Map(); this.timer = null;
    this.disposed = false; this.paused = false; this.bar = 0;
    this.visibility = () => { if (globalThis.document?.hidden) this.pause(); else this.resume(); };
    globalThis.document?.addEventListener('visibilitychange', this.visibility);
    this.set(options);
  }
  async unlock() {
    if (this.disposed) return false;
    try {
      if (!this.ctx) {
        const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Context) return false;
        this.ctx = new Context(); this.gains = {};
        for (const name of ['bgm','se','ui']) { const gain = this.ctx.createGain(); gain.connect(this.ctx.destination); this.gains[name] = gain; }
        this.set(this.options);
      }
      if (this.paused || globalThis.document?.hidden) return false;
      await this.ctx.resume(); this.startMusic(); return true;
    } catch { return false; }
  }
  set(options = {}) {
    for (const key of ['bgm','se','ui']) if (Number.isFinite(options[key])) this.options[key] = Math.max(0, Math.min(1, options[key]));
    if ('muted' in options) this.options.muted = !!options.muted;
    if (this.ctx) for (const key of ['bgm','se','ui']) this.gains[key].gain.setTargetAtTime(this.options.muted ? 0 : this.options[key], this.ctx.currentTime, .035);
    if (this.options.muted || !this.options.bgm) this.stopMusic(); else this.startMusic();
  }
  tone(frequency, delay, duration, volume, channel = 'se', type = 'sine') {
    if (!this.ctx || this.ctx.state !== 'running' || this.nodes.size >= 24 || this.paused || this.disposed) return;
    const voice = this.ctx.createOscillator(), gain = this.ctx.createGain(), time = this.ctx.currentTime + delay;
    voice.type = type; voice.frequency.setValueAtTime(frequency, time);
    gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(volume, time + .012); gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    voice.connect(gain); gain.connect(this.gains[channel]);
    const record = {voice, gain, channel}; this.nodes.add(record);
    voice.onended = () => { voice.disconnect(); gain.disconnect(); this.nodes.delete(record); };
    voice.start(time); voice.stop(time + duration + .02);
  }
  play(kind, strength = 1) {
    if (!this.ctx || this.ctx.state !== 'running' || this.paused || this.disposed || this.options.muted) return;
    const time = this.ctx.currentTime;
    if (time - (this.last.get(kind) ?? -Infinity) < (kind === 'lift' ? .09 : .035)) return;
    this.last.set(kind, time);
    const level = Math.max(0, Math.min(1.5, Number.isFinite(strength) ? strength : 1));
    const notes = {
      chip:[[1280,0,.055,.12],[760,.008,.08,.08],[205,0,.085,.13]],
      undo:[[490,0,.08,.09],[330,.035,.1,.07]],
      confirm:[[440,0,.16,.11],[660,.06,.22,.09]],
      deal:[[180,0,.065,.12],[950,.012,.04,.025]],
      lift:[[260,0,.055,.035],[520,.015,.045,.015]],
      reveal:[[392,0,.22,.08],[587,.06,.27,.07],[784,.12,.3,.045]],
      third:[[523,0,.15,.1],[698,.07,.23,.07]],
      win:[[523,0,.32,.1],[659,.08,.36,.09],[784,.16,.4,.08],[1046,.24,.5,.055]],
      tie:[[440,0,.3,.08],[660,.1,.35,.06]],
      loss:[[220,0,.22,.07],[196,.09,.28,.045]],
      payout:[[784,0,.13,.08],[988,.09,.17,.07],[1175,.18,.25,.055]],
      click:[[640,0,.045,.065]]
    }[kind];
    if (!notes) return;
    const channel = ['click','undo','confirm'].includes(kind) ? 'ui' : 'se';
    for (const [hz,delay,duration,volume] of notes) this.tone(hz,delay,duration,volume*level,channel);
  }
  startMusic() {
    if (this.timer || !this.ctx || this.ctx.state !== 'running' || this.paused || this.disposed || this.options.muted || !this.options.bgm) return;
    const phrase = () => {
      if (this.paused || this.disposed) return;
      // Four original suspended jazz voicings, quietly articulated electric-piano style.
      const chords = [[130.81,196,246.94,293.66],[110,164.81,220,261.63],[146.83,220,261.63,329.63],[98,196,246.94,293.66]];
      const chord = chords[this.bar++ % chords.length];
      chord.forEach((hz,i) => this.tone(hz,i*.035,2.7,.045,'bgm'));
      this.tone(chord[0]/2,0,1.8,.065,'bgm');
      this.tone(chord[2]*2,1.5,.65,.025,'bgm');
    };
    phrase(); this.timer = setInterval(phrase, 3200);
  }
  stopVoices(channel) {
    for (const record of [...this.nodes]) if (!channel || record.channel === channel) {
      record.voice.onended = null;
      try { record.voice.stop(); } catch {}
      record.voice.disconnect(); record.gain.disconnect(); this.nodes.delete(record);
    }
  }
  stopMusic() { if (this.timer) clearInterval(this.timer); this.timer = null; this.stopVoices('bgm'); }
  pause() { this.paused = true; this.stopMusic(); this.stopVoices(); this.ctx?.suspend().catch(() => {}); }
  async resume() { if (this.disposed) return false; this.paused = false; if (!this.ctx || globalThis.document?.hidden) return false; try { await this.ctx.resume(); this.startMusic(); return true; } catch { return false; } }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.stopMusic(); this.stopVoices();
    globalThis.document?.removeEventListener('visibilitychange', this.visibility);
    if (this.gains) for (const gain of Object.values(this.gains)) gain.disconnect();
    this.ctx?.close().catch(() => {}); this.ctx = null; this.last.clear();
  }
}
