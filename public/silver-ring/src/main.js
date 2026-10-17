// Adapted with author permission reported by the user. See ../NOTICE.txt.
// ============================================================
// 「沼」THE BOG —— 主控制器
// ============================================================
import { CFG,buildLayout } from './config.js';
import {createRng} from './seed.js';
import { Sim, clearPower, randPowerRange } from './physics.js';
import { buildScene, TOUCH } from './scene.js';
import { FX } from './fx.js';
import { AudioEngine } from './audio.js';
import { UI } from './ui.js';
import {mountPresentation} from './presentation.js';

const canvas = document.getElementById('game');
const runSeed=new URLSearchParams(location.search).get('seed')||'silver-'+crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
const launchRng=createRng(runSeed+':launch');
const refs = buildScene(canvas,buildLayout(createRng(runSeed)));
const fx = new FX(refs);
const audio = new AudioEngine();
const ui = new UI();

// ---------- 状态 ----------
const S = {
  phase: 'title',
  funds: CFG.eco.start, display: CFG.eco.start,
  debt: 0, borrowed: 0,
  fired: 0, gates: 0, jacks: 0,
  charging: false, chargeT: 0, memory: 0.40,
  randPow: false, holdFire: false, lastPower: 0.40,
  auto: false, autoAcc: 0,
  tiltIn: 0, tiltKey: 0, tiltBtn: 0, sus: 0, tiltLock: 0,
  freeCam: false, muted: true, reduce:matchMedia("(prefers-reduced-motion:reduce)").matches, manualCamera:"auto", cameraPitch:50,cameraYaw:10,cameraZoom:1,banknotes:true,testUsed:false,
  jackpotLock: false, pendingJack: 0,
  timeScale: 1, slowT: 0, slowV: 1,
  acc: 0, degrade: 0,
};

// 力度刻度:突破线(低于它必成戻り玉)与随机力度区间
const P_CLEAR = clearPower();
const [RAND_LO, RAND_HI] = randPowerRange();

const QUOTES = [['ひと息ついて、もう一度。','次の一玉が、新しい流れをつくります。'],['ここまでの挑戦、おつかれさまでした。','強さを少し変えると、違う道が見えるかもしれません。']];

// ---------- 慢动作 ----------
function slowmo(v, dur) { if(S.reduce)return; S.slowV = v; S.slowT = dur; }

// ---------- 物理事件 ----------
const sim = new Sim((ev, d) => {
  switch (ev) {
    case 'pin':
      audio.tick(d.v);
      fx.pinFlash(d.idx);
      if (d.v > 1.7 && Math.random() < 0.3)
        fx.emitLocal(d.x, d.y, 0.05, 2, { col: [2.2, 1.8, 0.9], speed: 0.2, up: 0.2, life: 0.3, size: 0.014 });
      break;
    case 'clack': audio.clack(d.v); break;
    case 'wood': audio.wood(d.v); break;
    case 'disc':
      audio.discHit(d.v);
      if (d.v > 0.8 && Math.random() < 0.5)
        fx.emitLocal(d.x, d.y, 0.05, 3, { col: [2.2, 1.6, 0.6], speed: 0.25, up: 0.25, life: 0.35, size: 0.016 });
      break;
    case 'shutter': audio.shutterMove(d.open); break;
    case 'block':
      audio.block();
      fx.blockFlash();
      ui.toast('入口の割込みギミックが作動しました', 'red');
      break;
    case 'air':
      audio.airPuff();
      fx.airPuff(d.tier);
      ui.toast('送風ギミックが作動しました', 'red');
      break;
    case 'railout': audio.railout(); break;
    case 'foul':
      S.funds += CFG.eco.ballCost;
      audio.foul();
      break;
    case 'gate':
      S.gates++;
      audio.gateIn();
      fx.gateBurst();
      break;
    case 'bowlenter':
      fx.spawnZawa();
      if (d.tier === 1) { ui.big('第二皿…!', 'amber'); }
      if (d.tier === 2) { ui.big('最終皿——!!', 'red', 1800); fx.shake(0.015); }
      break;
    case 'rattle': audio.rattle(); fx.shake(0.006); break;
    case 'sink':
      fx.sinkFX(d.tier, d.win, d.x, d.y, d.z);
      if (d.win) {
        audio.sinkWin(d.tier);
        if (d.tier >= 1) slowmo(0.35, 0.6);
      } else {
        audio.sinkLose();
        if (d.tier === 2) { ui.big('あと一歩…', 'gray-big', 1600); }
      }
      break;
    case 'swamp':
      audio.splash();
      fx.splash(d.x, d.z);
      break;
    case 'jackpot': onJackpot(); break;
  }
},createRng(runSeed));

