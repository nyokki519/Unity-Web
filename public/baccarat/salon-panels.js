import {
  beads,
  bigRoad
} from './roads.js';
import {
  money,
  names,
  element
} from './salon-format.js';
export class SalonPanels {
  constructor(app) {
    this.app = app;
    this.ui = app.ui;
    this.returnFocus = null;
    this.ui.panel.addEventListener('close', () => {
      app.pausePanel = false;
      app.syncPause();
      this.returnFocus?.focus({
        preventScroll: true
      });
    });
    this.ui.panel.addEventListener('cancel', () => {});
  }
  open(name) {
    const a = this.app,
      u = this.ui;
    this.returnFocus = document.activeElement;
    u.panelTitle.textContent = {
      history: 'テーブルの記録',
      settings: 'テーブル設定',
      help: 'バカラの遊び方',
      session: '新しいセッション',
      home: 'タイトルへ戻る',
      storage: '保存について'
    } [name] || 'テーブル';
    u.panelContent.replaceChildren();
    if (name === 'history') this.history(u.panelContent);
    if (name === 'settings') this.settings(u.panelContent);
    if (name === 'help') this.help(u.panelContent);
    if (name === 'home') u.panelContent.innerHTML = '<p>現在のラウンドがある場合は精算してから、タイトルへ戻ります。</p><button class="salon-primary" data-action="leave-table">保存してタイトルへ</button>';
    if (name === 'session') u.panelContent.innerHTML = '<p>新しく50,000チップで始めます。現在のセッションと履歴は置き換わります。</p><button class="salon-primary" data-action="reset-session">新しいセッションを始める</button><p class="salon-panel-note">架空チップのみ。購入・換金・現金報酬はありません。</p>';
    if (name === 'storage') u.panelContent.innerHTML = '<p>セッションはこのブラウザ内へ保存します。別の端末との同期はありません。プライベートブラウズやデータ消去で失われる場合があります。</p><p>保存に失敗した場合、直前の確定状態を保持します。再試行するか、明示的に一時プレイへ切り替えられます。</p>';
    a.pausePanel = true;
    a.syncPause();
    if (!u.panel.open) u.panel.showModal();
    u.panel.querySelector('button,input,select')?.focus();
  }
  close() {
    this.ui.panel.close();
  }
  settings(host) {
    const a = this.app,
      s = a.settings;
    host.innerHTML = `<p class="salon-panel-note">音と演出を、自分のペースへ。</p><label class="salon-setting">めくり方<select data-setting="squeeze"><option value="important">最後のカード・第三カードを手でめくる</option><option value="all">すべてのカードを手でめくる</option><option value="off">自動で公開する</option></select></label><label class="salon-setting">配札の速さ<select data-setting="speed"><option value="normal">通常</option><option value="quick">クイック</option></select></label><label class="salon-setting salon-check"><input type="checkbox" data-setting="reduced">動きを減らす</label><label class="salon-setting salon-check"><input type="checkbox" data-setting="muted">すべての音をOFF</label>${[['bgm','ラウンジBGM'],['se','カード・チップ・結果音'],['ui','操作音']].map(([key,label])=>`<label class="salon-setting">${label} <output data-volume="${key}"></output><input data-setting="${key}" type="range" min="0" max="100" step="1" value="${Math.round(s[key]*100)}"></label>`).join('')}<p class="salon-panel-note">音は操作後に再生されます。画面を離れると一時停止します。</p><p class="salon-panel-note">カード・ロゴ・コイン・音楽：Unity community。卓の背景：MasunakaSoft / トランプスタジアム（許諾済み）。描画：Three.js（MIT）。</p>`;
    for (const input of host.querySelectorAll('[data-setting]')) {
      const k = input.dataset.setting;
      if (input.type === 'checkbox') input.checked = s[k];
      else if (input.tagName === 'SELECT') input.value = s[k];
      input.addEventListener('input', () => {
        s[k] = input.type === 'checkbox' ? input.checked : input.type === 'range' ? Number(input.value) / 100 : input.value;
        a.applySettings();
        this.volume(host);
      });
    }
    this.volume(host);
  }
  volume(host) {
    for (const e of host.querySelectorAll('[data-volume]')) e.textContent = Math.round(this.app.settings[e.dataset.volume] * 100) + '%';
  }
  help(host) {
    host.innerHTML = '<ol class="salon-lessons"><li><b>賭け先を選んで、コインを押す</b><p>PLAYER / TIE / BANKERを選び、額面のコインを押すたびに、その場所へ積み上がります。賭け先を変えるだけでは金額は増えません。確定前は1つ取り消す・全解除が使えます。</p></li><li><b>好きな辺や角から、内側へめくる</b><p>上下左右と四隅から、指やマウスでゆっくりめくれます。動きを戻すと閉じ、別の辺をつかみ直すこともできます。タップ、Enter、すべてめくるでも進められます。設定から自動公開にできます。</p></li><li><b>合計の下一桁が大きい側の勝ち</b><p>A=1、2〜9は数字、10/J/Q/K=0。最初の2枚が8・9ならナチュラル。第三カードはルールで自動判断されます。</p></li></ol><div class="salon-rule-grid"><p><b>PLAYER</b>純利益 1 : 1</p><p><b>BANKER</b>純利益 0.95 : 1<br><small>5%コミッション込み</small></p><p><b>TIE</b>純利益 8 : 1</p></div><p>タイの場合、PLAYERとBANKERへの賭け金は返却します。受取合計は元本と利益を含みます。チップは1/100単位で正確に計算します。</p><details><summary>シューと第三カードのルール</summary><p>8デッキ416枚。先頭カードに応じてバーンし、残り14枚のカット位置を過ぎた次のラウンドで新しいシューへ交換します。</p><p>ナチュラル以外でPLAYERは0〜5点で引き、6〜7点で止まります。PLAYERが止まった場合BANKERは0〜5点で引きます。</p><p>PLAYERが第三カードを引いた場合BANKERは0〜2点なら引く、3点なら第三カード8以外、4点なら2〜7、5点なら4〜7、6点なら6〜7、7点は止まります。</p></details><p class="salon-panel-note">罫線は過去の結果です。次の勝敗を保証しません。登録・課金・換金・現金報酬はありません。</p><button data-action="storage" class="salon-secondary">保存について</button>';
  }
  history(host) {
    const s = this.app.controller.session?.state;
    if (!s || !s.history.length) {
      host.append(element('p', '', 'まだラウンドの記録がありません。ベットから始めましょう。'));
      return;
    }
    const stats = s.stats;
    host.innerHTML = `<div class="salon-stat-grid"><p>ラウンド数<strong>${stats.rounds}</strong></p><p>純収支<strong>${stats.net>0?'+':''}${money(stats.net)}</strong></p><p>的中ラウンド率<strong>${(stats.positive/Math.max(1,stats.rounds)*100).toFixed(1)}%</strong><small>純収支プラス局 / 全${stats.rounds}局</small></p><p>最大ドローダウン<strong>${money(stats.maxDrawdown)}</strong></p></div>`;
    const winners = s.history.map(h => h.winner),
      road = bigRoad(winners);
    for (const [label, marks] of [
        ['ビーズプレート', beads(winners)],
        ['大路', road.cells]
      ]) {
      host.append(element('h3', '', label));
      const scroll = element('div', 'salon-road-scroll'),
        grid = element('div', 'salon-road');
      grid.style.width = Math.max(264, (Math.max(0, ...marks.map(m => m.col)) + 1) * 28) + 'px';
      for (const m of marks) {
        const mark = element('span', 'salon-road-dot ' + m.winner, names[m.winner][0] + (m.ties ? '·' + m.ties : ''));
        mark.style.left = m.col * 28 + 'px';
        mark.style.top = m.row * 28 + 'px';
        grid.append(mark);
      }
      scroll.append(grid);
      host.append(scroll);
      if (label === '大路' && road.leadingTies) host.append(element('p', '', `最初のタイ ${road.leadingTies}回`));
    }
    host.append(element('p', 'salon-panel-note', '直近500局を表示します。罫線は過去の記録であり、次の結果を予測しません。'));
    const wrap = element('div', 'salon-history-scroll');
    const table = element('table', 'salon-history-table');
    table.innerHTML = '<thead><tr><th>局</th><th>結果</th><th>点数 P/B</th><th>受取</th><th>純収支</th></tr></thead>';
    const body = document.createElement('tbody');
    for (const h of [...s.history].reverse()) {
      const tr = document.createElement('tr');
      for (const v of [h.number, names[h.winner], `${h.player} / ${h.banker}`, money(h.returned), (h.net > 0 ? '+' : '') + money(h.net)]) tr.append(element('td', '', String(v)));
      body.append(tr);
    }
    table.append(body);
    wrap.append(table);
    host.append(wrap);
  }
}
