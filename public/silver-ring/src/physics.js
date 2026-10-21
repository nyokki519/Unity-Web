// Adapted with author permission reported by the user. See ../NOTICE.txt.
// ============================================================
// 「沼」物理核心 —— 纯 JS,无 three 依赖(可被 node 离线模拟调用)
// 珠子模式:rail(发射轨) → field(钉子盘面 2D) → script(导管/吞珠动画)
//          → bowl(三段皿螺旋) → jackpot / swamp
// 盘面机关:大回転盤×2(凸钉搅拌)/ 電動チューリップ(随机开闭+遥控ブロック)
// ============================================================
import {advanceHop,resolveBowlPair} from './bowl-contacts.js';
import {applyLipGravity,applyAirJet,applyAirBurst,advanceLipGraze,lipHeight} from './bowl-forces.js';
import { CFG, buildLayout } from './config.js';

const TAU = Math.PI * 2;

function bez(p0, p1, p2, p3, t, out) {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  out[0] = a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0];
  out[1] = a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1];
  out[2] = a * p0[2] + b * p1[2] + c * p2[2] + d * p3[2];
  return out;
}

// 碗面高度及斜率
export function bowlY(r, R) {
  const B = CFG.bowls;
  const base = B.depth * Math.pow(r / R, B.expo);
  const bump = B.bump.h * Math.exp(-(r * r) / (B.bump.w * B.bump.w));
  return base + bump;
}
// Shared shallow-edge height field used for forces, visible ball height and dish mesh.
export function bowlSurfaceY(x,z,bw,rot=0){
 let y=bowlY(Math.hypot(x,z),bw.R);
 let recess=0;
 if(CFG.bowls.contacts.enabled)for(const h of bw.holes){
  const a=h.a+rot;
  recess=Math.min(recess,lipHeight(Math.hypot(x-Math.cos(a)*bw.ringR,z-Math.sin(a)*bw.ringR),{inner:CFG.bowls.capture,outer:CFG.bowls.contacts.lipOuter,depth:CFG.bowls.contacts.lipDepth}));
 }
 return y+recess;
}
export function bowlSlope(r, R) {
  const B = CFG.bowls;
  if (r < 1e-5) return 0;
  const base = (B.depth * B.expo / Math.pow(R, B.expo)) * Math.pow(r, B.expo - 1);
  const bump = B.bump.h * (-2 * r / (B.bump.w * B.bump.w)) * Math.exp(-(r * r) / (B.bump.w * B.bump.w));
  return base + bump;
}

// 皿贯通路径(物理脚本与场景导管几何共用同一组贝塞尔控制点)
export function winFlyPts(bi) {
  const B = CFG.bowls, bw = B.list[bi];
  const wh = bw.holes.find(h => h.win);
  const hx = Math.cos(wh.a) * bw.ringR, hz = Math.sin(wh.a) * bw.ringR;
  const wy = bw.cy + bowlY(bw.ringR, bw.R) + CFG.ball.r;
  const wx = hx, wz = bw.cz + hz;
  if (bi < B.list.length - 1) {
    const nb = B.list[bi + 1], e = nb.enter, r0 = nb.R * e.rr;
    const target = [Math.cos(e.a) * r0, nb.cy + bowlY(r0, nb.R) + CFG.ball.r, nb.cz + Math.sin(e.a) * r0];
    const y0 = wy - 0.10, dy = y0 - target[1];
    // 沿入皿圆弧往回退 29°(半径不变),末段压平:先俯冲、再贴着碗面上方
    // 盘旋滑入,落地方向和落地后的滚动方向接上。0.50/0.14 是网格搜索的最优点:
    // 入皿半径只比金缘小 25mm 而球+缘管要 30mm,必须让过缘发生在内弯最深处,
    // 否则会剐缘管(旧参数 0.55/0.38 时皿3入口剐 1.1mm;audit-rail 脚本可复查)
    const a2 = e.a - e.dir * 0.50;
    const p2 = [Math.cos(a2) * r0, target[1] + dy * 0.14, nb.cz + Math.sin(a2) * r0];
    return {
      drop: [[wx, wy, wz], [wx, wy - 0.05, wz], [wx, y0, wz], [wx, y0, wz]],
      fly: [[wx, y0, wz], [wx, y0 - dy * 0.42, wz], p2, target],        // 先竖直出落口,再兜进去
      exitV: [-Math.sin(e.a) * e.dir * e.v, 0, Math.cos(e.a) * e.dir * e.v],
      next: bi + 1,
    };
  }
  const pk = CFG.pocket;
  const y0 = wy - 0.09, y1 = pk.y + 0.02, dy = y0 - y1;
  return {
    drop: [[wx, wy, wz], [wx, wy - 0.045, wz], [wx, y0, wz], [wx, y0, wz]],
    fly: [[wx, y0, wz], [wx, y0 - dy * 0.35, wz], [pk.x, y1 + dy * 0.35, pk.z], [pk.x, y1, pk.z]],
    jackpot: true,
  };
}