// ---------- 大当り ----------
async function onJackpot() {
  if (S.jackpotLock) { S.pendingJack++; return; }
  S.jackpotLock = true;
  S.jacks++;
  fx.jackpotOn = true;
  fx.setNeonMode('jackpot');
  fx.setCamMode('JACKPOT');
  ui.flash('#ffffff', 600);
  audio.fanfare();
  fx.jackpotBurst();
  slowmo(0.30, 0.8);
  ui.big('喫茶Unity、三段突破！', 'jackpot-big', 2400);
  await ui.jackpotShow(CFG.eco.jackpot, (t) => audio.coinTick(Math.floor(t * 90)),()=>S.phase==='paused'||document.hidden);
  S.funds += CFG.eco.jackpot;
  while (S.pendingJack > 0) {
    S.pendingJack--;
    S.jacks++;
    S.funds += CFG.eco.jackpot;
    ui.toast('続けて突破！ コイン100万枚獲得', 'gold');
    audio.fanfare();
  }
  fx.jackpotOn = false;
  S.jackpotLock = false;
  fx.setNeonMode('idle');
}

// ---------- 发射 ----------
function playable() {
  return S.phase === 'play' && !S.jackpotLock && sim.liveCount() < CFG.maxLiveBalls;
}
// 返回 false = 这一发没出去(送珠口没让开 / 珠满 / 没钱),不扣钱不计数
function fire(power) {
  if (!playable()) return false;
  if (S.funds < CFG.eco.ballCost) return false;
  const p = Math.max(0.02, Math.min(1, power));
  if (!sim.launch(p)) return false;
  S.funds -= CFG.eco.ballCost;
  S.fired++;
  S.lastPower = p;
  audio.launch();
  fx.handleKick = 1;
  return true;
}
// 一发的力度来源:随机力度模式每发重摇,否则用记忆力度(带一点手抖)
function fireOne() {
  return fire(S.randPow ? sim.randomPower() : S.memory + (launchRng() - 0.5) * 0.03);
}

const presentation=mountPresentation({previewSound:()=>{audio.sinkWin(0);ui.toast(S.muted?'音をONにすると突破音を試せます。':'突破音の試聴です。');},fire:fireOne,setPower:value=>{S.memory=value;ui.setPowerMark(value);},setCamera:value=>{S.freeCam=false;refs.controls.enabled=false;ui.setCamTag(false);S.manualCamera=value;},setAngle:(axis,delta)=>{S.freeCam=false;refs.controls.enabled=false;ui.setCamTag(false);S[axis]=Math.max(axis==='cameraPitch'?35:-70,Math.min(axis==='cameraPitch'?75:70,S[axis]+delta));}});

