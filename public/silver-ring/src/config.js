// Adapted with author permission reported by the user. See ../NOTICE.txt.
// ============================================================
// 「沼」 THE BOG —— 全局配置(几何 / 物理 / 经济)
// 坐标系:盘面局部坐标,x 向右,y 向上(盘面底缘 y=0),z 朝向玩家。
// 整台机器 group 在世界中抬高 CFG.machineY。
// 原作三关门:釘の森 → 電動チューリップ(可動役物/ブロック) → 三段クルーン
// ============================================================

const D2R = Math.PI / 180;

export const CFG = {
  machineY: 0.62,          // 盘面底缘的世界高度(下方是操作台)

  ball: { r: 0.026 },
  g: 3.2,                  // 等效重力(盘面近垂直,手感用)

  board: {
    halfW: 0.60,           // 左右墙 x=±0.60
    domeC: { x: 0, y: 1.42 },
    domeR: 0.60,           // 顶部圆拱,最高点 y=2.02
    height: 2.02,
    ballZ: 0.028,          // 珠子中心距盘面
    glassZ: 0.078,
  },

  // 发射轨道:沿圆拱外圈的滑槽,α 为绕 domeC 的极角(弧度)
  rail: {
    Rmid: 0.5675,          // 珠子沿此半径滑行
    Rin: 0.535,            // 内导轨(场内碰撞用)
    aStart: 203.5 * D2R,   // 注入点(左下)
    aExit: 125 * D2R,      // 出口(左上,之后抛体飞越圆拱)
    v0min: 1.85,
    v0max: 3.05,
    // 「突破起始区」保底初速:aExit 是发射轨最高点,爬不过去就滚回来变戻り玉。
    // 临界值 2.132(node audit-launch.mjs 二分实测,含 friction),取 2.21 留 3.7% 余量
    // → 出轨还剩 0.57m/s,足够飞过圆拱进入钉の森,而不是在顶点上蠕动。
    v0clear: 2.21,
    jitter: 0.22,          // 初速抖动峰峰值(力度过了突破线就不许抖回来,见 Sim.launch)
    // 「随机力度」区间:下限 = 突破线(clearPower() 会再兜一次底),上限拉满。
    // 注意 0.65 以上的珠子一律贴着圆拱走、由返し甲板送回中央,落点分布几乎重合
    // (tune 的落点直方图),所以摇满区间的入口率会比甜蜜带低一半 —— 这是要的效果。
    rand: [0.30, 1.00],
    // 送珠间隔下限 ≈15 发/秒。几何上送珠口 19.5 发/秒就塞得下,但轨顶(aExit 附近)
    // 才是瓶颈:弱力度的珠子过顶只剩 0.57m/s,再快就排队堵在坡上把后车耗死。
    // 实测 15 发/秒 ×3000 发 ×3 档攒发全无戻り玉,20 发/秒开始零星失守 → 取 15。
    minGap: 1 / 15,
    friction: 0.045,
  },

  // 中央「命の入口」(最终判定线,チューリップ正下方)
  gate: { y: 1.0, halfW: 0.022 },

  // 大回転盤 ×2(原作的可動役物:盘面内旋转的大圆盘,带凸钉)
  discs: [
    { x: -0.295, y: 1.285, R: 0.115, omega: -1.7, nubs: 6, nubR: 0.074, nubSize: 0.011 },
    { x:  0.295, y: 1.285, R: 0.115, omega:  1.7, nubs: 6, nubR: 0.074, nubSize: 0.011 },
  ],
  disc: { grip: 13, nubRest: 0.5 },  // grip: 盘面切向裹挟速率(/s 量级)

  // 電動チューリップ(随机开闭的双翼 + 店方遥控ブロック)
  shutter: {
    y: 1.115, halfW: 0.048, wingLen: 0.052,
    openA: 2.0, closedA: 0.17, speed: 10,     // 翼角(rad)与基准角速度
    openTimeScale: 0.5, // 開放時間だけ半分。閉鎖時間・開閉速度は維持
    openDur: [1.0, 2.4], closedDur: [1.2, 3.0],  // 长相(慢悠悠)
    shortDur: [0.22, 0.65], pShort: 0.38,        // 短促假动作的时长与混入概率
    speedVar: [0.5, 1.7],                        // 每次开合角速度随机倍率
    blockRate: 0,        // 珠子接近时被遥控关闭的概率密度(/s)
    blockCooldown: 7,
  },

  // 转盘立柱区(盘面开洞的凹龛)
  column: { halfW: 0.205, top: 1.0, bottom: 0.15, backZ: -0.30 },

  swampY: 0.115,           // 沼泽液面(世界局部 y)

  // 三段クルーン(原作孔数 3/4/5;一・二段当り孔在前,最終皿在后)
  bowls: {
    depth: 0.048,          // 碗深
    expo: 2.2,             // 碗面曲线 y = depth*(r/R)^expo
    bump: { h: 0.014, w: 0.032 },  // 中央透明コブ(把珠子逼向洞环)
    damp: 0.34,            // 线性阻尼
    jitter: 0.09,          // 随机扰动加速度
    capture: 0.019,        // 洞捕获半径
    vpass: 0.26,           // 旧比較モードのみの入球速度制限
    contacts: { enabled:true, rimRadius:.023, lipOuter:.043, lipDepth:.0035, fallDepth:.01, pairFriction:.08, maxHopSpeed:.28, maxDampingExtra:2, stalledAfter:35, stalledFor:3 },
    sinkT: 0.32,           // 吞珠动画时长
    // 現行: chance=運転時間比率、加速度を積分。旧比較モードのみchance/kickの抽選。
    air: { tier: 2, chance: .32, kick: 0.60, period:1.8, radius:.06, acceleration:5 },  // 最終皿空气喷出装置
    list: [
      { cy: 0.835, cz: -0.115, R: 0.165, ringR: 0.055, rot: 0,
        enter: { a: 150 * D2R, dir: +1, rr: 0.86, v: 0.95 },
        holes: [ { a: 90 * D2R, win: true }, { a: 210 * D2R }, { a: 330 * D2R } ] },
      { cy: 0.565, cz: -0.115, R: 0.150, ringR: 0.050, rot: 0,
        enter: { a: 100 * D2R, dir: -1, rr: 0.86, v: 0.90 },
        holes: [ { a: 90 * D2R, win: true }, { a: 0 }, { a: 180 * D2R }, { a: 270 * D2R } ] },
      { cy: 0.295, cz: -0.115, R: 0.135, ringR: 0.046, rot: 0,
        enter: { a: 80 * D2R, dir: +1, rr: 0.86, v: 0.85 },
        holes: [ { a: 270 * D2R, win: true }, { a: 342 * D2R }, { a: 54 * D2R }, { a: 126 * D2R }, { a: 198 * D2R } ] },
    ],
  },

  pocket: { x: 0, y: 0.150, z: -0.115 }, // 大当り口

  // 物理材质
  phys: {
    pinR: 0.0075,
    restPin: 0.42, restPinVar: 0.18,
    restWall: 0.35,
    restBall: 0.8,
    // 发射轨上的珠-珠恢复系数。轨上是斜坡排队(持续滚动接触),不是盘面里的自由撞击:
    // 用 0.8 会把后车的动能整个塞给前车,后车原地失速滚回来变戻り玉(实测 20 发/秒
    // 时 800 发里坏 164 发);近似完全非弹性 = 两颗合成一列车分摊动量,谁都不掉队。
    restRail: 0.15,
    airDrag: 0.9995,
    maxV: 6,
    dt: 1 / 240,
  },

  // 经济(赌博默示録・沼 规格)
  eco: {
    start: 40000,        // 200 paid shots; seeded balance survey in docs/qa.
    ballCost: 200,       // Virtual credits per accepted launch.
    jackpot: 1000000,    // 大当り ¥700,000,000
    borrow: 100000,      // 帝愛借款单位
    autoRate: 12,          // 连发 / 秒(AUTO 与随机力度按住连发共用;
                           //  硬上限是 rail.minGap = 15 发/秒,见 Sim.railClear)
  },

  // 倾斜作弊(卡以吉的「大楼倾斜」作战)
  tilt: {
    maxAccel: 0.11,        // 转盘内横向加速度
    fieldFactor: 0.18,     // 盘面重力横向分量系数
    susRise: 0.20,         // 注意度上升 / 秒
    susFall: 0.10,
    lockTime: 8,
  },

  maxLiveBalls: 60,
};

