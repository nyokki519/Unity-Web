import {
  totalBet
} from './rules.js';
import {
  beads,
  bigRoad
} from './roads.js';
import {
  classicRecord
} from './classic-records.js';
const money = x => (x / 100).toLocaleString('ja-JP', {
  maximumFractionDigits: 2
});
export class ClassicDialogs {
  constructor(view) {
    this.v = view;
    this.opened = false;
  }
  open(title, html, buttons = {
    OK: () => {}
  }, {
    width = 300,
    modal = true,
    onClose = () => {},
    large = false
  } = {}) {
    if (this.opened) return;
    this.opened = true;
    const v = this.v,
      host = document.querySelector('#classic-dialog');
    host.innerHTML = html;
    let handled = false;
    document.querySelector('#classic-shade').hidden = modal;
    const actions = {};
    for (const [label, fn] of Object.entries(buttons)) actions[label] = function() {
      if (handled) return;
      handled = true;
      $(host).dialog('close');
      try {
        fn();
      } catch (e) {
        v.error(e);
      }
    };
    $(host).dialog({
      title,
      modal,
      width: width === 'auto' ? 'auto' : Math.min(width, innerWidth - 20),
      autoOpen: true,
      resizable: true,
      position: {
        my: 'center',
        at: 'center',
        of: window
      },
      buttons: actions,
      close: () => {
        document.querySelector('#classic-shade').hidden = true;
        this.opened = false;
        $(host).dialog('destroy');
        host.replaceChildren();
        v.sound('button3');
        onClose(handled);
        if (v.pendingRepeat) queueMicrotask(() => v.askRepeat());
      }
    });
    if (large) $(host).parent().find('.ui-dialog-buttonpane button').css({
      width: 200,
      height: 50
    });
  }
  repeat() {
    const v = this.v,
      s = v.controller.session.state;
    if (!s.round?.paid) return;
    const canRepeat = totalBet(s.lastBet) <= s.balance && s.balance >= 100;
    this.open('リベットを行いますか？', '<p>はい：直前のBet内容のままゲームが開始されます。<br>いいえ：直前のBet内容がリセットされます。</p>', {
      'はい': () => v.repeat(true),
      'いいえ': () => v.repeat(false)
    }, {
      width: 'auto',
      modal: false,
      large: true,
      onClose: handled => {
        if (!handled && v.controller.session.state.phase === 'result') v.repeat(false);
      }
    });
    $('#classic-dialog').parent().find('.ui-dialog-titlebar-close').hide();
    if (!canRepeat) $('#classic-dialog').parent().find('button').filter((i, e) => e.textContent === 'はい').button('disable');
    $('#classic-dialog').parent().find('.ui-dialog-buttonpane button:not(:disabled)').first().trigger('focus');
  }
  sound() {
    const v = this.v;
    v.sound('button3');
    this.open('サウンド設定', `<p>効果音</p><div id="classic-se"><input type="radio" id="classic-se-on" name="classic-se" value="on" ${v.preferences.se?'checked':''}><label for="classic-se-on">ON</label><input type="radio" id="classic-se-off" name="classic-se" value="off" ${!v.preferences.se?'checked':''}><label for="classic-se-off">OFF</label></div><p>勝利サウンド</p><div id="classic-jingle"><input type="radio" id="classic-jingle-on" name="classic-jingle" value="on" ${v.preferences.jingle?'checked':''}><label for="classic-jingle-on">ON</label><input type="radio" id="classic-jingle-off" name="classic-jingle" value="off" ${!v.preferences.jingle?'checked':''}><label for="classic-jingle-off">OFF</label></div><p>音量</p><div id="classic-volume"></div>`, {
      OK: () => {
        v.preferences.se = document.querySelector('#classic-se-on')?.checked ?? v.preferences.se;
      }
    }, {
      onClose: () => {
        v.saveOptions();
      }
    });
    // Persist as controls change, before the shared close callback destroys them.
    $('#classic-se input,#classic-jingle input').checkboxradio();
    $('#classic-se,#classic-jingle').controlgroup();
    $('#classic-volume').slider({
      min: 0,
      max: 100,
      value: v.preferences.volume,
      range: 'min',
      slide: (e, ui) => {
        v.preferences.volume = ui.value;
      }
    });
    $('#classic-se input').on('change', () => {
      v.preferences.se = $('#classic-se-on').prop('checked');
    });
    $('#classic-jingle input').on('change', () => {
      v.preferences.jingle = $('#classic-jingle-on').prop('checked');
    });
  }
  home() {
    const v = this.v;
    v.sound('button3');
    this.open('確認', '<p>タイトル画面に戻りますか？</p>', {
      Yes: () => {
        v.controller.session.end();
        v.title();
      },
      No: () => {}
    }, {
      width: 300
    });
  }
  about() {
    this.open('バカラについて','<p>Copyright MasunakaSoft 2017. All Rights Reserved.</p><p>Version 1.1.1.0</p>');
  }
  help() {
    this.open('バカラについて', '<p>賭け先の点円エリアを選び、Betチップを押してからDEALで配札します。</p><p>Aは1、10・J・Q・Kは0。合計の下一桁が点数です。第三カードは規則に従い自動で配ります。</p><p>PLAYERは純利益1:1、BANKERは5%控除後0.95:1、TIEは8:1。タイ時のPLAYER/BANKERは返却。WINは元本を含む受取合計です。</p><p>8デッキ。架空のチップのみ。現金・換金・チップ課金はありません。</p>', {
      OK: () => {}
    }, {
      width: 570
    });
  }
  record() {
    const s = this.v.controller.session?.state;
    let marker = null;
    try {
      marker = JSON.parse(this.v.storage?.getItem('unity-baccarat-classic-record-start') || 'null');
    } catch {}
    const r = s ? classicRecord(s, marker) : {
      rounds: 0,
      ratios: {
        player: '0.00',
        banker: '0.00',
        tie: '0.00',
        total: '0.00'
      }
    };
    const labels = {
      player: 'プレイヤー',
      banker: 'バンカー',
      tie: 'タイ',
      total: '総合'
    };
    this.open('成績', `<table class="record_table" border="1"><tr><td>プレイ回数</td><td>${r.rounds}</td></tr>${Object.entries(labels).map(([key,label])=>`<tr><td>${label}　賞金/賭け金</td><td>${r.ratios[key]}</td></tr>`).join('')}</table>${r.limited?'<p>比率の集計は保存されている直近500局です。</p>':''}`, {
      'リセット': () => this.resetRecord(),
      OK: () => {}
    }, {
      width: 600
    });
  }
  resetRecord() {
    this.open('確認', '<p>成績をリセットします。よろしいですか？</p>', {
      Yes: () => {
        const s = this.v.controller.session?.state;
        if (s) try {
          this.v.storage?.setItem('unity-baccarat-classic-record-start', JSON.stringify({
            id: s.id,
            after: s.stats.rounds
          }));
        } catch {
          this.v.info('成績を保存できませんでした。', true);
        }
        this.record();
      },
      No: () => this.record()
    });
  }
  roads() {
    const s = this.v.controller.session?.state;
    const grid = marks => `<div class="classic-road">${marks.map(m=>`<span style="left:${m.col*22}px;top:${m.row*22}px;color:${m.winner==='banker'?'#be2647':m.winner==='tie'?'#248d54':'#2879bd'}">${m.winner==='banker'?'B':m.winner==='tie'?'T':'P'}${m.ties?'·'+m.ties:''}</span>`).join('')}</div>`;
    this.open('罫線', s ? '<h3>ビーズプレート</h3>' + grid(beads(s.history.map(h => h.winner))) + '<h3>大路</h3>' + grid(bigRoad(s.history.map(h => h.winner)).cells) + '<p>過去の記録であり、次の結果を予測しません。</p>' : '<p>記録はありません。</p>', {
      OK: () => {}
    }, {
      width: 570
    });
  }
  local() {
    const v = this.v;
    this.open('カジノコイン', '<p>このゲームは登録不要の1人用です。チップはこのブラウザに保存されます。現金や外部アカウントの通貨とは交換しません。</p><p>新しく始めると50,000チップに戻り、現在のセッションを置き換えます。</p>', {
      '新規セッション': () => this.resetConfirm(),
      '閉じる': () => {}
    }, {
      width: 450
    });
  }
  resetConfirm() {
    const v = this.v;
    this.open('新規セッション', '<p>現在のセッションを終了し、新しく始めますか？</p>', {
      Yes: () => {
        v.controller.fresh();
        v.board();
      },
      No: () => {}
    }, {
      width: 400
    });
  }
  menu() {
    const v = this.v;
    this.open('メニュー', '<div class="classic-menu"><button data-menu="home">トップページ</button><button data-menu="record">成績</button><button data-menu="roads">罫線</button><button data-menu="help">遊び方</button><button data-menu="sound">サウンド設定</button><button data-menu="local">ローカル保存</button></div>', {
      OK: () => {}
    }, {
      width: 450
    });
    $('#classic-dialog [data-menu]').button().on('click', e => {
      const key = e.currentTarget.dataset.menu;
      $('#classic-dialog').dialog('close');
      if (key === 'home') location.href = '/';
      else this[key]();
    });
  }
}