// ---------- 输入 ----------
function startCharge() {
  if (S.phase !== 'play' || S.freeCam) return;
  if (S.randPow) { S.holdFire = true; return; }  // 随机力度:長押し：就连发,不用蓄力
  S.charging = true; S.chargeT = 0.04;
}
function releaseCharge() {
  S.holdFire = false;
  if (!S.charging) return;
  S.charging = false;
  S.memory = S.chargeT;
  ui.setPowerMark(S.memory);
  fire(S.chargeT);
}
function panView(d) {
  if(S.manualCamera.startsWith('cradle')){S.freeCam=false;refs.controls.enabled=false;S.cameraPitch=Math.max(35,Math.min(75,S.cameraPitch+d*80));return;}
  if (S.freeCam) return;
  fx.viewOffTarget = Math.max(-0.5, Math.min(0.95, fx.viewOffTarget + d));
}
function toggleCam() {
  S.freeCam = !S.freeCam;
  refs.controls.enabled = S.freeCam;
  if (S.freeCam) refs.controls.target.copy(fx.curTgt);
  S.charging = false; S.holdFire = false; tap = null;
  ui.setCamTag(S.freeCam);
  audio.uiBlip();
  if (S.freeCam) ui.toast(`自由視点：${TOUCH ? 'ドラッグで回転・タップで' : 'ドラッグで回転・右クリックで'}単発発射`, 'gold');
}
function toggleMute() {
  S.muted = !S.muted;
  if(!S.muted)audio.resume();
  audio.setMute(S.muted);
  ui.setMuteTag(S.muted);
}
function toggleAuto() {
  S.auto = !S.auto;
  ui.setAuto(S.auto);
  audio.uiBlip();
  if (!S.auto) return;
  ui.toast(S.randPow
    ? `自動連射：ランダム威力 ${(RAND_LO * 100) | 0}–${(RAND_HI * 100) | 0}%,${(CFG.eco.autoRate).toFixed(0)}発/秒)`
    : `自動連射：威力 ${(S.memory * 100) | 0}%,${TOUCH ? '威力バー' : 'マウスホイール'}で調整)`, 'gold');
}
// 随机力度:每发力度现摇,下限压在「突破线」以上,绝不会出戻り玉
function toggleRandom() {
  S.randPow = !S.randPow;
  S.charging = false; S.holdFire = false;
  ui.setRandom(S.randPow);
  audio.uiBlip();
  ui.toast(S.randPow
    ? `ランダム威力：毎回 ${(RAND_LO * 100) | 0}–${(RAND_HI * 100) | 0}%,長押し：${TOUCH ? '画面' : 'スペース・マウス'}で連射)`
    : 'ランダム威力を切りました。長押しで狙えます', S.randPow ? 'gold' : 'gray');
}

// 指针:单指 / 鼠标 = 蓄力发射;双指 = 上下平移视角(不和蓄力打架)
const touches = new Map();
let panning = false, panLastY = 0;
const avgTouchY = () => { let s = 0; for (const y of touches.values()) s += y; return s / touches.size; };

// 自由视角下左键 / 单指被 OrbitControls 占着转镜头,发射改挂鼠标右键与「单击」
// (按下到松手 <320ms 且没拖出 12px 才算单击,拖动仍然是转镜头)。一次一发,
// 力度取随机力度或记忆力度;想连发就开 AUTO,自由视角下照样管用。
const TAP_MS = 320, TAP_PX = 12;
let tap = null;

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (e.pointerType === 'touch') {
    touches.set(e.pointerId, e.clientY);
    if (touches.size === 2) {
      S.charging = false; S.holdFire = false; tap = null;
      panning = true; panLastY = avgTouchY(); return;
    }
    if (touches.size > 2) return;
  }
  if (S.freeCam) {
    if (e.pointerType === 'touch') tap = { t: performance.now(), x: e.clientX, y: e.clientY };
    else if (e.button === 2) fireOne();
    return;
  }
  startCharge();
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'touch' || !touches.has(e.pointerId)) return;
  touches.set(e.pointerId, e.clientY);
  if (!panning) return;
  const y = avgTouchY();
  panView((panLastY - y) * 0.0026);
  panLastY = y;
});
const liftTouch = (e) => {
  if (e.pointerType !== 'touch') return;
  touches.delete(e.pointerId);
  if (touches.size === 0) panning = false;
  else if (panning) panLastY = avgTouchY();
};
addEventListener('pointerup', (e) => {
  const wasTap = tap && e.pointerType === 'touch' &&
    performance.now() - tap.t < TAP_MS &&
    Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < TAP_PX;
  tap = null;
  liftTouch(e);
  if (S.freeCam) { if (wasTap) fireOne(); return; }
  if (panning) { S.charging = false; S.holdFire = false; return; }
  releaseCharge();
});
addEventListener('pointercancel', (e) => { liftTouch(e); tap = null; S.charging = false; S.holdFire = false; });
addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch') return;   // 触屏别用手指位置做视差
  fx.mouse.x = (e.clientX / innerWidth) * 2 - 1;
  fx.mouse.y = -((e.clientY / innerHeight) * 2 - 1);
});
addEventListener('contextmenu', (e) => { if (e.target === canvas) e.preventDefault(); });

