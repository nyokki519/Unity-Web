import {
  createSalonShell
} from './salon-shell.js';
import {
  SalonController,
  AREA_LIMITS
} from './salon-controller.js';
import {
  SalonRound
} from './salon-round.js';
import {
  SalonPanels
} from './salon-panels.js';
import {
  SalonAudio
} from './salon-audio.js';
import {
  createCard
} from './salon-card.js';
import {
  SqueezeView
} from './salon-squeeze.js';
import {
  chipArt
} from './salon-art.js';
import {
  points,
  totalBet
} from './rules.js';
import {
  TABLES
} from './session.js';
import {
  money,
  names,
  errors,
  element
} from './salon-format.js';
const SETTINGS = 'unity-baccarat-salon-settings-v1';
const defaults = {
  speed: 'normal',
  squeeze: 'important',
  reduced: false,
  muted: false,
  bgm: .12,
  se: .35,
  ui: .25
};

function preferences(storage) {
  let p = {};
  try {
    p = JSON.parse(storage?.getItem(SETTINGS) || '{}') || {};
  } catch {}
  const s = {
    ...defaults
  };
  for (const k of ['bgm', 'se', 'ui'])
    if (Number.isFinite(p[k]) && p[k] >= 0 && p[k] <= 1) s[k] = p[k];
  for (const k of ['reduced', 'muted'])
    if (typeof p[k] === 'boolean') s[k] = p[k];
  if (['all', 'important', 'off'].includes(p.squeeze)) s.squeeze = p.squeeze;
  if (['normal', 'quick'].includes(p.speed)) s.speed = p.speed;
  return s;
}
export function bootSalon() {
  const root = document.querySelector('#salon-root');
  const ui = createSalonShell(root);
  let storage = null;
  try {
    storage = localStorage;
    storage.getItem(SETTINGS);
  } catch {}
  const controller = new SalonController({
    storage
  });
  const settings = preferences(storage);
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) settings.reduced = true;
  const app = {
    ui,
    controller,
    settings,
    ready: false,
    storage,
    shownRound: null,
    pausePanel: false,
    pauseUser: false,
    lastFocus: null,
    retry: null
  };
  app.audio = new SalonAudio(settings);
  app.squeeze = new SqueezeView(ui.squeeze, {
    onSound: () => app.audio.play('lift'),
    onProgress: p => {
      if (p > .03) app.audio.play('lift', .35);
    }
  });
  ui.squeeze.setAttribute('role', 'dialog');
  ui.squeeze.setAttribute('aria-modal', 'true');
  ui.squeeze.setAttribute('aria-label', 'カードを手でめくる');
  ui.squeeze.remove();
  root.querySelector('.salon-app').append(ui.squeeze);
  app.round = new SalonRound(app);
  app.panels = new SalonPanels(app);
  window.SALON = app;
  const notice = element('div', 'salon-notice');
  notice.id = 'salon-notice';
  notice.hidden = true;
  notice.setAttribute('role', 'status');
  root.prepend(notice);
  const pause = element('div', 'salon-pause');
  pause.hidden = true;
  pause.innerHTML = '<span>画面を離れたため一時停止しています。</span><button class="salon-secondary" data-action="resume-play">再開する</button>';
  root.querySelector('.salon-game').prepend(pause);
  app.message = (text) => {
    ui.message.textContent = text;
  };
  app.fail = (error, retry) => {
    app.retry = retry;
    const text = errors[error.message] || '操作を完了できませんでした。もう一度お試しください。';
    ui.message.textContent = text;
    notice.textContent = text;
    notice.hidden = false;
    const hosts = [ui.message, notice];
    if (ui.panel.open) {
      let panelError = ui.panelContent.querySelector('[data-panel-error]');
      if (!panelError) {
        panelError = element('div', 'salon-notice');
        panelError.dataset.panelError = 'true';
        panelError.setAttribute('role', 'alert');
        ui.panelContent.prepend(panelError);
      }
      panelError.textContent = text;
      hosts.push(panelError);
    }
    for (const host of hosts) {
      if (retry) {
        const b = element('button', 'salon-retry', '再試行');
        b.dataset.action = 'retry';
        host.append(b);
      }
      if (error.message === 'SAVE') {
        const b = element('button', 'salon-retry', '保存せず一時プレイ');
        b.dataset.action = 'temporary';
        host.append(b);
      }
    }
    app.render(false);
  };
  app.success = () => {
    ui.panelContent.querySelector('[data-panel-error]')?.remove();
    app.retry = null;
    notice.hidden = controller.status !== 'memory';
    notice.replaceChildren();
    if (controller.status === 'memory') {
      notice.textContent = 'このブラウザでは保存できません。一時プレイ中です。画面を閉じると進行が失われます。';
      notice.hidden = false;
    }
  };
  app.lockSqueeze = locked => {
    if (locked) {
      app.lastFocus = document.activeElement;
      ui.game.inert = true;
      ui.title.inert = true;
      ui.query('[data-action=skip]').hidden = true;
    } else {
      ui.game.inert = false;
      ui.title.inert = false;
      ui.query('[data-action=skip]').hidden = !['dealing', 'judging'].includes(controller.session?.state.phase);
      if (app.lastFocus?.isConnected && !ui.game.hidden) app.lastFocus.focus({
        preventScroll: true
      });
      app.lastFocus = null;
    }
  };
  app.squeezeControls = () => {
    const row = element('div', 'salon-squeeze-tools');
    for (const [action, label] of [
        ['settings', '設定'],
        ['history', '履歴'],
        ['skip', 'すべてめくる']
      ]) {
      const b = element('button', 'salon-secondary', label);
      b.dataset.action = action;
      row.append(b);
    }
    ui.squeeze.querySelector('.salon-squeeze__panel')?.append(row);
  };
  app.syncPause = () => {
    const value = app.pauseUser || app.pausePanel || document.hidden;
    app.round.setPaused(value);
    pause.hidden = !app.pauseUser;
    if (value) app.audio.pause();
    else app.audio.resume();
  };
  app.applySettings = () => {
    app.audio.set(settings);
    root.classList.toggle('salon-reduced', settings.reduced);
    try {
      if (storage) storage.setItem(SETTINGS, JSON.stringify(settings));
    } catch {
      app.message('設定を保存できません。今回のプレイ中は反映されます。');
    }
  };
  app.updateScores = () => {
    const s = controller.session?.state;
    if (!s) return;
    for (const side of ['player', 'banker']) {
      const cards = s.round?.plan.cards.slice(0, s.round.revealed).filter(c => c.side === side).map(c => c.card) || [];
      root.querySelector(`[data-score=${side}]`).textContent = cards.length ? points(cards) : '—';
    }
  };
  app.addCard = (item, index, hidden = false) => {
    const host = root.querySelector(`.salon-hand[data-side=${item.side}] .salon-cards`);
    let previous = root.querySelector(`[data-card-index="${index}"]`);
    const card = createCard(item.card, {
      hidden
    });
    card.dataset.cardIndex = index;
    card.classList.add(hidden ? 'salon-card-arrive' : 'salon-card-open');
    if (previous) previous.replaceWith(card);
    else host.append(card);
  };
  app.restoreCards = () => {
    root.querySelectorAll('.salon-cards').forEach(h => h.replaceChildren());
    const s = controller.session?.state;
    if (s?.round)
      for (let i = 0; i < s.round.revealed; i++) app.addCard(s.round.plan.cards[i], i);
    app.updateScores();
  };
  app.preview = () => {
    const host = root.querySelector('#salon-history-preview'),
      s = controller.session?.state;
    if (!s?.history.length) return;
    host.replaceChildren();
    const summary = element('div', 'salon-preview-stats');
    for (const [caption, value] of [
        ['ラウンド', s.stats.rounds],
        ['純収支', (s.stats.net > 0 ? '+' : '') + money(s.stats.net)]
      ]) {
      const d = element('div');
      d.append(element('span', '', caption), element('strong', '', String(value)));
      summary.append(d);
    }
    host.append(summary);
    const dots = element('div', 'salon-preview-dots');
    for (const h of s.history.slice(-30)) {
      const d = element('span', 'salon-road-dot ' + h.winner, names[h.winner][0]);
      d.title = `第${h.number}局 ${names[h.winner]} ${h.player}対${h.banker}`;
      dots.append(d);
    }
    host.append(dots, element('p', 'salon-panel-note', '直近30局 · P:PLAYER / B:BANKER / T:TIE'));
  };
  app.render = (message = true) => {
    const s = controller.session?.state;
    if (!s) {
      ui.query('[data-action=resume]').hidden = true;
      ui.query('[data-action=start]').hidden = false;
      ui.query('[data-action=new-session]').hidden = true;
      return;
    }
    ui.query('[data-action=resume]').hidden = false;
    ui.query('[data-action=start]').hidden = true;
    ui.query('[data-action=new-session]').hidden = false;
    const betting = s.phase === 'betting',
      stake = betting ? totalBet(s.bets) : s.round ? totalBet(s.round.bets) : 0;
    for (const [key, value] of Object.entries({
        balance: s.balance,
        stake,
        available: betting ? s.balance - stake : s.balance
      })) root.querySelector(`[data-money=${key}]`).textContent = money(value);
    for (const e of root.querySelectorAll('[data-action^="chip:"]')) {
      e.setAttribute('aria-pressed', String(Number(e.dataset.action.split(':')[1]) === controller.chip));
      e.disabled = !betting || Number(e.dataset.action.split(':')[1]) * 100 < TABLES[s.table].min;
    }
    for (const side of ['player', 'tie', 'banker']) {
      root.querySelector(`[data-bet=${side}]`).textContent = money((betting ? s.bets : s.round?.bets || {})[side] || 0);
      const e = root.querySelector(`[data-action="bet:${side}"]`);
      e.disabled = !betting;
      e.classList.toggle('is-selected', betting && controller.selected === side);
      e.setAttribute('aria-label', `${names[side]}へ${controller.chip}チップを置く。現在${money(s.bets[side]||0)}チップ`);
    }
    for (const action of ['undo', 'clear', 'repeat', 'maximum', 'confirm']) {
      const e = root.querySelector(`[data-action=${action}]`);
      e.disabled = !betting || action === 'undo' && !s.undo.length || action === 'clear' && !totalBet(s.bets) || action === 'repeat' && !totalBet(s.lastBet) || action === 'maximum' && !controller.selected || action === 'confirm' && !totalBet(s.bets);
      if (e.disabled) e.title = !betting ? 'ラウンド終了後に操作できます' : action === 'repeat' ? '前回のベットがまだありません' : action === 'maximum' ? '先に賭け先へチップを置いてください' : 'チップを賭け先へ置いてください';
      else e.removeAttribute('title');
    }
    ui.query('[data-action=confirm]').hidden = !betting;
    root.querySelector('.salon-chip-tray').hidden = !betting;
    root.querySelector('.salon-bet-tools').hidden = !betting;
    root.querySelector('.salon-chip-heading').hidden = !betting;
    ui.query('[data-action=skip]').hidden = !['dealing', 'judging'].includes(s.phase);
    ui.receipt.hidden = s.phase !== 'result';
    ui.status.textContent = betting ? 'ベット受付中' : s.phase === 'result' ? 'ラウンド終了' : 'カードを公開中';
    ui.shoe.textContent = `シュー ${s.shoe.serial} · 残り ${416-s.shoe.cursor}枚`;
    if (message && betting) app.message(`${controller.chip.toLocaleString()}チップを選択中 · 賭け先をタップして配置${TABLES[s.table].min>100?' · 最低'+money(TABLES[s.table].min)+'チップ':''}`);
    if (betting) {
      ui.roundStatus.textContent = 'チップを置いて、勝負を始めましょう。';
      root.querySelector('.salon-felt').removeAttribute('data-winner');
    }
    app.preview();
  };
  app.payout = (round) => {
    if (settings.reduced || round.receipt.net <= 0) return;
    const source = root.querySelector(`[data-action="bet:${round.plan.winner}"]`).getBoundingClientRect(),
      target = root.querySelector('[data-money=balance]').getBoundingClientRect();
    for (let i = 0; i < Math.min(8, 2 + Math.ceil(Math.log10(round.receipt.returned + 1))); i++) {
      const img = document.createElement('img');
      img.src = chipArt(round.receipt.returned >= 100000 ? 1000 : 100);
      img.className = 'salon-payout-fly';
      img.alt = '';
      img.style.left = source.x + source.width / 2 + 'px';
      img.style.top = source.y + 'px';
      img.style.setProperty('--fly-x', target.x + target.width / 2 - source.x - source.width / 2 + 'px');
      img.style.setProperty('--fly-y', target.y - source.y + 'px');
      img.style.animationDelay = i * 65 + 'ms';
      document.body.append(img);
      setTimeout(() => img.remove(), 1400);
    }
  };
  app.result = (sound = true) => {
    const s = controller.session.state,
      r = s.round;
    if (!r?.paid) return;
    app.restoreCards();
    const p = r.receipt,
      principal = p.lines.reduce((n, l) => n + l.principal, 0),
      profit = p.lines.reduce((n, l) => n + l.profit, 0);
    ui.receiptContent.innerHTML = `<p class="salon-eyebrow">ROUND ${s.sequence} · ${names[r.plan.winner]} ${r.plan.winner==='tie'?'引き分け':'勝利'}</p><h2 class="salon-result-title">${p.net>0?'あなたの勝利':p.net===0?'ベットを返却しました':'このラウンドは終了です'}</h2><div class="salon-receipt-grid"><div><span>元本の返却</span><strong>${money(principal)}</strong></div><div><span>配当利益</span><strong>${money(profit)}</strong></div><div><span>受取合計</span><strong>${money(p.returned)}</strong></div><div><span>純収支</span><strong>${p.net>0?'+':''}${money(p.net)}</strong></div></div><p class="salon-panel-note">${r.plan.player} 対 ${r.plan.banker} · ベット ${money(p.stake)} · BANKER利益は5%控除済み</p>`;
    ui.receipt.dataset.result = p.net > 0 ? 'win' : p.net < 0 ? 'loss' : 'push';
    root.querySelector('.salon-felt').dataset.winner = r.plan.winner;
    ui.roundStatus.textContent = `${names[r.plan.winner]} ${r.plan.winner==='tie'?'引き分け':'勝利'} · ${r.plan.player} 対 ${r.plan.banker}`;
    app.render(false);
    app.message('結果を確認したら、同じベットで配札するか、ベットを変更できます。');
    const rebet = ui.query('[data-action=rebet]');
    rebet.disabled = totalBet(s.lastBet) > s.balance;
    rebet.title = rebet.disabled ? '残高が足りません。ベットを変更してください。' : `同じ賭け先へ合計${money(totalBet(s.lastBet))}チップで配札`;
    if (sound && app.shownRound !== r.id) {
      app.shownRound = r.id;
      app.audio.play(p.net > 0 ? 'win' : p.net < 0 ? 'loss' : 'tie');
      app.payout(r);
      if (p.net > 0) setTimeout(() => {
        if (controller.session?.state.round?.id === r.id && controller.session.state.phase === 'result') app.audio.play('payout');
      }, 400);
    }
  };
  app.showGame = () => {
    ui.title.hidden = true;
    ui.game.hidden = false;
    app.restoreCards();
    app.render();
    if (controller.session.state.phase === 'result') {
      app.shownRound = controller.session.state.round?.id;
      app.result(false);
    } else if (['dealing', 'judging'].includes(controller.session.state.phase)) app.round.run();
  };
  const deal = () => {
    controller.confirm();
    app.round.cancel();
    app.shownRound = null;
    app.restoreCards();
    app.render();
    app.audio.play('confirm');
    app.round.run();
  };
  const skip = () => {
    app.round.cancel();
    controller.skip();
    app.result();
  };
  const runAction = action => {
    if (action === 'retry') {
      app.retry?.();
      return;
    }
    if (action === 'temporary') {
      const retry = app.retry;
      controller.status = 'memory';
      controller.store = null;
      controller.commit = () => true;
      if (controller.session) controller.session.commit = () => true;
      app.success();
      retry?.();
      return;
    }
    let fn;
    if (action.startsWith('chip:')) fn = () => {
      controller.selectChip(Number(action.split(':')[1]));
      app.render();
      app.audio.play('click');
    };
    else if (action.startsWith('bet:')) fn = () => {
      controller.place(action.split(':')[1]);
      app.render();
      app.audio.play('chip');
    };
    else fn = {
      start: () => {
        controller.start();
        app.showGame();
      },
      resume: () => {
        controller.start();
        app.showGame();
      },
      'new-session': () => app.panels.open('session'),
      'reset-session': () => {
        controller.fresh();
        app.round.cancel();
        app.panels.close();
        app.showGame();
      },
      undo: () => {
        controller.undo();
        app.render();
        app.audio.play('undo');
      },
      clear: () => {
        controller.clear();
        app.render();
        app.audio.play('undo');
      },
      repeat: () => {
        controller.repeat();
        app.render();
        app.audio.play('chip');
      },
      maximum: () => {
        controller.maximum();
        app.render();
        app.audio.play('chip');
      },
      confirm: deal,
      skip,
      next: () => {
        controller.next();
        app.restoreCards();
        app.render();
      },
      rebet: () => {
        controller.rebet();
        app.round.cancel();
        app.shownRound = null;
        app.restoreCards();
        app.render();
        app.round.run();
      },
      history: () => app.panels.open('history'),
      settings: () => app.panels.open('settings'),
      help: () => app.panels.open('help'),
      storage: () => app.panels.open('storage'),
      home: () => app.panels.open('home'),
      'close-panel': () => app.panels.close(),
      'leave-table': () => {
        controller.session.end();
        app.round.cancel();
        app.panels.close();
        ui.game.hidden = true;
        ui.title.hidden = false;
        app.render();
      },
      'resume-play': () => {
        app.pauseUser = false;
        app.syncPause();
      }
    } [action];
    if (!fn) return;
    const perform = () => {
      try {
        fn();
        app.success();
        if (controller.status === 'memory') app.message('一時プレイ中です。この端末では保存されません。');
      } catch (error) {
        app.fail(error, perform);
      }
    };
    perform();
  };
  root.addEventListener('click', e => {
    const button = e.target.closest('[data-action]');
    if (!button || button.disabled) return;
    app.audio.unlock();
    runAction(button.dataset.action);
  });
  document.addEventListener('keydown', e => {
    if (ui.squeeze.hidden || ui.panel.open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      app.squeeze.finish();
    }
    if (e.key === 'Tab') {
      const candidates = [...ui.squeeze.querySelectorAll('button,[tabindex="0"]')];
      const at = candidates.indexOf(document.activeElement);
      e.preventDefault();
      candidates[(at + (e.shiftKey ? -1 : 1) + candidates.length) % candidates.length]?.focus();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      app.pauseUser = true;
      app.syncPause();
    } else app.syncPause();
  });
  app.applySettings();
  app.render();
  app.success();
  if (controller.status === 'recovered') {
    notice.hidden = false;
    notice.textContent = '直前のバックアップからセッションを復元しました。';
  } else if (controller.status === 'corrupt') {
    notice.hidden = false;
    notice.textContent = '保存データを読めませんでした。新しいセッションを始められます。';
  }
  if (controller.status === 'memory') app.message('このブラウザでは保存できません。一時プレイとして利用できます。');
  const community = element('a', 'salon-community-link', 'Unity MIXへ戻る');
  community.href = '/';
  root.querySelector('.salon-title-footer').append(community);
  document.querySelector('#salon-loading').hidden = true;
  app.ready = true;
  return app;
}
