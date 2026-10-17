// Adapted with author permission reported by the user. See ../NOTICE.txt.
// ============================================================
// 「沼」HUD / 覆盖层 —— DOM 操作集中地
// ============================================================

export const fmt = (n) => Math.round(n).toLocaleString('ja-JP')+'枚';

export class UI {
  constructor() {
    const $ = (id) => document.getElementById(id);
    this.el = {
      funds: $('fundsVal'), debtRow: $('debtRow'), debtVal: $('debtVal'),
      fired: $('statFired'), gate: $('statGate'), jack: $('statJack'), net: $('statNet'),
      powerWrap: $('powerWrap'), powerFill: $('powerFill'), powerMark: $('powerMark'),
      powerBand: $('powerBand'), powerClear: $('powerClear'),
      autoLamp: $('autoLamp'), randLamp: $('randLamp'),
      susWrap: $('susWrap'), susFill: $('susFill'),
      toasts: $('toasts'), bigText: $('bigText'), flash: $('flash'),
      jack$: $('jack'), jackAmount: $('jackAmount'),
      start: $('start'), btnStart: $('btnStart'),
      over: $('over'), overQuote: $('overQuote'), overQuoteCn: $('overQuoteCn'),
      btnRetry: $('btnRetry'), btnBorrow: $('btnBorrow'), overDebt: $('overDebt'),
      hintBar: $('hintBar'), muteTag: $('muteTag'), camTag: $('camTag'),
      // 触屏控件
      mTilt: $('mTilt'), mLeft: $('mLeft'), mRight: $('mRight'),
      mUp: $('mUp'), mDown: $('mDown'), mAuto: $('mAuto'), mRand: $('mRand'),
      mCam: $('mCam'), mMute: $('mMute'), mhint: $('mhint'),
    };
    this._lastFunds = null;
  }

  // 触屏模式:挂 body.touch,提示条几秒后淡出
  setTouch(on) {
    document.body.classList.toggle('touch', !!on);
    if (!on) return;
    setTimeout(() => { if (this.el.mhint) this.el.mhint.style.opacity = 0; }, 9000);
  }
  setLandscape(on) { document.body.classList.toggle('landscape', !!on); }
  setGyro(on) {
    document.body.classList.toggle('gyro', !!on);
    this.el.mTilt.classList.toggle('on', !!on);
  }

  setFunds(v, danger) {
    if (this._lastFunds !== null && Math.abs(v - this._lastFunds) < 1) return;
    this._lastFunds = v;
    this.el.funds.textContent = fmt(v);
    this.el.funds.classList.toggle('danger', !!danger);
  }

  setDebt(d) {
    this.el.debtRow.style.display = d > 0 ? '' : 'none';
    if (d > 0) this.el.debtVal.textContent = fmt(d);
  }

  setStats(s) {
    this.el.fired.textContent = s.fired;
    this.el.gate.textContent = `${s.gates} (${s.fired ? (s.gates / s.fired * 100).toFixed(1) : 0}%)`;
    this.el.jack.textContent = s.jacks;
    const net = s.net;
    this.el.net.textContent = (net >= 0 ? '+' : '') + fmt(net).replace('¥-', '-¥');
    this.el.net.className = net >= 0 ? 'good' : 'bad';
  }

  setPower(p, charging) {
    this.el.powerFill.style.height = (p * 100).toFixed(1) + '%';
    this.el.powerWrap.classList.toggle('charging', !!charging);
  }
  setPowerMark(p) { this.el.powerMark.style.bottom = (p * 100).toFixed(1) + '%'; }

  // 力度条上的固定刻度:突破线(低于它 = 爬不出发射轨,戻り玉)+ 随机力度区间
  setPowerScale(clearP, lo, hi) {
    this.el.powerClear.style.bottom = (clearP * 100).toFixed(1) + '%';
    this.el.powerBand.style.bottom = (lo * 100).toFixed(1) + '%';
    this.el.powerBand.style.height = ((hi - lo) * 100).toFixed(1) + '%';
  }