addEventListener('keydown', (e) => {
  if (e.repeat||e.target.closest?.('input,select,textarea,button,a,summary')) return;
  switch (e.code) {
    case 'Space': e.preventDefault(); startCharge(); break;
    case 'KeyA': toggleAuto(); break;
    case 'KeyR': toggleRandom(); break;
    case 'KeyC': toggleCam(); break;
    case 'KeyM': toggleMute(); break;
    case 'KeyP': e.preventDefault();pauseGame(S.phase!=='paused');break;
    case 'ArrowLeft': e.preventDefault(); S.tiltKey = -1; break;
    case 'ArrowRight': e.preventDefault(); S.tiltKey = 1; break;
  }
});
// ↑↓ 视角上下平移(长按连续,锁定视角时生效)
addEventListener('keydown', (e) => {
  if(e.target.closest?.('input,select,textarea,button,a,summary'))return;
  if (e.code !== 'ArrowUp' && e.code !== 'ArrowDown') return;
  e.preventDefault();
  panView(e.code === 'ArrowUp' ? 0.09 : -0.09);
});
addEventListener('keyup', (e) => {
  if (e.code === 'Space') releaseCharge();
  if (e.code === 'ArrowLeft' && S.tiltKey < 0) S.tiltKey = 0;
  if (e.code === 'ArrowRight' && S.tiltKey > 0) S.tiltKey = 0;
});
addEventListener('wheel', (e) => {
  if (S.phase !== 'play' || S.freeCam) return;
  S.memory = Math.max(0.02, Math.min(1, S.memory - Math.sign(e.deltaY) * 0.02));
  ui.setPowerMark(S.memory);
}, { passive: true });
addEventListener('blur', () => { S.charging = false; S.holdFire = false; S.tiltKey = 0; S.tiltBtn = 0; panHold=0; });

ui.el.autoLamp.addEventListener('click', toggleAuto);
ui.el.randLamp.addEventListener('click', toggleRandom);

// ---------- 六轴传感器:左右晃手机 = 偷偷倾斜机台 ----------
const gyro = { on: false, base: null, val: 0, seen: false };
const HAS_ORIENT = typeof DeviceOrientationEvent !== 'undefined';

function onOrient(e) {
  if (e.gamma == null && e.beta == null) return;
  // 屏幕转 90° 后左右倾斜落在 beta 上,按屏幕方向换轴
  const a = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
  const raw = a === 90 ? -(e.beta || 0) : (a === 270 || a === -90) ? (e.beta || 0) : (e.gamma || 0);
  gyro.seen = true;
  if (gyro.base === null) gyro.base = raw;      // 开启时的持机姿势为零点
  const d = raw - gyro.base;
  const s = Math.sign(d) * Math.max(0, Math.abs(d) - 3.5) / 16;   // 死区 3.5°,±19.5° 打满
  gyro.val = Math.max(-1, Math.min(1, s));
}
function disableGyro(msg) {
  gyro.on = false; gyro.val = 0;
  removeEventListener('deviceorientation', onOrient);
  ui.setGyro(false);
  if (msg) ui.toast(msg + '。左右ボタンを使ってください', 'gray');
}
async function enableGyro() {
  if (!HAS_ORIENT) { ui.toast('この端末では体感センサーを利用できません。左右ボタンを使ってください', 'gray'); return; }
  try {
    const req = DeviceOrientationEvent.requestPermission;   // iOS 13+ 必须在手势里问
    if (typeof req === 'function' && await req.call(DeviceOrientationEvent) !== 'granted') {
      ui.toast('体感操作が許可されていません。左右ボタンを使ってください', 'gray'); return;
    }
  } catch (err) { ui.toast('体感操作が許可されませんでした。左右ボタンを使ってください', 'gray'); return; }
  gyro.base = null; gyro.val = 0; gyro.seen = false; gyro.on = true;
  addEventListener('deviceorientation', onOrient);
  ui.setGyro(true);
  audio.uiBlip();
  ui.toast('体感操作を入れました。端末を傾けて操作できます', 'gold');
  setTimeout(() => { if (gyro.on && !gyro.seen) disableGyro('センサーの応答がありません。HTTPS接続を確認してください'); }, 1800);
}

