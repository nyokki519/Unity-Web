/** Cosmetics cannot choose outcomes. Every reveal/settlement goes through the same Session. */
export class SalonRound {
  constructor(app) {
    this.app = app;
    this.epoch = 0;
    this.running = false;
    this.paused = false;
    this.wake = new Set();
  }
  setPaused(value) {
    this.paused = value;
    if (!value) {
      for (const wake of this.wake) wake();
      this.wake.clear();
    }
  }
  cancel() {
    this.epoch++;
    this.running = false;
    this.app.squeeze.cancel();
    this.app.lockSqueeze(false);
    for (const wake of this.wake) wake();
    this.wake.clear();
  }
  async wait(ms, token) {
    let left = ms;
    while (left > 0 || this.paused) {
      if (token !== this.epoch) return false;
      if (this.paused) {
        await new Promise(resolve => this.wake.add(resolve));
        continue;
      }
      const step = Math.min(40, left);
      await new Promise(r => setTimeout(r, step));
      left -= step;
    }
    return token === this.epoch;
  }
  async run() {
    if (this.running) return;
    const a = this.app,
      c = a.controller;
    const token = ++this.epoch;
    this.running = true;
    try {
      while (c.session.state.phase === 'dealing') {
        const r = c.session.state.round,
          i = r.revealed,
          item = r.plan.cards[i],
          settings = a.settings;
        if (!await this.wait(1, token)) return;
        a.addCard(item, i, true);
        a.audio.play(i >= 4 ? 'third' : 'deal');
        a.ui.roundStatus.textContent = `${item.side.toUpperCase()} · ${i>=4?'第三カード':'配札中'}`;
        if (!await this.wait(settings.reduced ? 30 : settings.speed === 'quick' ? 100 : 320, token)) return;
        const manual = settings.squeeze !== 'off' && (settings.squeeze === 'all' || i >= 3);
        if (manual) {
          a.lockSqueeze(true);
          let ok;
          try {
            const pending = a.squeeze.open({
              card: item.card,
              label: `${item.side.toUpperCase()} · ${i>=4?'第三カード':'カードの公開'}`,
              reduced: settings.reduced
            });
            a.squeezeControls();
            ok = await pending;
          } finally {
            a.lockSqueeze(false);
          }
          if (!ok || token !== this.epoch) return;
        }
        if (!await this.wait(1, token)) return;
        c.reveal();
        a.addCard(item, i, false);
        a.updateScores();
        a.audio.play('reveal', i >= 4 ? 1 : .55);
        if (!await this.wait(settings.reduced ? 10 : settings.speed === 'quick' ? 60 : 210, token)) return;
      }
      if (token !== this.epoch) return;
      if (c.session.state.phase === 'judging') {
        if (!await this.wait(a.settings.reduced ? 1 : 250, token)) return;
        c.settle();
      }
      if (c.session.state.phase === 'result') {
        a.result();
        a.success();
      }
    } catch (error) {
      if (token === this.epoch) a.fail(error, () => this.run());
    } finally {
      if (token === this.epoch) this.running = false;
    }
  }
}