  setAuto(on) {
    this.el.autoLamp.classList.toggle('on', on);
    this.el.mAuto.classList.toggle('on', on);this.el.mAuto.setAttribute('aria-pressed',String(on));
    this.el.mAuto.classList.toggle('blink', on);
  }
  setRandom(on) {
    document.body.classList.toggle('randpow', !!on);
    this.el.randLamp.classList.toggle('on', !!on);
    this.el.mRand.classList.toggle('on', !!on);this.el.mRand.setAttribute('aria-pressed',String(!!on));
    this.el.mRand.classList.toggle('blink', !!on);
  }
  setMuteTag(m) {
    this.el.muteTag.textContent = m ? '🔇' : '🔊';
    this.el.mMute.textContent = m ? '🔇' : '🔊';this.el.mMute.setAttribute('aria-pressed',String(!m));
  }
  setCamTag(free) {
    this.el.camTag.style.display = free ? '' : 'none';
    this.el.mCam.classList.toggle('on', !!free);this.el.mCam.setAttribute('aria-pressed',String(!!free));
  }

  setSus(v, locked) {
    this.el.susWrap.style.display = v > 0.01 ? 'block' : 'none';
    this.el.susFill.style.width = (Math.min(1, v) * 100).toFixed(1) + '%';
    this.el.susWrap.classList.toggle('locked', !!locked);
  }

  toast(msg, cls = '') {
    this.el.toasts.textContent = msg;
    this.el.toasts.dataset.kind = cls;
  }

  big(text, cls = '', dur = 1400) {
    const b = this.el.bigText;
    b.className = 'show ' + cls;
    b.textContent = text;
    void b.offsetWidth; // 重启动画
    b.classList.add('anim');
    clearTimeout(this._bigT);
    this._bigT = setTimeout(() => { b.className = ''; }, dur);
  }

  flash(color = '#fff', dur = 300) {
    if(document.body.classList.contains('reduced'))return;
    const f = this.el.flash;
    f.style.background = color;
    f.style.transition = 'none';
    f.style.opacity = 0.9;
    void f.offsetWidth;
    f.style.transition = `opacity ${dur}ms ease-out`;
    f.style.opacity = 0;
  }

  // 大当り计数演出,返回 Promise
  jackpotShow(amount, onTick, isPaused = () => false) {
    return new Promise((res) => {
      const o = this.el.jack$;
      o.classList.add('show');
      let last = performance.now(), elapsed = 0;
      const DUR = 4600;
      const step = (now) => {
        const delta = Math.max(0, Math.min(200, now - last)); last = now;
        if (!isPaused()) {
          elapsed += delta;
          const t = Math.min(1, elapsed / DUR);
          this.el.jackAmount.textContent = fmt(amount * (1 - Math.pow(1 - t, 3)));
          if (onTick && t < 1) onTick(t);
        }
        if (elapsed < DUR + 1600) requestAnimationFrame(step);
        else { o.classList.remove('show'); res(); }
      };
      requestAnimationFrame(step);
    });
  }

  showStart(cb) {
    this.el.start.classList.add('show');
    this.el.btnStart.onclick = () => {
      this.el.start.classList.remove('show');
      cb();
    };
  }

  showOver(quoteJp, quoteCn, debt, onRetry, onBorrow) {
    this.el.over.classList.add('show');
    this.el.overQuote.textContent = quoteJp;
    this.el.overQuoteCn.textContent = quoteCn;
    this.el.overDebt.textContent = debt > 0 ? `補充コインの記録 ${fmt(debt)}` : '';
    this.el.btnRetry.onclick = () => { this.el.over.classList.remove('show'); onRetry(); };
    this.el.btnBorrow.onclick = () => { this.el.over.classList.remove('show'); onBorrow(); };
  }
}