// 闸门→第一皿的固定導軌(同 winFlyPts:物理脚本与场景几何共用一条曲线)。
// 旧版每颗珠子按过闸位置各自现算贝塞尔,场景里画的轨道只是"示意",珠子并不沿它走;
// 现在珠子过闸后先汇到固定集球点 top,再骑着这条轨滑进皿。
export function entryFlyPts() {
  const bw = CFG.bowls.list[0], e = bw.enter, r0 = bw.R * e.rr;
  const target = [Math.cos(e.a) * r0, bw.cy + bowlY(r0, bw.R) + CFG.ball.r, bw.cz + Math.sin(e.a) * r0];
  const top = [0, CFG.gate.y - 0.052, CFG.board.ballZ];
  const dy = top[1] - target[1];
  // 第三控制点沿入皿圆弧回退(半径不变),y 压得高一点:入口段整体很平缓,
  // 压低会擦到皿的金缘(缘在 R+0.006、碗口平面上方,珠径 52mm 余量本来就只有几毫米)
  const a2 = e.a - e.dir * 0.55;
  const p2 = [Math.cos(a2) * r0, target[1] + dy * 0.55, bw.cz + Math.sin(a2) * r0];
  return {
    top,
    fly: [top, [top[0], top[1] - dy * 0.30, top[2]], p2, target],
    exitV: [-Math.sin(e.a) * e.dir * e.v, 0, Math.cos(e.a) * e.dir * e.v],
  };
}

// 「突破起始区」的最低力度:低于它,珠子爬不到 aExit 就滚回来变戻り玉。
// v0clear = 二分实测的临界初速 2.132 加余量(见 config;npm run tune 会复查戻り玉恒为 0)。
export function clearPower() {
  const R = CFG.rail;
  return (R.v0clear - R.v0min) / (R.v0max - R.v0min);
}

// 「随机力度」的实际区间:配置区间与突破线取交集,下限永远保证能进场
export function randPowerRange() {
  const [lo, hi] = CFG.rail.rand;
  const pc = clearPower();
  return [Math.max(lo, pc), Math.max(hi, pc)];
}

// 发射轨上两颗珠子相切时的角距(弦长 = 珠径)
export function railGapA() {
  return 2 * Math.asin(Math.min(1, CFG.ball.r / CFG.rail.Rmid));
}

export class Sim {
  constructor(onEvent, rand = Math.random) {
    this.emit = onEvent || (() => {});
    this.rand = rand;
    const L = buildLayout(rand);
    this.pins = L.pins; this.segs = L.segs; this.arcs = L.arcs;
    this.balls = [];
    this.railGapA = railGapA();
    this.time = 0;
    this.airBurstStart=-Infinity;
    this.launchT = -9;        // 上一发的时刻(发射间隔下限用)
    this.tilt = 0;            // -1..1(玩家偷偷倾斜)
    this.bowlAngles = CFG.bowls.list.map(() => 0);
    this.nextId = 1;
    // 钉子空间哈希
    this.grid = new Map();
    const cell = this.cell = 0.09;
    this.pins.forEach((p, i) => {
      const k = Math.floor(p.x / cell) + ',' + Math.floor(p.y / cell);
      if (!this.grid.has(k)) this.grid.set(k, []);
      this.grid.get(k).push(i);
    });
    // 回転盤
    this.discAngles = CFG.discs.map(() => 0);
    // チューリップ
    this.shutterOpen = false;
    this.shutterA = CFG.shutter.closedA;
    this.shutterT = 0.8 + this.rand();
    this.shutterSpd = CFG.shutter.speed;
    this.blockCD = 0;
    this._wings = [
      { a: [0, 0], b: [0, 0] },
      { a: [0, 0], b: [0, 0] },
    ];
    this._updateWings();
  }

  liveCount() { return this.balls.length; }

  // 随机力度(下限保证突破起始区,见 randPowerRange)
  randomPower() {
    const [lo, hi] = randPowerRange();
    return lo + this.rand() * (hi - lo);
  }

  // 送珠口让得开吗:① 上一颗还压在注入点上就塞不进去(珠径决定)
  //                ② 间隔不短于 minGap —— 轨顶的通过能力上限,超了就会堵成戻り玉。
  // 这两条是发射间隔的全部限制,上层的 autoRate 再怎么调都突破不了。
  railClear() {
    if (this.time - this.launchT < CFG.rail.minGap) return false;
    for (const b of this.balls) {
      if (b.mode === 'rail' && CFG.rail.aStart - b.a < this.railGapA) return false;
    }
    return true;
  }

  // 返回 false = 送珠口被占,这一发没打出去(调用方别扣钱)
  launch(power) {
    const R = CFG.rail;
    if (!this.railClear()) return false;
    let v0 = R.v0min + (R.v0max - R.v0min) * power + (this.rand() - 0.5) * R.jitter;
    // 力度已经过了突破线,就不许抖动把珠子抖成戻り玉(戻り玉只能是玩家自己打太轻)
    if (power >= clearPower() - 1e-9) v0 = Math.max(v0, R.v0clear);
    this.launchT = this.time;
    this.balls.push({
      id: this.nextId++, mode: 'rail',
      a: R.aStart, v: v0,
      x: 0, y: 0, vx: 0, vy: 0, dead: false,
      bowlT: 0,
    });
    return true;
  }

  // 直接把珠子丢进某段皿(调试/测试用,模拟导管落点)
  spawnInBowl(bi) {
    const bw = CFG.bowls.list[bi];
    const e = bw.enter;
    const r0 = bw.R * e.rr;
    const b = { id: this.nextId++, mode: 'bowl', dead: false, bowlT: 0 };
    this.enterBowl(b, bi, [Math.cos(e.a) * r0, 0, bw.cz + Math.sin(e.a) * r0]);
    this.balls.push(b);
    return b;
  }