// ---------- 屏幕按钮 ----------
function holdBtn(el, on, off) {
  if (!el) return;
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
    on();
  });
  for (const t of ['pointerup', 'pointercancel', 'pointerleave','blur']) el.addEventListener(t, off);
  el.addEventListener('keydown',e=>{if(['Space','Enter'].includes(e.code)){e.preventDefault();on();}});
  el.addEventListener('keyup',e=>{if(['Space','Enter'].includes(e.code)){e.preventDefault();off();}});
}
let panHold = 0;
holdBtn(ui.el.mLeft, () => { S.tiltBtn = -1; }, () => { S.tiltBtn = 0; });
holdBtn(ui.el.mRight, () => { S.tiltBtn = 1; }, () => { S.tiltBtn = 0; });
holdBtn(ui.el.mUp, () => { panHold = 1; }, () => { panHold = 0; });
holdBtn(ui.el.mDown, () => { panHold = -1; }, () => { panHold = 0; });
ui.el.mAuto.addEventListener('click', toggleAuto);
ui.el.mRand.addEventListener('click', toggleRandom);
ui.el.mCam.addEventListener('click', toggleCam);
ui.el.mMute.addEventListener('click', toggleMute);
ui.el.mTilt.addEventListener('click', () => { if (gyro.on) disableGyro(); else enableGyro(); });

// 力度条:直接拖(替代マウスホイール)
{
  const wrap = ui.el.powerWrap, track = document.getElementById('powerTrack');
  let dragging = false;
  const setFrom = (clientY) => {
    const r = track.getBoundingClientRect();
    S.memory = Math.max(0.02, Math.min(1, 1 - (clientY - r.top) / r.height));
    ui.setPowerMark(S.memory);
  };
  wrap.addEventListener('pointerdown', (e) => {
    e.preventDefault(); dragging = true;
    if (wrap.setPointerCapture) wrap.setPointerCapture(e.pointerId);
    setFrom(e.clientY);
  });
  wrap.addEventListener('pointermove', (e) => { if (dragging) setFrom(e.clientY); });
  for (const t of ['pointerup', 'pointercancel']) wrap.addEventListener(t, () => { dragging = false; });
}

// ---------- 触屏环境 ----------
if (TOUCH) {
  ui.setTouch(true);
  CFG.maxLiveBalls = 30;
  const orient = () => ui.setLandscape(innerWidth > innerHeight * 1.15);
  orient();
  addEventListener('resize', orient);
  addEventListener('orientationchange', () => { gyro.base = null; setTimeout(orient, 320); });
  for (const t of ['gesturestart', 'gesturechange', 'gestureend'])
    addEventListener(t, (e) => e.preventDefault(), { passive: false });   // 掐掉 iOS 捏合缩放
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
}

// 全屏 + 常亮(手机上开局时尽力而为,失败就算了)
let wakeLock = null;
async function goImmersive() {
  if (!TOUCH) return;
  try {
    if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen');
  } catch (e) { /* 无视 */ }
}
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || !TOUCH || !navigator.wakeLock) return;
  try { wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { /* 无视 */ }
});

