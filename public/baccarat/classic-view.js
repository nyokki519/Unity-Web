import {
  ClassicController
} from './classic-controller.js';
import {
  DENOMS,
  CHIP_POINTS,
  FONT,
  LIMITS
} from './classic-config.js';
import {
  points,
  totalBet
} from './rules.js';
import {
  playClassicRound
} from './classic-round.js';
import {
  ClassicDialogs
} from './classic-dialogs.js';

const display = n => (n / 100).toLocaleString('en-US', {
  useGrouping: false,
  maximumFractionDigits: 2
});
const targets = {
  player: [15, 268],
  banker: [425, 268],
  tie: [220, 351]
};
export class ClassicView {
  constructor(manifest, storage) {
    this.manifest = manifest;
    this.controller = new ClassicController({
      storage
    });
    this.buttons = new Map();
    this.cards = [];
    this.coins = [];
    this.roundEpoch = 0;
    this.reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;
    this.preferences = {
      volume: 30,
      se: true,
      jingle: true
    };
    try {
      Object.assign(this.preferences, JSON.parse(storage?.getItem('unity-baccarat-classic-options') || '{}'));
    } catch {}
    this.preferences.volume = Math.max(0, Math.min(100, Number(this.preferences.volume) || 0));
    this.storage = storage;
    this.game = new Phaser.Game(640, 960, Phaser.AUTO, 'classic-renderer', {
      preload: () => this.preload(),
      create: () => this.create()
    }, false, true);
  }
  preload() {
    const g = this.g = this.game;
    for (const [key, a] of Object.entries(this.manifest.images)) g.load.spritesheet(key, './reference/' + a.file, a.fw, a.fh);
    for (const [key, a] of Object.entries(this.manifest.audio)) g.load.audio(key, './reference/' + a.file);
    g.load.spritesheet('unity_cards','./classic-cards.png',144,200);
    g.load.onFileError.add(key => {
      this.failed = (this.failed || []).concat(key);
    });
  }
  create() {
    const g = this.g;
    g.stage.disableVisibilityChange = false;
    g.renderer.renderSession.roundPixels = true;
    g.plugins.add(Phaser.Plugin.SaveCPU);
    g.sound.volume = this.preferences.volume / 100;
    this.sounds = {};
    for (const key of Object.keys(this.manifest.audio)) this.sounds[key] = g.add.audio(key);
    this.dialogs = new ClassicDialogs(this);
    this.title();
    this.resize = () => this.fit();
    window.addEventListener('resize', this.resize);
    this.fit();
    g.onPause.add(() => document.querySelector('#resume-game').hidden = false);
    g.onResume.add(() => document.querySelector('#resume-game').hidden = true);
    document.querySelector('#resume-game').onclick = () => {
      g.paused = false;
    };
    document.querySelector('#loading').hidden = true;
    if (this.failed?.length) {
      this.enable('start', false);
      document.querySelector('#load-error').hidden = false;
    }
    if (['memory', 'unavailable', 'corrupt', 'recovered'].includes(this.controller.status)) {
      document.querySelector('#storage-warning').hidden = false;
      document.querySelector('#storage-warning').textContent = ({
        memory: '保存を利用できません。このタブの間だけ進行します。',
        unavailable: '保存を利用できません。ブラウザの保存設定を確認してください。',
        corrupt: '保存データを読み込めませんでした。新しく始めると置き換えられます。',
        recovered: 'バックアップから進行を復元しました。'
      })[this.controller.status];
    }
    document.querySelector('#retry-settle').onclick = () => {
      document.querySelector('#settle-warning').hidden = true;
      this.retrySettlement?.();
    };
    window.CLASSIC = this;
    document.querySelector('#classic-stage').dataset.ready = 'true';
  }
  fit() {
    const width = Math.min(640, document.documentElement.clientWidth);
    this.g.scale.scaleMode = Phaser.ScaleManager.USER_SCALE;
    this.g.scale.setUserScale(width / 640, width / 640);
    this.g.scale.refresh();
  }
  clear() {
    this.roundEpoch++;
    this.g.tweens.removeAll();
    this.g.time.events.removeAll();
    this.g.world.removeAll(true);
    document.querySelector('#classic-controls').replaceChildren();
    this.buttons.clear();
    this.cards = [];
    this.coins = [];
    this.maxStacks = new Set();
    this.cardLayer = null;
    this.fields = {};
    this.points = {};
  }
  sprite(key, x, y, frame = 0) {
    return this.g.add.sprite(x, y, key, frame);
  }
  text(x, y, value, size = 14, font = "'Alfa Slab One'", right = false) {
    const n = this.g.add.text(x, y, value, {
      font: size + 'px ' + font,
      fill: '#fff'
    });
    if (right) n.anchor.set(1, 0);
    return n;
  }
  button(id, key, x, y, label, fn, {
    scale = 1,
    center = false
  } = {}) {
    const a = this.manifest.images[key],
      sprite = this.sprite(key, x, y, 1);
    sprite.scale.set(scale);
    if (center) sprite.anchor.set(.5);
    const w = a.fw * scale,
      h = a.fh * scale,
      left = x - (center ? w / 2 : 0),
      top = y - (center ? h / 2 : 0);
    const el = document.createElement('button');
    el.type = 'button';
    el.dataset.classic = id;
    el.setAttribute('aria-label', label);
    el.title = label;
    Object.assign(el.style, {
      left: left / 640 * 100 + '%',
      top: top / 960 * 100 + '%',
      width: w / 640 * 100 + '%',
      height: h / 960 * 100 + '%'
    });
    document.querySelector('#classic-controls').append(el);
    el.onpointerenter = () => {
      if (!el.disabled) sprite.frame = 2;
    };
    el.onpointerleave = () => sprite.frame = 1;
    el.onpointerdown = () => {
      if (!el.disabled) sprite.frame = 0;
    };
    el.onpointerup = () => sprite.frame = 1;
    el.onclick = () => {
      if (el.disabled) return;
      this.unlock();
      try {
        fn();
      } catch (e) {
        this.error(e);
      }
      sprite.frame = 1;
    };
    this.buttons.set(id, {
      el,
      sprite
    });
    return sprite;
  }
  enable(id, value = true) {
    const b = this.buttons.get(id);
    if (b) {
      b.el.disabled = !value;
      b.sprite.alpha = value ? 1 : .5;
    }
  }
  visible(id, value) {
    const b = this.buttons.get(id);
    if (b) {
      b.el.hidden = !value;
      b.sprite.visible = value;
    }
  }
  unlock() {
    this.g.sound.context?.resume();
  }
  sound(key) {
    if (this.preferences.se === false || ['success', 'fail'].includes(key) && this.preferences.jingle === false) return;
    this.sounds[key]?.play();
  }
  saveOptions() {
    try {
      this.storage?.setItem('unity-baccarat-classic-options', JSON.stringify(this.preferences));
    } catch {}
    this.g.sound.volume = this.preferences.volume / 100;
  }
  account() {
    const g = this.g,
      bar = g.add.graphics(210, 15);
    bar.beginFill(0, .5);
    bar.lineStyle(1, 12040119);
    bar.drawRoundedRect(0, 0, 420, 33, 10);
    this.text(219, 21, 'Lv.1', 18, FONT);
    this.text(285, 21, 'Player', 18, FONT);
    const icon = this.sprite('casinocoin', 530, 31);
    icon.anchor.set(.5);
    icon.scale.set(1.2);
    this.accountMoney = this.text(540, 19, display(this.controller.session?.state.balance ?? 5000000), 18, FONT);
  }
  title() {
    this.clear();
    this.screen = 'title';
    const image = this.sprite('title', 0, 0);
    this.g.time.events.add(3000, () => {
      const shade = {
        step: 0
      };
      const t = this.g.add.tween(shade).to({
        step: 100
      }, 2000, Phaser.Easing.Linear.None, true);
      t.onUpdateCallback(() => {
        if (image.exists) image.tint = Phaser.Color.interpolateColor(16777215, 10066329, 100, shade.step);
      });
    });
    this.button('sound', 'soundbutton', 86, 6, 'サウンド設定', () => this.dialogs.sound());
    this.button('help', 'aboutbutton', 6, 6, 'バカラについて', () => this.dialogs.about());
    this.sprite('logo', 19, 75);
    this.button('start', 'startbutton', 320, 420, 'スタート', () => this.start(), {
      center: true
    });
    const title = this.text(320, 420, 'スタート', 20, FONT);
    title.fontWeight = 'bold';
    title.fill = '#1f2c5f';
    title.anchor.set(.5, .4);
    this.button('record', 'recordbutton', 215, 560, '成績', () => this.dialogs.record());
    this.button('local', 'accountbutton', 90, 560, 'ローカル保存', () => this.dialogs.local());
    this.button('menu', 'menubutton', 475, 560, 'メニュー', () => this.dialogs.menu());
    this.button('exchange', 'exchange', 385, 600, 'カジノコイン', () => this.dialogs.local(), {
      center: true
    });
    this.account();
  }
  start() {
    this.sound('button');
    this.controller.start();
    this.board();
    const s = this.controller.session.state;
    if (s.phase === 'result') {
      this.restoreCards();
      this.showResult(false);
      this.askRepeat();
    } else if (['dealing', 'judging'].includes(s.phase)) playClassicRound(this, this.controller);
  }
  board() {
    this.clear();
    this.screen = 'game';
    this.sprite('background', 0, 0);
    this.numbers = {
      credit: this.text(154, 580, '0', 14, undefined, true),
      win: this.text(154, 653, '0', 14, undefined, true),
      player: this.text(145, 292, '0', 14, undefined, true),
      banker: this.text(559, 292, '0', 14, undefined, true),
      tie: this.text(352, 375, '0', 14, undefined, true)
    };
    this.points.player = this.text(96, 115, '0', 14, undefined, true);
    this.points.banker = this.text(608, 115, '0', 14, undefined, true);
    for (const side of ['banker', 'tie', 'player']) {
      const [x, y] = targets[side];
      this.fields[side] = this.sprite(side + 'field', x, y);
      this.fields[side].blendMode = PIXI.blendModes.SCREEN;
      this.fields[side].alpha = 0;
      const key = side + 'field',
        a = this.manifest.images[key];
      const el = document.createElement('button');
      el.type = 'button';
      el.dataset.classic = 'bet:' + side;
      el.setAttribute('aria-label', ({
        player: 'PLAYER',
        banker: 'BANKER',
        tie: 'TIE'
      })[side]);
      el.setAttribute('aria-pressed', 'false');
      Object.assign(el.style, {
        left: x / 640 * 100 + '%',
        top: y / 960 * 100 + '%',
        width: a.fw / 640 * 100 + '%',
        height: a.fh / 960 * 100 + '%'
      });
      el.onclick = () => {
        this.unlock();
        try {
          this.controller.select(side);
          this.sound('spades_bid');
          this.sync();
        } catch (e) {
          this.error(e);
        }
      };
      document.querySelector('#classic-controls').append(el);
      this.buttons.set('bet:' + side, {
        el,
        sprite: {
          set alpha(v) {},
          visible: true
        }
      });
    }
    // The source's fixed controls/account sit above its moving card group.
    this.cardLayer=this.g.add.group();
    this.button('home', 'homebutton', 5, 12, 'タイトルへ', () => this.dialogs.home());
    this.button('sound', 'soundbutton', 73, 12, 'サウンド設定', () => this.dialogs.sound());
    this.button('exchange', 'exchange_m', 171, 42, 'カジノコイン', () => this.dialogs.local(), {
      center: true
    });
    for (const [i, n] of DENOMS.entries()) {
      const [x, y] = CHIP_POINTS[i];
      this.button('chip:' + n, 'tip_' + n, x, y, n + 'チップ', () => this.bet(n));
    }
    this.button('min', 'min', 208, 632, 'Min. 選択中の賭け先を解除', () => {
      this.controller.minimum();
      this.maxStacks.delete(this.controller.selected);
      this.sound('button3');
      this.rebuildCoins();
      this.sync();
    });
    this.button('max', 'max', 208, 577, 'Max. 選択中の賭け先へ最大ベット', () => this.bet(null));
    this.button('clear', 'clear', 594, 621, '全解除', () => {
      this.controller.clear();
      this.maxStacks.clear();
      this.sound('button3');
      this.rebuildCoins();
      this.sync();
    }, {
      scale: 1.3,
      center: true
    });
    this.button('deal', 'deal', 477, 479, 'DEAL', () => this.deal());
    this.information = this.g.add.graphics(5, 700);
    this.information.beginFill(0, .5);
    this.information.lineStyle(1, 12040119);
    this.information.drawRoundedRect(0, 0, 630, 30, 2);
    this.infoText = this.text(10, 704, '', 18, FONT);
    this.information.visible = false;
    this.infoText.visible = false;
    this.account();
    this.currency();
    this.rebuildCoins();
    this.sync();
  }
  info(value, override = false) {
    if (this.infoText) {
      this.infoText.text = value;
      this.infoText.visible = override;
      this.information.visible = override;
    }
    document.querySelector('#classic-announcement').textContent = value;
  }
  error(e) {
    this.info(({
      TARGET: '賭ける対象の点円エリアをタップしてからBetチップを選択してください。',
      FUNDS: 'カジノコインが不足しています。',
      MIN: 'このセッションの最低ベット額に達していません。',
      MAX: 'ベットの上限に達しています。',
      SAVE: '保存に失敗しました。再試行してください。',
      PHASE: '配札中はベットを変更できません。'
    })[e.message] || '操作できませんでした。', true);
    if (e.message === 'SAVE' && this.screen !== 'game') {
      const warning=document.querySelector('#storage-warning');
      warning.textContent='保存に失敗しました。ブラウザの保存設定や空き容量を確認し、再試行してください。';
      warning.hidden=false;
    }
    if (e.message === 'SAVE' && this.controller.session?.state.phase === 'judging') document.querySelector('#settle-warning').hidden = false;
  }
  sync() {
    const s = this.controller.session.state,
      editing = s.phase === 'betting';
    for (const side of ['player', 'banker', 'tie']) {
      this.numbers[side].text = display((s.round?.bets || s.bets)[side] || 0);
      this.fields[side].alpha = editing && this.controller.selected === side ? 1 : 0;
      this.buttons.get('bet:' + side).el.setAttribute('aria-pressed', String(this.controller.selected === side));
      this.enable('bet:' + side, editing);
    }
    for (const n of DENOMS) this.enable('chip:' + n, editing && s.balance - totalBet(s.bets) >= 100);
    this.enable('min', editing);
    this.enable('max', editing);
    this.enable('clear', editing && totalBet(s.bets) > 0);
    this.enable('deal', editing && totalBet(s.bets) > 0 && Object.values(s.bets).every(v => v >= this.tableMin()));
    if (editing && Object.values(s.bets).some(v => v < this.tableMin())) this.info('この保存セッションは賭け先ごとに最低 ' + display(this.tableMin()) + ' チップです。チップを追加してください。', true);
    else if (editing) this.info(totalBet(s.bets) ? '「Deal」ボタンを押してカードを配ってください。' : '賭ける対象の点円エリアをタップしてからBetチップを選択してください。');
  }
  tableMin() {
    return this.controller.session.state.table === 'classic' ? 100 : ({
      lounge: 1000,
      salon: 10000,
      suite: 50000
    })[this.controller.session.state.table];
  }
  currency() {
    const value = display(this.controller.session.state.balance);
    this.numbers.credit.text = value;
    if (this.accountMoney) this.accountMoney.text = value;
  }
  bet(value) {
    const before = structuredClone(this.controller.session.state.bets);
    if (value === null) {
      const side = this.controller.selected;
      if (side && LIMITS[side] * 100 + totalBet(before) - (before[side] || 0) < this.controller.session.state.balance) this.maxStacks.add(side);
      this.controller.maximum();
    } else this.controller.chip(value);
    this.sound('button3');
    const side = this.controller.selected,
      amount = (this.controller.session.state.bets[side] || 0) - (before[side] || 0);
    if (amount > 0) this.rebuildCoins(value ? {
      side,
      value,
      x: CHIP_POINTS[DENOMS.indexOf(value)][0],
      y: CHIP_POINTS[DENOMS.indexOf(value)][1]
    } : null);
    this.sync();
  }
  rebuildCoins(flight = null) {
    for (const c of this.coins) c.destroy();
    this.coins = [];
    const s = this.controller.session.state,
      bets = s.round?.bets || s.bets;
    for (const side of ['player', 'banker', 'tie']) {
      if (this.maxStacks.has(side) && bets[side] === LIMITS[side] * 100) {
        for (let i = 0; i < (side === 'tie' ? 1 : 5); i++) {
          const c = this.sprite('tip_' + (side === 'tie' ? 5000 : 10000), (side === 'player' ? 100 : side === 'banker' ? 509 : 305), (side === 'tie' ? 454 : 364) - i * 6, 1);
          c.scale.set(.6);
          this.coins.push(c);
        }
        continue;
      }
      let rest = Math.floor((bets[side] || 0) / 100);
      for (let i = DENOMS.length - 1; i >= 0; i--) {
        const denomination = DENOMS[i],
          count = Math.min(9, Math.floor(rest / denomination));
        rest %= denomination;
        for (let n = 0; n < count; n++) {
          const x = (side === 'player' ? 45 : side === 'banker' ? 455 : 250) + (i % 4) * 35,
            y = (side === 'tie' ? 426 : 340) + (i >= 4 ? 50 : 0) - n * 6,
            c = this.sprite('tip_' + denomination, x, y, 1);
          c.scale.set(.6);
          this.coins.push(c);
          if (flight && side === flight.side && denomination === flight.value && n === count - 1 && !this.reduced) {
            c.position.set(flight.x, flight.y);
            this.g.add.tween(c).to({
              x,
              y
            }, 200, Phaser.Easing.Linear.None, true);
          }
        }
      }
    }
  }
  deal() {
    this.controller.confirm();
    playClassicRound(this, this.controller);
  }
  setBetting(value) {
    for (const id of ['deal', 'clear']) this.visible(id, value);
    for (const side of Object.keys(this.fields)) this.fields[side].alpha = 0;
    this.sync();
  }
  card(id, x, y) {
    const n = this.sprite('unity_cards', x, y, id % 52);
    this.cardLayer?.add(n);
    n.width = 86.4;
    n.height = 120;
    return n;
  }
  clearCards() {
    for (const c of this.cards) c.destroy();
    this.cards = [];
  }
  restoreCards() {
    this.clearCards();
    const counts = {
      player: 0,
      banker: 0
    };
    for (const c of this.controller.session.state.round.plan.cards) {
      this.cards.push(this.card(c.card, (c.side === 'player' ? 150 : 417) + 36 * counts[c.side]++, 120));
    }
  }
  handPoints(count) {
    const r = this.controller.session.state.round;
    for (const side of ['player', 'banker']) this.points[side].text = String(points((r?.plan.cards.slice(0, count) || []).filter(c => c.side === side).map(c => c.card)));
  }
  resetResult() {
    this.numbers.win.text = '0';
    this.cutin?.destroy();
    this.cutin = null;
  }
  showResult(sound = true) {
    const r = this.controller.session.state.round;
    this.handPoints(r.plan.cards.length);
    this.currency();
    this.numbers.win.text = display(r.receipt.returned);
    this.cutin?.destroy();
    const winner = r.plan.winner;
    this.cutin = this.sprite('cutin', winner === 'player' ? 41 : winner === 'banker' ? 310 : 172, 170, winner === 'player' ? 0 : winner === 'banker' ? 1 : 2);
    if (sound) {
      this.sound(r.receipt.net < 0 ? 'fail' : 'success');
      if (r.receipt.returned > 0) this.moneyMotion(r.receipt.returned);
    }
    this.info('');
    document.querySelector('#classic-announcement').textContent = winner + ' ' + r.plan.player + '対' + r.plan.banker + '、純損益 ' + display(r.receipt.net);
  }
  moneyMotion(amount) {
    if (!amount || this.reduced) return;
    this.deltaText?.destroy();
    const n = this.deltaText = this.text(520, 50, (amount > 0 ? '+' : '') + display(amount), 18, FONT);
    n.tint = amount < 0 ? 14812187 : 15357190;
    n.alpha = 0;
    const a = this.g.add.tween(n).to({
      x: 545,
      y: 50
    }, 200, Phaser.Easing.Quartic.Out, true);
    this.g.add.tween(n).to({
      alpha: 1
    }, 200, Phaser.Easing.Quartic.Out, true);
    a.onComplete.add(() => {
      if (!n.exists) return;
      this.g.add.tween(n).to({
        x: 570,
        y: 50
      }, 200, Phaser.Easing.Quartic.Out, true, 1200);
      this.g.add.tween(n).to({
        alpha: 0
      }, 200, Phaser.Easing.Quartic.Out, true, 1200);
    });
  }
  askRepeat() {
    if (this.screen !== 'game' || this.controller.session.state.phase !== 'result') return;
    if (this.dialogs.opened) {
      this.pendingRepeat = true;
      return;
    }
    this.pendingRepeat = false;
    this.dialogs.repeat();
  }
  repeat(yes) {
    try {
      this.controller.next(yes);
      this.roundEpoch++;
      this.g.tweens.removeAll();
      this.g.time.events.removeAll();
      if (yes) {
        this.controller.confirm();
        playClassicRound(this, this.controller);
      } else {
        this.setBetting(true);
        this.rebuildCoins();
        this.currency();
      }
    } catch(error) {
      // A failed save leaves the last committed phase authoritative.
      this.roundEpoch++;
      this.g.tweens.removeAll();
      this.g.time.events.removeAll();
      if(this.controller.session.state.phase==='result') {
        this.restoreCards();
        this.showResult(false);
        queueMicrotask(()=>this.askRepeat());
      } else if(this.controller.session.state.phase==='betting') {
        this.setBetting(true);
        this.rebuildCoins();
        this.currency();
      }
      this.error(error);
    }
  }
}

export async function bootClassic() {
  if(typeof globalThis.Phaser?.Game!=='function'||typeof globalThis.Phaser?.Plugin?.SaveCPU!=='function'||typeof globalThis.jQuery?.fn?.dialog!=='function'||typeof globalThis.jQuery?.fn?.slider!=='function')throw Error('GAME_RUNTIME');
  const response = await fetch('./reference/manifest.json');
  if (!response.ok) throw Error('ASSETS');
  const manifest = await response.json();
  await document.fonts.load('14px "Alfa Slab One"');
  let storage;
  try {
    storage = localStorage;
  } catch {}
  return new ClassicView(manifest, storage);
}
