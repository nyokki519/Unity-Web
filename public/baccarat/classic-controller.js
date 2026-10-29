import {
  Session,
  TABLES
} from './session.js';
import {
  totalBet
} from './rules.js';
import {
  SessionStore
} from './storage.js';
import {
  LIMITS
} from './classic-config.js';

export class ClassicController {
  constructor({
    storage = null
  } = {}) {
    this.storage = storage;
    this.store = storage ? new SessionStore(storage) : null;
    this.selected = null;
    const loaded = this.store?.load();
    this.status = loaded?.status || 'memory';
    this.commit = s => this.store ? this.store.save(s) : true;
    this.session = loaded?.state ? new Session({
      state: loaded.state,
      commit: this.commit
    }) : null;
  }
  start() {
    if (!this.session) {
      const s = new Session({
        table: 'classic',
        commit: this.commit
      });
      if (!this.commit(s.state)) throw Error('SAVE');
      this.session = s;
    }
    if (this.session.state.phase === 'ended') this.session.resume();
    return this.session;
  }
  fresh() {
    const s = new Session({
      table: 'classic',
      commit: this.commit
    });
    if (!this.commit(s.state)) throw Error('SAVE');
    this.session = s;
    this.selected = null;
  }
  select(side) {
    if (!Object.hasOwn(LIMITS, side)) throw Error('TARGET');
    this.session.editable();
    this.selected = side;
  }
  chip(value) {
    if (!this.selected) throw Error('TARGET');
    if (!Number.isSafeInteger(value) || value <= 0) throw Error('AMOUNT');
    const s = this.session.state,
      side = this.selected,
      remaining = s.balance - totalBet(s.bets),
      cap = LIMITS[side] * 100 - (s.bets[side] || 0);
    if (cap <= 0) return 0;
    if (remaining < 100) throw Error('FUNDS');
    const amount = Math.floor(Math.min(value * 100, remaining, cap, (TABLES[s.table].max - totalBet(s.bets))) / 100) * 100;
    if (amount <= 0) throw Error('MAX');
    this.session.bet(side, amount);
    return amount;
  }
  maximum() {
    if (!this.selected) throw Error('TARGET');
    return this.chip(LIMITS[this.selected]);
  }
  minimum() {
    if (!this.selected) throw Error('TARGET');
    const b = {
      ...this.session.state.bets
    };
    delete b[this.selected];
    this.session.edit(b);
  }
  clear() {
    this.session.clear();
  }
  confirm() {
    this.session.confirm();
    this.selected = null;
  }
  settle() {
    return this.session.settle();
  }
  next(repeat = false) {
    this.session.next();
    this.selected = null;
    if (repeat) this.session.repeat();
  }
}