// ---------- 破产 / 借款 ----------
function checkGameOver() {
  if (S.phase !== 'play' || S.jackpotLock) return;
  if (S.funds >= CFG.eco.ballCost || sim.liveCount() > 0) return;
  S.phase = 'over';
  S.auto = false; ui.setAuto(false);
  audio.overSting();
  const q = QUOTES[(Math.random() * QUOTES.length) | 0];
  ui.showOver(q[0], q[1], S.debt,
    () => { // 重开
      S.funds = CFG.eco.start; S.debt = 0; S.borrowed = 0;
      S.fired = 0; S.gates = 0; S.jacks = 0;
      sim.balls.length = 0;
      S.phase = 'play';
      ui.toast('新しい挑戦を始めます', 'gold');
    },
    () => { // 帝愛借款
      S.funds += CFG.eco.borrow;
      S.borrowed += CFG.eco.borrow;
      S.debt += CFG.eco.borrow * 1.1;
      S.phase = 'play';
      ui.toast('練習コイン10万枚を補充しました', 'red');
      audio.uiBlip();
    });
}

// ---------- 主循环 ----------
let last = performance.now();
let statT = 0, goT = 0, fpsT = 0, fpsN = 0;

function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if(S.phase==='paused'||document.hidden)return;

  // 掉帧自动降档(弱机 / 手机)
  fpsT += dt; fpsN++;
  if (fpsT > 4) {
    const fps = fpsN / fpsT; fpsT = 0; fpsN = 0;
    if (!S.qualityLocked && fps < 34 && S.degrade < 2 && S.phase === 'play') {
      S.degrade++;
      refs.setQuality(refs.quality() - 1);
    }
  }

  // 慢动作管理
  if (S.slowT > 0) { S.slowT -= dt; if (S.slowT <= 0) S.slowV = 1; }
  const tension = S.jackpotLock ? 3 : sim.tensionLevel();
  const base = tension >= 3 && !S.jackpotLock ? 0.82 : 1;
  S.timeScale = Math.min(base, S.slowV);
  const sdt = dt * S.timeScale;

  // 蓄力(随机力度模式不蓄力:力度条停在上一发摇到的位置)
  if (S.charging) {
    S.chargeT = Math.min(1, S.chargeT + dt / 1.15);
    ui.setPower(S.chargeT, true);
    fx.handleCharge = S.chargeT;
  } else if (S.randPow) {
    ui.setPower(S.lastPower, S.holdFire || S.auto);
    fx.handleCharge = S.lastPower;
  } else {
    ui.setPower(S.memory, false);
    fx.handleCharge = S.auto ? S.memory : 0;
  }

  // 连发:AUTO,或随机力度模式下長押し：不放。间隔 1/autoRate,硬下限由 Sim 把关
  // (送珠口净空 + rail.minGap);掉帧时补一发,不白吃玩家的按键。
  const gap = 1 / CFG.eco.autoRate;
  if ((S.auto || S.holdFire) && playable() && S.funds >= CFG.eco.ballCost) {
    S.autoAcc = Math.min(S.autoAcc + dt, gap * 2);   // 最多补一发,别攒成爆发
    let n = 0;
    while (S.autoAcc >= gap && n < 4) {
      if (!fireOne()) break;      // 送珠口还占着 → 攒着,下一帧再送
      S.autoAcc -= gap; n++;
    }
  } else {
    S.autoAcc = gap;              // 松手待发:下次按下第一发立刻出
  }

  // 视角按钮长按
  if (panHold) panView(panHold * dt * 0.85);

  // 倾斜作弊 & 店员注意度(键盘 > 屏幕按钮 > 体感,后者是连续量)
  S.tiltIn = S.tiltKey || S.tiltBtn || (gyro.on ? gyro.val : 0);
  const tiltAbs = Math.abs(S.tiltIn);
  if (S.tiltLock > 0) {
    S.tiltLock -= dt;
    sim.tilt = 0; fx.tiltTarget = 0;
    if (S.tiltLock <= 0) { S.sus = 0.55; ui.toast('傾き操作を再開できます', 'gray'); }
  } else {
    if (tiltAbs > 0.06 && S.phase === 'play') {
      S.sus = Math.min(1, S.sus + CFG.tilt.susRise * dt * tiltAbs);
      audio.creak();
      if (S.sus >= 1) {
        S.tiltLock = CFG.tilt.lockTime;
        ui.toast('警戒度が上限です。傾き操作を一時休止します', 'red');
        audio.alarm();
        fx.shake(0.02);
      }
    } else {
      S.sus = Math.max(0, S.sus - CFG.tilt.susFall * dt);
    }
    sim.tilt = S.tiltIn;
    fx.tiltTarget = S.tiltIn;
  }
  ui.setSus(S.sus, S.tiltLock > 0);

  // 物理步进
  S.acc += sdt;
  const PDT = CFG.phys.dt;
  let steps = 0;
  while (S.acc >= PDT && steps < 40) { sim.step(PDT); S.acc -= PDT; steps++; }

  // 珠子 → 实例
  const im = refs.ballsIM;
  const tmp = [0, 0, 0];
  let n = 0;
  const m4 = fx._m;
  for (const b of sim.balls) {
    if (n >= 128) break;
    sim.worldPos(b, tmp);
    m4.makeScale(1, 1, 1).setPosition(tmp[0], tmp[1], tmp[2]);
    im.setMatrixAt(n++, m4);
  }
  im.count = n;
  im.instanceMatrix.needsUpdate = true;

  // 紧张度 → 运镜 / 霓虹 / 皿转速音
  fx.activeTiers.clear();
  let maxSp = 0;
  for (const b of sim.balls) {
    if (b.mode === 'bowl') {
      fx.activeTiers.add(b.bi);
      maxSp = Math.max(maxSp, Math.hypot(b.pvx, b.pvz));
    }
  }
  audio.setBowlSpeed(Math.min(1, maxSp / 0.85));
  if (!S.jackpotLock) {
    fx.detailView=S.manualCamera.startsWith('cradle');
    fx.detailPose={pitch:S.cameraPitch,yaw:S.cameraYaw,zoom:S.cameraZoom};
    if(S.manualCamera.startsWith('cradle'))fx.setCamMode('CRUUNE',Number(S.manualCamera.at(-1))-1);
    else if(S.manualCamera==='wide'||S.reduce)fx.setCamMode('WIDE');
    else if (S.phase === 'title') fx.setCamMode('TITLE');
    else if (tension > 0) fx.setCamMode('CRUUNE', tension - 1);
    else fx.setCamMode('WIDE');
    fx.setNeonMode(!S.reduce&&tension >= 2 ? 'tension' : 'idle');
  }


  // 经济显示
  S.display += (S.funds - S.display) * Math.min(1, dt * 5);
  document.getElementById('remainingVal').textContent=Math.floor(S.funds/CFG.eco.ballCost).toLocaleString('ja-JP');
  ui.setFunds(S.display, S.funds < CFG.eco.ballCost * 40);
  presentation.update(S,sim);
  audio.setWhisper(!document.getElementById('bowlWhisper').hidden);
  statT += dt;
  if (statT > 0.25) {
    statT = 0;
    ui.setDebt(S.debt);
    ui.setStats({ fired: S.fired, gates: S.gates, jacks: S.jacks, net: S.funds - CFG.eco.start - S.borrowed });
  }

  // 破产判定(延迟 1s 缓冲)
  if (S.phase === 'play' && S.funds < CFG.eco.ballCost && sim.liveCount() === 0 && !S.jackpotLock) {
    goT += dt;
    if (goT > 1.2) { goT = 0; checkGameOver(); }
  } else goT = 0;

  if(S.reduce){fx.shakeAmp=0;fx.mouse.x=fx.mouse.y=0;}
  fx.banknotesEnabled=S.banknotes;
  fx.update(sdt, sim, { tension:S.reduce?0:tension, freeCam: S.freeCam });
  refs.maskBackground();
  refs.composer.render();
}