  // fromPos: 导管动画的实际终点(盘面局部 3D),保证视觉无缝衔接
  enterBowl(b, bi, fromPos) {
    const bw = CFG.bowls.list[bi];
    const e = bw.enter;
    b.mode = 'bowl'; b.bi = bi; b.bowlT = 0; b.aired = false;b.airPulse=-1;b.holeTime=0;b.holeIndex=-1;b.hopY=0;b.hopV=0;b.pendingSink=null;b.contactStillT=0;
    // 个体差:速度与滚动阻尼 → 决定最终落洞的混沌相位
    b.dampMul = 0.86 + this.rand() * 0.28;
    const v = e.v * (0.82 + this.rand() * 0.38);
    let a;
    if (fromPos) {
      b.px = fromPos[0]; b.pz = fromPos[2] - bw.cz;
      const r = Math.hypot(b.px, b.pz);
      const rmax = bw.R - CFG.ball.r * 0.75;
      if (r > rmax) { b.px *= rmax / r; b.pz *= rmax / r; }
      a = Math.atan2(b.pz, b.px);
    } else {
      a = e.a + (this.rand() - 0.5) * 0.5;
      const r0 = bw.R * (e.rr - this.rand() * 0.06);
      b.px = Math.cos(a) * r0; b.pz = Math.sin(a) * r0;
    }
    const tx = -Math.sin(a) * e.dir, tz = Math.cos(a) * e.dir;
    b.pvx = tx * v; b.pvz = tz * v;
    this.emit('bowlenter', { tier: bi, ball: b });
  }

  // ---------- チューリップ状态机 ----------
  _updateWings() {
    const sh = CFG.shutter;
    const c = Math.cos(this.shutterA) * sh.wingLen, s = Math.sin(this.shutterA) * sh.wingLen;
    const w = this._wings;
    w[0].a[0] = -sh.halfW; w[0].a[1] = sh.y;
    w[0].b[0] = -sh.halfW + c; w[0].b[1] = sh.y + s;
    w[1].a[0] = sh.halfW; w[1].a[1] = sh.y;
    w[1].b[0] = sh.halfW - c; w[1].b[1] = sh.y + s;
  }

  // 开/闭时长:短促假动作与慢悠悠长相双峰混合,节奏不可预测
  _shutterDur(open) {
    const sh = CFG.shutter;
    const d = this.rand() < sh.pShort ? sh.shortDur : (open ? sh.openDur : sh.closedDur);
    const duration = d[0] + this.rand() * (d[1] - d[0]);
    return duration * (open ? sh.openTimeScale : 1);
  }

  stepShutter(dt) {
    const sh = CFG.shutter;
    this.shutterT -= dt;
    this.blockCD -= dt;
    if (this.shutterT <= 0) {
      this.shutterOpen = !this.shutterOpen;
      this.shutterT = this._shutterDur(this.shutterOpen);
      this.shutterSpd = sh.speed * (sh.speedVar[0] + this.rand() * (sh.speedVar[1] - sh.speedVar[0]));
      this.emit('shutter', { open: this.shutterOpen });
    }
    // 店方遥控ブロック:珠子正要落进来的瞬间"恰好"关闭
    if (this.shutterOpen && this.blockCD <= 0) {
      for (const b of this.balls) {
        if (b.mode === 'field' && b.vy < 0 && Math.abs(b.x) < 0.10 &&
            b.y > sh.y + 0.03 && b.y < sh.y + 0.17) {
          if (this.rand() < dt * sh.blockRate) {
            this.shutterOpen = false;
            this.shutterT = this._shutterDur(false);
            this.shutterSpd = sh.speed * sh.speedVar[1];  // ブロック时狠而快
            this.blockCD = sh.blockCooldown;
            this.emit('shutter', { open: false });
            this.emit('block', {});
          }
          break;
        }
      }
    }
    const target = this.shutterOpen ? sh.openA : sh.closedA;
    const da = target - this.shutterA;
    const mv = (this.shutterSpd || sh.speed) * dt;
    this.shutterA += Math.abs(da) < mv ? da : Math.sign(da) * mv;
    this._updateWings();
  }

  // ---------- 主步进 ----------
  step(dt) {
    this.time += dt;
    for (let i = 0; i < CFG.bowls.list.length; i++) {
      this.bowlAngles[i] += (CFG.bowls.list[i].rot || 0) * dt;
    }
    for (let i = 0; i < CFG.discs.length; i++) {
      this.discAngles[i] += CFG.discs[i].omega * dt;
    }
    this.stepShutter(dt);
    for (const b of this.balls) {
      if (b.dead) continue;
      switch (b.mode) {
        case 'rail': this.stepRail(b, dt); break;
        case 'field': this.stepField(b, dt); break;
        case 'bowl': this.stepBowl(b, dt); break;
        case 'script': this.stepScript(b, dt); break;
      }
      if (b.mode === 'field') {
        if (!isFinite(b.x + b.y)) b.dead = true;
      }
    }
    this.collideBalls();
    if(CFG.bowls.contacts.enabled)for(const b of this.balls){
      const entry=b.pendingSink;b.pendingSink=null;
      if(!entry||b.dead||b.mode!=='bowl')continue;
      if((b.hopY||0)<.0005&&(b.hopV||0)<=0&&Math.hypot(b.px-entry.hx,b.pz-entry.hz)<CFG.bowls.capture&&.5*CFG.g*(b.holeTime||0)**2>=CFG.bowls.contacts.fallDepth)this.sink(b,CFG.bowls.list[b.bi],entry.hi,entry.hx,entry.hz);
    }
    this.balls = this.balls.filter(b => !b.dead);
  }