// ------------------------------------------------------------
// 钉子布局(盘面几何的唯一来源,渲染与物理共用)
// 净空原则:任意钉-钉 / 钉-墙间隙必须 > 珠径 52mm + 余量,
//           否则珠子会楔死(node tune.mjs 会做全量净空审计)
// ------------------------------------------------------------
export function buildLayout(rand = Math.random) {
  const pins = [];
  const dc = CFG.board.domeC, dR = CFG.board.domeR;
  const push = (x, y) => pins.push({ x, y });

  // 天釘:圆拱下的两道弧形散射钉(右端 40°以下由返し甲板接管)
  for (let i = 0; i < 10; i++) {
    const a = (40 + i * 10) * D2R;
    push(dc.x + Math.cos(a) * 0.468, dc.y + Math.sin(a) * 0.468);
  }
  for (let i = 0; i < 7; i++) {
    const a = (52 + i * 11.5) * D2R;
    push(dc.x + Math.cos(a) * 0.386, dc.y + Math.sin(a) * 0.386);
  }

  // 掻き落とし導軌:插进回転盤内下缘的刮板,把盘面驮着的珠子刮下、
  // 顺坡送到チューリップ正上方(替代旧的导流 V 钉)
  const ramps = [
    { a: [0.235, 1.215], b: [0.085, 1.172] },
    { a: [-0.235, 1.215], b: [-0.085, 1.172] },
  ];

  // 主钉阵:交错网格,避开回転盤 / 中央通道 / 圆拱与导轨净空带
  for (let row = 0; row < 8; row++) {
    const y = 1.63 - row * 0.064;
    const off = (row % 2) * 0.041;
    for (let k = -8; k <= 8; k++) {
      const x = k * 0.082 + off;
      const dyc = y - dc.y;
      // 圆拱内边界(弧下延到 -15°,统一按圆方程留 75mm 净空)
      const maxX = (dyc > -0.155 ? Math.sqrt(Math.max(0, dR * dR - dyc * dyc)) : dR) - 0.075;
      if (Math.abs(x) > maxX) continue;
      // 左上导轨弧(R0.535)净空带
      const rd = Math.hypot(x - dc.x, dyc);
      let ang = Math.atan2(dyc, x - dc.x);
      if (ang < -Math.PI / 2) ang += Math.PI * 2;
      if (x < 0 && ang > 2.18 && ang < 3.67 && rd > 0.465) continue;
      // 返し甲板净空带
      const fx0 = 0.4704, fy0 = 1.7875, fx1 = 0.3850, fy1 = 1.5450;
      const fex = fx1 - fx0, fey = fy1 - fy0;
      let ft = ((x - fx0) * fex + (y - fy0) * fey) / (fex * fex + fey * fey);
      ft = Math.max(0, Math.min(1, ft));
      if (Math.hypot(x - (fx0 + fex * ft), y - (fy0 + fey * ft)) < 0.062) continue;
      // 回転盤区留空(盘半径 + 珠径 + 余量)
      let skip = false;
      for (const w of CFG.discs) {
        if ((x - w.x) ** 2 + (y - w.y) ** 2 < 0.158 ** 2) skip = true;
      }
      // 掻き落とし導軌近旁留空
      for (const rp of ramps) {
        const rex = rp.b[0] - rp.a[0], rey = rp.b[1] - rp.a[1];
        let rt = ((x - rp.a[0]) * rex + (y - rp.a[1]) * rey) / (rex * rex + rey * rey);
        rt = Math.max(0, Math.min(1, rt));
        if (Math.hypot(x - (rp.a[0] + rex * rt), y - (rp.a[1] + rey * rt)) < 0.058) skip = true;
      }
      if (skip) continue;
      // チューリップ正上方通道留空
      if (y < 1.30 && Math.abs(x) < 0.115) continue;
      push(x + (rand() - 0.5) * 0.003, y + (rand() - 0.5) * 0.003);
    }
  }

  // 命釘(判定线两侧的关键钉,缝 = 珠径+4mm)
  push(-0.0355, 1.032); push(0.0355, 1.032);

  // 两侧落珠道的点缀钉
  for (const s of [1, -1]) {
    push(s * 0.285, 0.80); push(s * 0.38, 0.63);
    push(s * 0.30, 0.46); push(s * 0.44, 0.30);
  }

  // 墙壁线段 {a:[x,y], b:[x,y]}
  const H = CFG.board.halfW, col = CFG.column, sh = CFG.shutter;
  const segs = [
    { a: [-H, 0.10], b: [-H, dc.y] },                 // 左墙
    { a: [H, 0.10], b: [H, dc.y] },                   // 右墙
    { a: [0.030, 1.002], b: [col.halfW, 0.932] },     // 立柱顶右斜檐
    { a: [-0.030, 1.002], b: [-col.halfW, 0.932] },   // 左斜檐
    { a: [col.halfW, 0.932], b: [col.halfW, col.bottom] },   // 立柱右壁
    { a: [-col.halfW, 0.932], b: [-col.halfW, col.bottom] }, // 立柱左壁
    // 返し甲板:贴着右拱下滑的珠子被这块斜板导回盘面中央
    { a: [0.4704, 1.7875], b: [0.3850, 1.5450] },
    // 掻き落とし導軌 ×2
    ...ramps,
    // チューリップ两颊(唯一入口通道的侧壁,被弹开的珠子从颊外滑落)
    { a: [sh.halfW, sh.y], b: [0.115, 1.038] },
    { a: [-sh.halfW, sh.y], b: [-0.115, 1.038] },
  ];

  // 圆弧碰撞 {cx,cy,R,a0,a1} 保持珠子在弧内侧
  const arcs = [
    { cx: dc.x, cy: dc.y, R: dR, a0: -15 * D2R, a1: 195 * D2R },          // 圆拱
    { cx: dc.x, cy: dc.y, R: CFG.rail.Rin, a0: 128 * D2R, a1: 207 * D2R },// 内导轨
  ];

  return { pins, segs, arcs };
}