// ---------- 启动 ----------
ui.setPowerMark(S.memory);
ui.setPowerScale(P_CLEAR, RAND_LO, RAND_HI);
ui.setRandom(false);
ui.showStart(() => {
  CFG.shutter.blockRate=document.getElementById('ruleInterference').checked?1.8:0;
  CFG.bowls.air.chance=document.getElementById('ruleInterference').checked?.32:0;
  document.getElementById('devPanel').hidden=!(new URLSearchParams(location.search).get('debug')==='1'||document.getElementById('practiceMode').checked);
  audio.resume();
  goImmersive();
  S.phase = 'play';
  fx.setCamMode('WIDE');
  ui.toast('1球100枚。下のボタンから発射できます。', 'gold');

});

requestAnimationFrame(frame);

// ---------- 调试钩子 ----------
window.SILVER_GAME = {
  sim, fx, S, ui, audio, refs, gyro, config:CFG,seed:runSeed,touch: TOUCH,
  toBowl: (i = 0) => {if(!Number.isInteger(i)||i<0||i>2||sim.liveCount()>=CFG.maxLiveBalls)return false;S.testUsed=true;return sim.spawnInBowl(i);},
  power: { clear: P_CLEAR, rand: [RAND_LO, RAND_HI] },
  random: (on = true) => { if (S.randPow !== on) toggleRandom(); },
  fire: (p) => (p === undefined ? fireOne() : fire(p)),
  jackpot: () => onJackpot(),
  money: (n = 10000000) => { S.funds += n; },
  shutter: (open = true) => {
    sim.shutterOpen = open;
    sim.shutterT = 9;
  },
};

