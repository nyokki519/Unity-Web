import {
  Session,
  TABLES
} from './session.js';
import {
  SessionStore
} from './storage.js';
import {
  totalBet
} from './rules.js';
export const CHIP_VALUES = [1, 10, 100, 500, 1000, 5000];
export const AREA_LIMITS = {
  player: 5000000,
  banker: 5000000,
  tie: 500000
};
/** UI-only adapter. The existing transactional Session owns every financial write. */
export class SalonController {
  constructor({
    storage = null
  } = {}) {
    this.storage = storage;
    this.store = storage ? new SessionStore(storage) : null;
    const loaded = this.store?.load();
    this.status = loaded?.status || 'memory';
    this.commit = s => this.store ? this.store.save(s) : true;
    this.session = loaded?.state ? new Session({
      state: loaded.state,
      commit: this.commit
    }) : null;
    this.chip = 100;
    this.selected = null;
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
    return s;
  }
  selectChip(value) {
    if (!CHIP_VALUES.includes(value)) throw Error('AMOUNT');
    this.chip = value;
  }
  place(side) {
    this.session.editable();
    if (!Object.hasOwn(AREA_LIMITS, side)) throw Error('TARGET');
    const s = this.session.state,
      amount = this.chip * 100;
    if (amount < TABLES[s.table].min) throw Error('MIN');
    if ((s.bets[side] || 0) + amount > AREA_LIMITS[side]) throw Error('MAX');
    this.session.bet(side, amount);
    this.selected = side;
  }
  maximum() {
    this.session.editable();
    if (!this.selected) throw Error('TARGET');
    const s = this.session.state,
      n = Math.floor(Math.min(s.balance - totalBet(s.bets), TABLES[s.table].max - totalBet(s.bets), AREA_LIMITS[this.selected] - (s.bets[this.selected] || 0)) / 100) * 100;
    if (n < TABLES[s.table].min) throw Error('FUNDS');
    this.session.bet(this.selected, n);
  }
  undo() {
    this.session.undo();
  }
  clear() {
    this.session.clear();
  }
  repeat() {
    const s = this.session.state;
    for (const [side, n] of Object.entries(s.lastBet))
      if (n > AREA_LIMITS[side]) throw Error('MAX');
    this.session.repeat();
  }
  confirm() {
    this.session.confirm();
  }
  reveal() {
    if (this.session.state.phase !== 'dealing') return false;
    this.session.transaction(s => {
      s.round.revealed++;
      if (s.round.revealed === s.round.plan.cards.length) s.phase = 'judging';
    });
    return true;
  }
  settle() {
    return this.session.settle();
  }
  skip() {
    return this.session.skip();
  }
  next() {
    this.session.next();
    this.selected = null;
  }
  rebet() {
    if (this.session.state.phase === 'result') this.next();
    this.repeat();
    this.confirm();
  }
}