  // ---------- 发射轨 ----------
  stepRail(b, dt) {
    const R = CFG.rail;
    b.v += (CFG.g * Math.cos(b.a) - R.friction * b.v) * dt;
    b.a -= (b.v / R.Rmid) * dt;
    if (b.a <= R.aExit) {
      // 出轨 → 抛体
      const dc = CFG.board.domeC;
      b.mode = 'field';
      b.x = dc.x + Math.cos(b.a) * R.Rmid;
      b.y = dc.y + Math.sin(b.a) * R.Rmid;
      const s = Math.max(b.v, 0.1);
      b.vx = Math.sin(b.a) * s; b.vy = -Math.cos(b.a) * s;
      this.emit('railout', { ball: b });
    } else if (b.a >= R.aStart + 0.03 && b.v < 0) {
      b.dead = true;
      this.emit('foul', { ball: b });
    }
  }

  // ---------- 盘面 2D ----------
  stepField(b, dt) {
    const P = CFG.phys, r = CFG.ball.r;
    // 双看门狗:低速累计 + 位置锚点(升级式踢珠,防楔死/钉顶平衡)
    const spd0 = Math.hypot(b.vx, b.vy);
    b.slowT = spd0 < 0.07 ? (b.slowT || 0) + dt : 0;
    if (b.anchorX === undefined) { b.anchorX = b.x; b.anchorY = b.y; b.stillT = 0; }
    if ((b.x - b.anchorX) ** 2 + (b.y - b.anchorY) ** 2 > 0.03 ** 2) {
      b.anchorX = b.x; b.anchorY = b.y; b.stillT = 0;
    } else {
      b.stillT += dt;
    }
    if (b.slowT > 0.9 || b.stillT > 1.4) {
      b.kicks = (b.kicks || 0) + 1;
      b.slowT = 0; b.stillT = 0; b.anchorX = b.x; b.anchorY = b.y;
      if (b.kicks >= 6) {
        // 彻底楔死(几何上不该发生):当作从钉后漏进机体,沉沼
        this.emit('swamp', { x: b.x, z: 0 });
        b.dead = true;
        return;
      }
      const k = 0.28 + b.kicks * 0.20;
      const toC = b.x > 0 ? -1 : 1;
      b.vx += (toC * 0.5 + (this.rand() - 0.5) * 1.4) * k;
      b.vy += 0.26 + k * 0.55 * this.rand();
    }
    b.vy -= CFG.g * dt;
    b.vx += this.tilt * CFG.g * CFG.tilt.fieldFactor * dt;
    b.vx *= P.airDrag; b.vy *= P.airDrag;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > P.maxV) { b.vx *= P.maxV / sp; b.vy *= P.maxV / sp; }
    const py = b.y;
    b.x += b.vx * dt; b.y += b.vy * dt;

    // 入口判定
    if (py >= CFG.gate.y && b.y < CFG.gate.y && Math.abs(b.x) < CFG.gate.halfW && b.vy < 0) {
      this.emit('gate', { ball: b });
      this.toChuteGate(b);
      return;
    }
    // 沼泽
    if (b.y < CFG.swampY + r) {
      this.emit('swamp', { x: b.x, z: 0.0 });
      b.dead = true;
      return;
    }

