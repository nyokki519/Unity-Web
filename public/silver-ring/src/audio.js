// Adapted with author permission reported by the user. See ../NOTICE.txt.
// ============================================================
// 「沼」音频引擎 —— 全程序化合成,无外部素材
// ============================================================

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.last = {};   // 限流时间戳
  }

  resume() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = this.muted ? 0 : 0.85;
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -18; this.comp.ratio.value = 6;
    this.master.connect(this.comp); this.comp.connect(c.destination);
    // 白噪声缓存
    const len = c.sampleRate;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.startAmbient();
    this.startBowlLoop();
  }

  setMute(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.85, this.ctx.currentTime, 0.05);
  }

  gate2(key, minGap) {
    const t = performance.now();
    if (this.last[key] && t - this.last[key] < minGap) return false;
    this.last[key] = t; return true;
  }

  // ---------- 基础积木 ----------
  osc(type, f0, f1, t0, dur, vol, dest) {
    const c = this.ctx;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 !== null && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || this.master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  noise(t0, dur, vol, filterType, freq, q, sweepTo) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf; s.loop = true;
    s.playbackRate.value = 0.7 + Math.random() * 0.6;
    const f = c.createBiquadFilter();
    f.type = filterType; f.frequency.setValueAtTime(freq, t0);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
    f.Q.value = q || 0.8;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t0); s.stop(t0 + dur + 0.02);
  }

  // ---------- 持续声 ----------
  startAmbient() {
    const c = this.ctx, t = c.currentTime;
    const g = c.createGain(); g.gain.value = 0.0;
    g.gain.setTargetAtTime(0.05, t, 3);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160; f.Q.value = 2;
    for (const det of [55, 55.7, 82.4]) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = det;
      const og = c.createGain(); og.gain.value = 0.33;
      o.connect(og); og.connect(f); o.start(t);
    }
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07;
    const lg = c.createGain(); lg.gain.value = 60;
    lfo.connect(lg); lg.connect(f.frequency); lfo.start(t);
    f.connect(g); g.connect(this.master);
    // 空调气流感
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const nf = c.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 240;
    const ng = c.createGain(); ng.gain.value = 0.012;
    s.connect(nf); nf.connect(ng); ng.connect(this.master); s.start(t);
  }

  startBowlLoop() {
    const c = this.ctx;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    this.bowlFilter = c.createBiquadFilter();
    this.bowlFilter.type = 'bandpass'; this.bowlFilter.frequency.value = 420; this.bowlFilter.Q.value = 1.6;
    this.bowlGain = c.createGain(); this.bowlGain.gain.value = 0;
    s.connect(this.bowlFilter); this.bowlFilter.connect(this.bowlGain);
    this.bowlGain.connect(this.master); s.start(c.currentTime);
  }

  // 皿内滚动声,speed 0..1
  setBowlSpeed(sp) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.bowlGain.gain.setTargetAtTime(Math.min(0.11, sp * 0.13), t, 0.08);
    this.bowlFilter.frequency.setTargetAtTime(320 + sp * 900, t, 0.1);
  }

  // ---------- 事件音 ----------
  tick(v) {
    if (!this.ctx || !this.gate2('tick', 38)) return;
    const t = this.ctx.currentTime;
    const vol = Math.min(0.09, 0.02 + v * 0.03);
    this.osc('square', 1500 + Math.random() * 1300, null, t, 0.035, vol);
    this.noise(t, 0.02, vol * 0.6, 'highpass', 5000, 0.7);
  }

  clack(v) {
    if (!this.ctx || !this.gate2('clack', 70)) return;
    const t = this.ctx.currentTime;
    this.osc('square', 2300 + Math.random() * 500, null, t, 0.03, 0.05);
    this.noise(t, 0.03, 0.05, 'bandpass', 3400, 2);
  }

  wood(v) {
    if (!this.ctx || !this.gate2('wood', 90)) return;
    const t = this.ctx.currentTime;
    this.noise(t, 0.05, Math.min(0.06, v * 0.03), 'lowpass', 500, 1);
  }

  launch() {
    // 高速连发时不逐发起振,否则几十个 osc 叠在一起既糊又吵
    if (!this.ctx || !this.gate2('launch', 46)) return;
    const t = this.ctx.currentTime;
    this.osc('sawtooth', 150, 55, t, 0.13, 0.06);
    this.noise(t, 0.09, 0.10, 'lowpass', 320, 1);
    this.osc('square', 900, null, t, 0.02, 0.04);
  }

  railout() {
    if (!this.ctx || !this.gate2('rail', 120)) return;
    const t = this.ctx.currentTime;
    this.noise(t, 0.18, 0.03, 'bandpass', 700, 2, 1600);
  }

  foul() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.osc('sine', 300, 180, t, 0.25, 0.05);
  }

  gateIn() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.osc('triangle', 1318, null, t, 0.09, 0.12);
    this.osc('triangle', 1976, null, t + 0.07, 0.35, 0.12);
    this.osc('sine', 2637, null, t + 0.15, 0.4, 0.06);
    this.noise(t + 0.05, 0.3, 0.03, 'highpass', 6000, 0.7);
  }

  rattle() {
    if (!this.ctx || !this.gate2('rattle', 200)) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++)
      this.osc('square', 1900 - i * 300, null, t + i * 0.045, 0.03, 0.045);
  }

  sinkWin(tier) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const base = [660, 784, 988][tier] || 660;
    [0, 4, 7, 12].forEach((st, i) => {
      this.osc('triangle', base * Math.pow(2, st / 12), null, t + i * 0.07, 0.5, 0.11);
    });
    this.noise(t, 0.4, 0.04, 'highpass', 5000, 0.7);
    // 深处的回响
    this.osc('sine', base / 4, base / 8, t + 0.1, 0.7, 0.08);
  }

  sinkLose() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.osc('sine', 130, 60, t, 0.4, 0.14);
    this.osc('sawtooth', 392, 370, t + 0.05, 0.3, 0.04);
    this.noise(t, 0.2, 0.05, 'lowpass', 300, 1);
  }

  splash() {
    if (!this.ctx || !this.gate2('splash', 100)) return;
    const t = this.ctx.currentTime;
    this.noise(t, 0.22, 0.05, 'lowpass', 900, 1, 250);
    this.osc('sine', 220, 90, t, 0.18, 0.035);
  }

  windTick() {
    if (!this.ctx || !this.gate2('wind', 150)) return;
    const t = this.ctx.currentTime;
    this.osc('square', 3000, null, t, 0.02, 0.025);
  }

  // 回転盤凸钉命中:金属乒声
  discHit(v) {
    if (!this.ctx || !this.gate2('disc', 90)) return;
    const t = this.ctx.currentTime;
    const vol = Math.min(0.07, 0.02 + v * 0.02);
    this.osc('triangle', 2600 + Math.random() * 700, 1800, t, 0.06, vol);
    this.noise(t, 0.03, vol * 0.5, 'bandpass', 4200, 3);
  }

  // チューリップ开合:电磁铁咔嗒 + 伺服短促
  shutterMove(open) {
    if (!this.ctx || !this.gate2('shut', 120)) return;
    const t = this.ctx.currentTime;
    this.noise(t, 0.04, 0.05, 'bandpass', open ? 2200 : 1500, 2.5);
    this.osc('square', open ? 520 : 320, open ? 700 : 220, t, 0.05, 0.035);
  }

  // 遥控ブロック:刺耳急停 + 低音闷响
  block() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.noise(t, 0.06, 0.10, 'bandpass', 1300, 4);
    this.osc('square', 240, 90, t + 0.02, 0.22, 0.09);
    this.osc('sawtooth', 1180, 1100, t, 0.14, 0.045);
  }

  // 最終皿空气喷出:嘶——的一股气
  airPuff() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.noise(t, 0.30, 0.11, 'highpass', 3600, 0.8, 7000);
    this.osc('sine', 900, 1400, t, 0.12, 0.02);
  }

  zawa() {
    if (!this.ctx || !this.gate2('zawa', 900)) return;
    const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass';
    f.frequency.setValueAtTime(900 + Math.random() * 500, t);
    f.frequency.linearRampToValueAtTime(600, t + 1.2);
    f.Q.value = 4;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    // 5Hz 颤动的耳语脉冲
    for (let i = 0; i < 6; i++) {
      g.gain.linearRampToValueAtTime(0.028, t + i * 0.2 + 0.08);
      g.gain.linearRampToValueAtTime(0.006, t + i * 0.2 + 0.2);
    }
    g.gain.linearRampToValueAtTime(0, t + 1.4);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t); s.stop(t + 1.5);
  }

  creak() {
    if (!this.ctx || !this.gate2('creak', 700)) return;
    const t = this.ctx.currentTime;
    this.osc('sawtooth', 85 + Math.random() * 30, 70, t, 0.3, 0.025);
  }

  alarm() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      this.osc('square', 880, null, t + i * 0.22, 0.1, 0.06);
      this.osc('square', 660, null, t + i * 0.22 + 0.1, 0.1, 0.06);
    }
  }

  fanfare() {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    // 冲击
    this.noise(t, 1.2, 0.18, 'highpass', 3000, 0.7);
    this.osc('sine', 50, 30, t, 1.6, 0.22);
    // 上行琶音 ×3 八度
    const seq = [523, 659, 784, 1047, 1319, 1568, 2093];
    seq.forEach((f, i) => {
      this.osc('sawtooth', f, null, t + 0.15 + i * 0.09, 0.5, 0.09);
      this.osc('square', f * 2, null, t + 0.15 + i * 0.09 + 0.03, 0.3, 0.03);
    });
    // 和弦长音
    [523, 659, 784, 1047].forEach(f => {
      this.osc('sawtooth', f, null, t + 0.85, 1.8, 0.06);
      this.osc('triangle', f * 1.005, null, t + 0.85, 1.8, 0.05);
    });
    this.noise(t + 0.85, 1.6, 0.04, 'highpass', 7000, 0.7);
  }

  coinTick(i) {
    if (!this.ctx || !this.gate2('coin', 40)) return;
    const t = this.ctx.currentTime;
    this.osc('square', 2200 + (i % 7) * 180, null, t, 0.03, 0.035);
  }

  overSting() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [440, 415, 392, 330].forEach((f, i) => {
      this.osc('sine', f, null, t + i * 0.5, 0.9, 0.08);
      this.osc('sine', f / 2, null, t + i * 0.5, 1.0, 0.06);
    });
    this.noise(t, 2.5, 0.02, 'lowpass', 200, 1);
  }

  uiBlip() {
    if (!this.ctx) return;
    this.osc('sine', 1200, null, this.ctx.currentTime, 0.05, 0.04);
  }
}