// Unity MIX lifecycle/settings bridge. The parent is same-origin and checked.
function publishState(){document.body.dataset.phase=S.phase;if(parent!==window)parent.postMessage({source:'silver-game',phase:S.phase,power:Math.round(S.memory*100)},location.origin);}
function pauseGame(paused=true){if(paused&&S.phase==='play'){S.phase='paused';panHold=0;audio.ctx?.suspend();S.auto=false;ui.setAuto(false);S.holdFire=false;S.charging=false;S.tiltKey=S.tiltBtn=S.tiltIn=0;sim.tilt=0;gyro.val=0;gyro.base=null;touches.clear();tap=null;}else if(!paused&&S.phase==='paused'){S.phase='play';last=performance.now();audio.resume();}document.getElementById('paused').hidden=S.phase!=='paused';presentation.update(S,sim);publishState();}
addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent||e.data?.source!=='silver-shell')return;const {type,value}=e.data;if(type==='setPaused'&&typeof value==='boolean')pauseGame(value);if(type==='pause')pauseGame(S.phase!=='paused');if(type==='suspend')pauseGame(true);if(type==='power'&&Number.isFinite(value)){S.memory=Math.max(.02,Math.min(1,value/100));ui.setPowerMark(S.memory);}
 if(type==='quality'&&['auto','high','low'].includes(value)){S.qualityLocked=value!=='auto';refs.setQuality(value==='high'?2:value==='low'?0:TOUCH?1:2);}
 if(type==='camera'&&['auto','wide','cradle1','cradle2','cradle3'].includes(value)){S.manualCamera=value;S.freeCam=false;refs.controls.enabled=false;ui.setCamTag(false);}if(type==='banknotes'){S.banknotes=!!value;refs.banknoteRain.update(0,{reduced:S.reduce,enabled:S.banknotes});}if(type==='motion'){S.reduce=!!value;document.body.classList.toggle('reduced',S.reduce);refs.banknoteRain.update(0,{reduced:S.reduce,enabled:S.banknotes});}});
document.getElementById('resumeGame').addEventListener('click',()=>pauseGame(false));
addEventListener('blur',()=>{if(parent===window)pauseGame(true);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame(true);});
setInterval(publishState,200);audio.setMute(true);ui.setMuteTag(true);document.body.classList.toggle('reduced',S.reduce);
const seedInput=document.getElementById('seedInput');seedInput.value=runSeed;document.getElementById('seedApply').onclick=()=>{const u=new URL(location.href);u.searchParams.set('seed',seedInput.value.slice(0,64)||'silver');location.replace(u);};
for(const b of document.querySelectorAll('[data-stage]'))b.onclick=()=>SILVER_GAME.toBowl(Number(b.dataset.stage));
document.getElementById('devMany').onclick=()=>{for(let i=0;i<5;i++)SILVER_GAME.toBowl(0);};
document.getElementById('devJack').onclick=()=>{S.testUsed=true;onJackpot();};
document.getElementById('devEmpty').onclick=()=>{S.testUsed=true;S.funds=0;sim.balls.length=0;checkGameOver();};