    // 钉子(空间哈希 3×3)
    const cell = this.cell;
    const cx = Math.floor(b.x / cell), cy = Math.floor(b.y / cell);
    for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gy = cy - 1; gy <= cy + 1; gy++) {
      const lst = this.grid.get(gx + ',' + gy);
      if (!lst) continue;
      for (const pi of lst) this.hitCircle(b, this.pins[pi].x, this.pins[pi].y, P.pinR, 'pin', pi);
    }
    // 回転盤:盘面带动 + 凸钉搅拌
    for (let di = 0; di < CFG.discs.length; di++) {
      const w = CFG.discs[di];
      const dx = b.x - w.x, dy = b.y - w.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > (w.R + r) * (w.R + r)) continue;
      const d = Math.sqrt(d2);
      // 盘面摩擦带动(珠子滚过旋转的盘面,被切向裹挟)
      if (d < w.R) {
        const k = 1 - Math.exp(-CFG.disc.grip * dt);
        const vsx = -dy * w.omega, vsy = dx * w.omega;
        b.vx += (vsx - b.vx) * k * 0.85;
        b.vy += (vsy - b.vy) * k * 0.5;
      }
      // 中央轴帽
      this.hitCircle(b, w.x, w.y, 0.018, 'hub', -1);
      // 凸钉(随盘旋转的移动碰撞体)
      const ang = this.discAngles[di];
      for (let ni = 0; ni < w.nubs; ni++) {
        const na = ang + ni * TAU / w.nubs;
        const ncx = w.x + Math.cos(na) * w.nubR;
        const ncy = w.y + Math.sin(na) * w.nubR;
        const ddx = b.x - ncx, ddy = b.y - ncy;
        const rr = r + w.nubSize;
        const dd2 = ddx * ddx + ddy * ddy;
        if (dd2 >= rr * rr || dd2 < 1e-12) continue;
        const dd = Math.sqrt(dd2);
        const nx = ddx / dd, ny = ddy / dd;
        b.x = ncx + nx * rr; b.y = ncy + ny * rr;
        // 凸钉自身速度(ω×r)
        const nvx = -(ncy - w.y) * w.omega, nvy = (ncx - w.x) * w.omega;
        const rvx = b.vx - nvx, rvy = b.vy - nvy;
        const vn = rvx * nx + rvy * ny;
        if (vn < 0) {
          const e = CFG.disc.nubRest;
          b.vx -= (1 + e) * vn * nx;
          b.vy -= (1 + e) * vn * ny;
          if (-vn > 0.25) this.emit('disc', { x: b.x, y: b.y, v: -vn, di });
        }
      }
    }
    // チューリップ双翼
    this.hitSeg(b, this._wings[0]);
    this.hitSeg(b, this._wings[1]);
    // 线段墙
    for (const s of this.segs) this.hitSeg(b, s);
    // 弧
    for (const a of this.arcs) this.hitArc(b, a);
  }

  hitCircle(b, px, py, pr, kind, idx) {
    const r = CFG.ball.r + pr;
    const dx = b.x - px, dy = b.y - py;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r || d2 < 1e-12) return;
    const d = Math.sqrt(d2);
    let nx = dx / d, ny = dy / d;
    // 钉面微随机(模拟真实钉子的活性)
    const j = (this.rand() - 0.5) * 0.10;
    const cj = Math.cos(j), sj = Math.sin(j);
    const rx = nx * cj - ny * sj, ry = nx * sj + ny * cj;
    nx = rx; ny = ry;
    b.x = px + nx * r; b.y = py + ny * r;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      const P = CFG.phys;
      if (-vn < 0.18 && ny > 0.6) {
        // 低速停上钉顶:不稳定平衡 → 强制向侧面滑落(钉头是圆的,不可能站住)
        b.vx -= vn * nx; b.vy -= vn * ny;
        const side = Math.abs(nx) > 0.03 ? Math.sign(nx) : (this.rand() < 0.5 ? -1 : 1);
        b.vx += side * (0.10 + this.rand() * 0.08);
      } else {
        const e = P.restPin + this.rand() * P.restPinVar;
        b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
        // 切向摩擦
        b.vx *= 0.985; b.vy *= 0.985;
        if (-vn > 0.25 && kind === 'pin') this.emit('pin', { x: b.x, y: b.y, v: -vn, idx });
      }
    }
  }

  hitSeg(b, s) {
    const r = CFG.ball.r;
    const ax = s.a[0], ay = s.a[1], bx = s.b[0], by = s.b[1];
    const ex = bx - ax, ey = by - ay;
    const L2 = ex * ex + ey * ey;
    let t = ((b.x - ax) * ex + (b.y - ay) * ey) / L2;
    t = Math.max(0, Math.min(1, t));
    const qx = ax + ex * t, qy = ay + ey * t;
    const dx = b.x - qx, dy = b.y - qy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r || d2 < 1e-12) return;
    const d = Math.sqrt(d2);
    const nx = dx / d, ny = dy / d;
    b.x = qx + nx * r; b.y = qy + ny * r;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      b.vx -= (1 + CFG.phys.restWall) * vn * nx;
      b.vy -= (1 + CFG.phys.restWall) * vn * ny;
      b.vx *= 0.99; b.vy *= 0.99;
      if (-vn > 0.5) this.emit('wood', { x: b.x, y: b.y, v: -vn });
    }
  }

  hitArc(b, a) {
    const dx = b.x - a.cx, dy = b.y - a.cy;
    const ang = Math.atan2(dy, dx);
    const norm = ang < -Math.PI / 2 ? ang + TAU : ang; // 统一到 -90°..270°
    if (norm < a.a0 || norm > a.a1) return;
    const d = Math.hypot(dx, dy);
    const lim = a.R - CFG.ball.r;
    if (d <= lim || d < 1e-6) return;
    const nx = -dx / d, ny = -dy / d; // 指向圆心
    b.x = a.cx - nx * lim; b.y = a.cy - ny * lim;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      b.vx -= (1 + CFG.phys.restWall) * vn * nx;
      b.vy -= (1 + CFG.phys.restWall) * vn * ny;
      // 沿拱滑行的切向摩擦(防止贴拱直冲到底)
      b.vx *= 0.995; b.vy *= 0.995;
      if (-vn > 0.5) this.emit('wood', { x: b.x, y: b.y, v: -vn });
    }
  }

  // ---------- 三段皿 ----------
  stepBowl(b, dt) {
    const B = CFG.bowls, bw = B.list[b.bi];
    b.bowlT += dt;
    if(B.contacts.enabled){
      b.pendingSink=null;advanceHop(b,dt,CFG.g);
      b.contactStillT=(Math.hypot(b.pvx,b.pvz)<.015&&(b.hopY||0)<.0005)?(b.contactStillT||0)+dt:0;
      if(b.bowlT>B.contacts.stalledAfter&&b.contactStillT>B.contacts.stalledFor){b.dead=true;this.emit('foul',{reason:'bowl-stall',id:b.id,tier:b.bi});return;}
    }
    const r = Math.hypot(b.px, b.pz);
    let ax = 0, az = 0;
    if (r > 1e-5) {
      const slope = bowlSlope(r, bw.R);
      const f = -CFG.g * slope / r;
      ax += f * b.px; az += f * b.pz;
    }
    // 阻尼(个体差 + 超时逐渐加强,保证收敛)
    const extra = B.contacts.enabled?Math.min(B.contacts.maxDampingExtra,Math.max(0,b.bowlT-16)/5):Math.max(0,b.bowlT-16)/5;
    const c = B.damp * (b.dampMul || 1) * (1 + extra);
    ax -= c * b.pvx; az -= c * b.pvz;
    // 倾斜作弊 + 扰动
    ax += this.tilt * CFG.tilt.maxAccel;
    if(!B.contacts.enabled){
      ax += (this.rand() - 0.5) * B.jitter;
      az += (this.rand() - 0.5) * B.jitter;
    }
    b.pvx += ax * dt; b.pvz += az * dt;
    let grazeHandled=false;
    if(B.contacts.enabled){
      const rot=this.bowlAngles[b.bi];
      let nearest=-1,nearestD=Infinity;
      for(let hi=0;hi<bw.holes.length;hi++){
        const a=bw.holes[hi].a+rot,d=Math.hypot(b.px-Math.cos(a)*bw.ringR,b.pz-Math.sin(a)*bw.ringR);
        if(d<nearestD){nearest=hi;nearestD=d;}
      }
      for(let hi=0;hi<bw.holes.length;hi++){
        const h=bw.holes[hi],a=h.a+rot,hx=Math.cos(a)*bw.ringR,hz=Math.sin(a)*bw.ringR;
        const force=hi===nearest?applyLipGravity(b,{x:hx,z:hz,inner:B.capture,outer:B.contacts.lipOuter,depth:B.contacts.lipDepth,gravity:CFG.g,dt}):0;
        if(force>.2&&(!b.rattled||this.time-b.rattled>.25)){b.rattled=this.time;this.emit('rattle',{tier:b.bi,contact:true});}
        if(h.win&&b.bi===B.air.tier){
          const dx=b.px-hx,dz=b.pz-hz,d=Math.hypot(dx,dz);
          const approaching=d>0&&(b.pvx*dx+b.pvz*dz)/d<-.02;
          if(B.air.chance>0&&approaching&&d>B.capture&&d<B.air.triggerRadius&&!(b.holeTime>0)&&this.time-this.airBurstStart>B.air.burstCooldown){
            this.airBurstStart=this.time;this.emit('air',{tier:b.bi,burst:true});
          }
          if(B.air.chance>0)applyAirBurst(b,{x:hx,z:hz,elapsed:this.time-this.airBurstStart,dt,duration:B.air.burstDuration,radius:B.air.burstRadius,inner:B.capture,acceleration:B.air.burstAcceleration});
          const wind=b.holeTime>0?0:applyAirJet(b,{x:hx,z:hz,time:this.time,dt,period:B.air.period,duty:B.air.chance,radius:B.air.radius,acceleration:B.air.acceleration});
          const pulse=Math.floor(this.time/B.air.period);
          if(wind>.1&&b.airPulse!==pulse){b.airPulse=pulse;this.emit('air',{tier:b.bi});}
        }
      }
      if(B.contacts.grazeEnabled&&nearest>=0){
        const a=bw.holes[nearest].a+rot;
        const impact=advanceLipGraze(b,{x:Math.cos(a)*bw.ringR,z:Math.sin(a)*bw.ringR,radius:B.contacts.grazeRadius,captureRadius:B.capture,dt});
        grazeHandled=impact>0;
        if(grazeHandled)this.emit('rattle',{tier:b.bi,contact:true,elastic:true});
      }
    }
    if(!grazeHandled){b.px += b.pvx * dt; b.pz += b.pvz * dt;}

    // 碗缘
    const rmax = bw.R - CFG.ball.r * 0.7;
    const nr = Math.hypot(b.px, b.pz);
    if (nr > rmax) {
      const nx = b.px / nr, nz = b.pz / nr;
      b.px = nx * rmax; b.pz = nz * rmax;
      const vn = b.pvx * nx + b.pvz * nz;
      if (vn > 0) { b.pvx -= 1.55 * vn * nx; b.pvz -= 1.55 * vn * nz; }
    }

    // 洞口判定
    const rot = this.bowlAngles[b.bi];
    const sp = Math.hypot(b.pvx, b.pvz);
    for (let hi = 0; hi < bw.holes.length; hi++) {
      const h = bw.holes[hi];
      const a = h.a + rot;
      const hx = Math.cos(a) * bw.ringR, hz = Math.sin(a) * bw.ringR;
      const d = Math.hypot(b.px - hx, b.pz - hz);
      // 最終皿的空气喷出装置(一条流アシスト):
      // 慢速接近当り穴的瞬间,可能被一股气流吹开
      if (!B.contacts.enabled && h.win && b.bi === B.air.tier && !b.aired && d < B.capture * 2.6 && sp < B.vpass * 1.6) {
        b.aired = true;
        if (this.rand() < B.air.chance) {
          const ddx = b.px - hx, ddz = b.pz - hz;
          const dd = Math.hypot(ddx, ddz) || 1;
          b.pvx += (ddx / dd) * B.air.kick;
          b.pvz += (ddz / dd) * B.air.kick;
          this.emit('air', { tier: b.bi });
          continue;
        }
      }
      if(B.contacts.enabled&&((b.hopY||0)>.0005||(b.hopV||0)>0))continue;
      if (d < B.capture) {
        if(B.contacts.enabled){
          b.holeTime=(b.holeIndex===hi?(b.holeTime||0):0)+dt;b.holeIndex=hi;
          if(.5*CFG.g*b.holeTime*b.holeTime>=B.contacts.fallDepth)b.pendingSink={hi,hx,hz};
          return;
        }
        if (sp < B.vpass) {
          this.sink(b, bw, hi, hx, hz);
          return;
        } else if(!B.contacts.enabled) {
          // 高速滚过洞口:骤减速 + 轻微吸向洞心(哐啷感)
          b.pvx = b.pvx * 0.955 + (hx - b.px) * 2.2 * dt;
          b.pvz = b.pvz * 0.955 + (hz - b.pz) * 2.2 * dt;
          if (!b.rattled || this.time - b.rattled > 0.25) {
            b.rattled = this.time;
            this.emit('rattle', { tier: b.bi });
          }
        }
      }
    }
    if(B.contacts.enabled){b.holeTime=0;b.holeIndex=-1;}
  }

  sink(b, bw, hi, hx, hz) {
    const win = !!bw.holes[hi].win;
    const current=this.worldPos(b,[0,0,0]);
    const wx = CFG.bowls.contacts.enabled?current[0]:hx, wy = CFG.bowls.contacts.enabled?current[1]:bw.cy+bowlY(Math.hypot(hx,hz),bw.R)+CFG.ball.r;
    const wz = CFG.bowls.contacts.enabled?current[2]:bw.cz+hz;
    this.emit('sink', { tier: b.bi, win, x: wx, y: wy, z: wz });
    const B = CFG.bowls;
    if (win) {
      // 与场景导管完全同轨的贯通路径
      const W = winFlyPts(b.bi);
      if(B.contacts.enabled){W.drop[0]=current;W.drop[1]=[wx,wy-.03,wz];}
      if (W.jackpot) {
        this.setScript(b, [
          { pts: W.drop, dur: B.sinkT, ease: 2 },
          { pts: W.fly, dur: 0.5, ease: 1.6, end: 'jackpot' },
        ]);
      } else {
        this.setScript(b, [
          { pts: W.drop, dur: B.sinkT, ease: 2 },
          { pts: W.fly, dur: 0.55, ease: 1.6, end: 'bowl:' + W.next, exitV: W.exitV },
        ]);
      }
    } else {
      // ハズレ:从皿底漏斗漏出,直坠沼泽
      const fall = CFG.swampY;
      this.setScript(b, [
        { pts: [[wx, wy, wz], [wx, wy - 0.09, wz], [wx, wy - 0.10, wz], [wx, wy - 0.10, wz]], dur: B.sinkT, ease: 2 },
        { pts: [[wx, wy - 0.10, wz], [wx, wy - 0.30, wz], [wx, fall + 0.15, wz], [wx, fall - 0.02, wz]],
          dur: 0.55, ease: 1.8, end: 'swampsplash' },
      ]);
    }
  }

  toChuteGate(b) {
    // 先短促收拢到固定集球点(过闸横向最多差 ±26mm),再走和场景導軌同一条曲线
    const E = entryFlyPts(), top = E.top, z0 = CFG.board.ballZ;
    this.setScript(b, [
      { pts: [[b.x, b.y, z0], [b.x, b.y - 0.045, z0], [top[0], top[1] + 0.03, top[2]], top],
        dur: 0.26, ease: 1.4, next: true },
      { pts: E.fly, dur: 0.55, ease: 1.6, end: 'bowl:0', exitV: E.exitV },
    ]);
  }

  setScript(b, chain) {
    b.mode = 'script';
    b.chain = chain; b.ci = 0; b.st = 0;
    const p = chain[0].pts[0];
    b.wx = p[0]; b.wy = p[1]; b.wz = p[2];
  }

  stepScript(b, dt) {
    const sc = b.chain[b.ci];
    b.st += dt;
    let t = Math.min(1, b.st / sc.dur);
    const te = Math.pow(t, sc.ease || 1);
    const out = [0, 0, 0];
    bez(sc.pts[0], sc.pts[1], sc.pts[2], sc.pts[3], te, out);
    b.wx = out[0]; b.wy = out[1]; b.wz = out[2];
    if (t >= 1) {
      if (sc.end === 'jackpot') {
        this.emit('jackpot', { ball: b });
        b.dead = true;
      } else if (sc.end === 'swampsplash') {
        this.emit('swamp', { x: b.wx, z: b.wz });
        b.dead = true;
      } else if (sc.end && sc.end.startsWith('bowl:')) {
        const bi = +sc.end.slice(5);
        this.enterBowl(b, bi, [b.wx, b.wy, b.wz]);
      } else if (b.ci < b.chain.length - 1) {
        b.ci++; b.st = 0;
      } else {
        b.dead = true;
      }
    }
  }

  // ---------- 珠珠碰撞 ----------
  collideBalls() {
    const r2 = CFG.ball.r * 2;
    const n = this.balls.length;
    for (let i = 0; i < n; i++) {
      const A = this.balls[i];
      if (A.dead) continue;
      for (let j = i + 1; j < n; j++) {
        const B = this.balls[j];
        if (B.dead || A.mode !== B.mode) continue;
        if (A.mode === 'field') {
          const dx = B.x - A.x, dy = B.y - A.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < r2 * r2 && d2 > 1e-12) {
            const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
            const ov = (r2 - d) / 2;
            A.x -= nx * ov; A.y -= ny * ov; B.x += nx * ov; B.y += ny * ov;
            const rvx = B.vx - A.vx, rvy = B.vy - A.vy;
            const vn = rvx * nx + rvy * ny;
            if (vn < 0) {
              const imp = -(1 + CFG.phys.restBall) * vn / 2;
              A.vx -= imp * nx; A.vy -= imp * ny;
              B.vx += imp * nx; B.vy += imp * ny;
              if (-vn > 0.4) this.emit('clack', { x: A.x, y: A.y, v: -vn });
            }
          }
        } else if (A.mode === 'rail') {
          // 发射轨上是一维排队(a 越小越靠前),按弧长处理:后面的追上前面就顶一下。
          // 用 restRail(≈完全非弹性)而不是 restBall:两颗合成一列车分摊动量,
          // 后车不会被掏空动能而爬不过 aExit —— 保底力度的承诺连发时也撞不坏。
          const lo = A.a < B.a ? A : B, hi = A.a < B.a ? B : A;
          const d = hi.a - lo.a;
          if (d < this.railGapA) {
            const ov = (this.railGapA - d) / 2;
            lo.a -= ov; hi.a += ov;
            const vn = hi.v - lo.v;                 // >0 = 后面的在追
            if (vn > 0) {
              const imp = (1 + CFG.phys.restRail) * vn / 2;
              hi.v -= imp; lo.v += imp;
              if (vn > 0.4) {
                const dc = CFG.board.domeC;
                this.emit('clack', {
                  x: dc.x + Math.cos(lo.a) * CFG.rail.Rmid,
                  y: dc.y + Math.sin(lo.a) * CFG.rail.Rmid, v: vn,
                });
              }
            }
          }
        } else if (A.mode === 'bowl' && A.bi === B.bi) {
          if(CFG.bowls.contacts.enabled){
            const bw=CFG.bowls.list[A.bi],impact=resolveBowlPair(A,B,{radius:CFG.ball.r,restitution:CFG.phys.restBall,friction:CFG.bowls.contacts.pairFriction,maxHopSpeed:CFG.bowls.contacts.maxHopSpeed,heightA:this.worldPos(A,[0,0,0])[1],heightB:this.worldPos(B,[0,0,0])[1]});
            if(impact>.12)this.emit('clack',{x:A.px,y:bw.cy,v:impact});
            continue;
          }
          const dx = B.px - A.px, dz = B.pz - A.pz;
          const d2 = dx * dx + dz * dz;
          if (d2 < r2 * r2 && d2 > 1e-12) {
            const d = Math.sqrt(d2), nx = dx / d, nz = dz / d;
            const ov = (r2 - d) / 2;
            A.px -= nx * ov; A.pz -= nz * ov; B.px += nx * ov; B.pz += nz * ov;
            const rvx = B.pvx - A.pvx, rvz = B.pvz - A.pvz;
            const vn = rvx * nx + rvz * nz;
            if (vn < 0) {
              const imp = -(1 + CFG.phys.restBall) * vn / 2;
              A.pvx -= imp * nx; A.pvz -= imp * nz;
              B.pvx += imp * nx; B.pvz += imp * nz;
              if (-vn > 0.3) this.emit('clack', { x: A.px, y: CFG.bowls.list[A.bi].cy, v: -vn });
            }
          }
        }
      }
    }
  }

  // ---------- 渲染用世界坐标(盘面局部) ----------
  worldPos(b, out) {
    switch (b.mode) {
      case 'rail': {
        const dc = CFG.board.domeC;
        out[0] = dc.x + Math.cos(b.a) * CFG.rail.Rmid;
        out[1] = dc.y + Math.sin(b.a) * CFG.rail.Rmid;
        out[2] = CFG.board.ballZ;
        break;
      }
      case 'field':
        out[0] = b.x; out[1] = b.y; out[2] = CFG.board.ballZ;
        break;
      case 'bowl': {
        const bw = CFG.bowls.list[b.bi];
        out[0] = b.px;
        out[1] = bw.cy + bowlSurfaceY(b.px,b.pz,bw,this.bowlAngles[b.bi]) + CFG.ball.r + (CFG.bowls.contacts.enabled?(b.hopY||0)-Math.min(CFG.bowls.contacts.fallDepth,.5*CFG.g*(b.holeTime||0)**2):0);
        out[2] = bw.cz + b.pz;
        break;
      }
      case 'script':
        out[0] = b.wx; out[1] = b.wy; out[2] = b.wz;
        break;
    }
    return out;
  }

  // 珠子在皿内的紧张度(0-3,给镜头/音效用)
  tensionLevel() {
    let lv = 0;
    for (const b of this.balls) {
      if (b.mode === 'bowl') lv = Math.max(lv, b.bi + 1);
      else if (b.mode === 'script' && b.chain && b.chain[b.ci] && b.chain[b.ci].end) {
        const e = b.chain[b.ci].end;
        if (e === 'jackpot') lv = Math.max(lv, 3);
        else if (e.startsWith('bowl:')) lv = Math.max(lv, +e.slice(5) + 1);
      }
    }
    return lv;
  }
}
