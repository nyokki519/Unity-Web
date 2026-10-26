import {holeGeometry} from './hole-geometry.js';
import {updateRainbowRim} from './rainbow-rim.js?v=rainbow3';
// Adapted with author permission reported by the user. See ../NOTICE.txt.
// ============================================================
// 「沼」动态特效 —— 粒子 / 运镜 / 霓虹 / ざわざわ / 珠雨
// ============================================================
import {bowlCameraPose,autoBowlCameraPose} from './camera-pose.js';
import * as THREE from '../../vendor/three/three.module.js';
import { CFG } from './config.js';
import { bowlSurfaceY, bowlSlope } from './physics.js';

const TIER_Y = CFG.bowls.list.map(b => b.cy + CFG.machineY);
const _UP = new THREE.Vector3(0, 1, 0), _HN = new THREE.Vector3();

export class FX {
  constructor(refs) {
    this.R = refs;
    this.t = 0;
    this.shakeAmp = 0;
    this.tiltVis = 0; this.tiltTarget = 0;
    this.mouse = { x: 0, y: 0 };
    this.camMode = 'TITLE'; this.camTier = 0;
    this.curPos = refs.camera.position.clone();
    this.curTgt = new THREE.Vector3(0, 1.55, 0);
    this.viewOff = 0; this.viewOffTarget = 0;   // ↑↓ 视角上下平移
    this.blockT = 9;                            // ブロック红灯爆闪计时
    this.neonMode = 'idle';
    this.handleCharge = 0; this.handleKick = 0;
    this.activeTiers = new Set();
    this.ledFlash = [0, 0, 0]; this.ledFlashCol = [null, null, null];
    this.pinFlashes = new Map();
    this.gatePulseT = 9;
    this.winPulse = [9, 9, 9];
    this.raining = false; this.rainT = 0;
    this.jackpotOn = false;
    // gl_PointSize 是「渲染缓冲像素」,而缓冲已按 DPR 放大;不乘回 DPR 的话
    // 视网膜屏上所有点精灵会缩水一半(sparks / 钉子辉光共用这一个 uniform)
    this.uDpr = { value: this.R.renderer.getPixelRatio() };
    this._buildSparks();
    this._buildPinGlow();
    this._buildRain();
    this._buildZawa();
    this._initBubbles();
    this.zawaTimer = 0;
    this.splashSlot = 0;
    this._v = new THREE.Vector3(); this._m = new THREE.Matrix4();
    this._c = new THREE.Color();
  }

  // ---------- 粒子火花 ----------
  _buildSparks() {
    const N = this.sparkN = 600;
    const geo = new THREE.BufferGeometry();
    this.sp = {
      pos: new Float32Array(N * 3), vel: new Float32Array(N * 3),
      life: new Float32Array(N), max: new Float32Array(N),
      col: new Float32Array(N * 3), size: new Float32Array(N),
      grav: new Float32Array(N), head: 0,
    };
    geo.setAttribute('position', new THREE.BufferAttribute(this.sp.pos, 3));
    geo.setAttribute('aCol', new THREE.BufferAttribute(this.sp.col, 3));
    geo.setAttribute('aLife', new THREE.BufferAttribute(this.sp.life, 1));
    geo.setAttribute('aMax', new THREE.BufferAttribute(this.sp.max, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.sp.size, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uDpr: this.uDpr },
      vertexShader: `
        attribute vec3 aCol; attribute float aLife, aMax, aSize;
        varying vec3 vCol; varying float vA;
        uniform float uDpr;
        void main() {
          vCol = aCol;
          vA = aMax > 0.0 ? clamp(aLife / aMax, 0.0, 1.0) : 0.0;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uDpr * (240.0 / max(0.1, -mv.z)) * (0.35 + 0.65 * vA);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vCol; varying float vA;
        void main() {
          vec2 q = gl_PointCoord - 0.5;
          float d = smoothstep(0.5, 0.05, length(q));
          gl_FragColor = vec4(vCol, d * vA);
        }`,
    });
    this.sparks = new THREE.Points(geo, mat);
    this.sparks.frustumCulled = false;
    this.sparks.renderOrder = 80;
    this.R.scene.add(this.sparks);
  }

  // ---------- 钉子命中辉光 ----------
  // 圆形柔光点:辉光的形状由这层自己给,bloom 只负责往外洇一圈。
  // (光靠 bloom 撑亮度的话,过曝像素会被后期的核糊成一块方块)
  _buildPinGlow() {
    const R = this.R, N = R.pinsIM.count;
    const pos = new Float32Array(N * 3), m4 = new THREE.Matrix4();
    for (let i = 0; i < N; i++) {
      R.pinsIM.getMatrixAt(i, m4);
      pos[i * 3] = m4.elements[12];
      pos[i * 3 + 1] = m4.elements[13];
      pos[i * 3 + 2] = m4.elements[14] + 0.055;   // 贴在钉头(球冠)那一端
    }
    this.pgAmp = new Float32Array(N);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aAmp', new THREE.BufferAttribute(this.pgAmp, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uDpr: this.uDpr },
      vertexShader: `
        attribute float aAmp; varying float vA;
        uniform float uDpr;
        void main() {
          vA = aAmp;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          // 尺寸单位同 sparks(1 ≈ 0.21m):亮到顶时直径约 6cm,比钉距略大
          gl_PointSize = (0.06 + 0.22 * aAmp) * uDpr * (240.0 / max(0.1, -mv.z));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying float vA;
        void main() {
          if (vA <= 0.001) discard;
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float a = pow(max(0.0, 1.0 - d), 2.6);          // 圆形软衰减
          gl_FragColor = vec4(vec3(1.0, 0.74, 0.36) * (2.0 * vA), a * vA);
        }`,
    });
    this.pinGlow = new THREE.Points(geo, mat);
    this.pinGlow.frustumCulled = false;
    this.pinGlow.renderOrder = 78;
    R.boardG.add(this.pinGlow);
  }

  // 板面局部坐标 → 世界
  _local(x, y, z) {
    this._v.set(x, y, z);
    return this.R.boardG.localToWorld(this._v);
  }

  emit(wx, wy, wz, n, opt = {}) {
    const { col = [2.5, 1.8, 0.5], speed = 0.5, up = 0.4, life = 0.7, size = 0.028, grav = 1.6, spread = 1 } = opt;
    const s = this.sp;
    for (let k = 0; k < n; k++) {
      const i = s.head; s.head = (s.head + 1) % this.sparkN;
      s.pos[i * 3] = wx; s.pos[i * 3 + 1] = wy; s.pos[i * 3 + 2] = wz;
      const a = Math.random() * Math.PI * 2, r = Math.random() * speed * spread;
      s.vel[i * 3] = Math.cos(a) * r;
      s.vel[i * 3 + 1] = up * (0.4 + Math.random() * 0.9);
      s.vel[i * 3 + 2] = Math.sin(a) * r * 0.7;
      s.life[i] = s.max[i] = life * (0.6 + Math.random() * 0.7);
      s.col[i * 3] = col[0] * (0.7 + Math.random() * 0.5);
      s.col[i * 3 + 1] = col[1] * (0.7 + Math.random() * 0.5);
      s.col[i * 3 + 2] = col[2] * (0.7 + Math.random() * 0.5);
      s.size[i] = size * (0.6 + Math.random() * 0.9);
      s.grav[i] = grav;
    }
  }

  emitLocal(x, y, z, n, opt) {
    const p = this._local(x, y, z);
    this.emit(p.x, p.y, p.z, n, opt);
  }

  _updateSparks(dt) {
    const s = this.sp;
    for (let i = 0; i < this.sparkN; i++) {
      if (s.life[i] <= 0) continue;
      s.life[i] -= dt;
      s.vel[i * 3 + 1] -= s.grav[i] * dt;
      s.pos[i * 3] += s.vel[i * 3] * dt;
      s.pos[i * 3 + 1] += s.vel[i * 3 + 1] * dt;
      s.pos[i * 3 + 2] += s.vel[i * 3 + 2] * dt;
    }
    const g = this.sparks.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aLife.needsUpdate = true;
    g.attributes.aCol.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
    g.attributes.aMax.needsUpdate = true;
  }

  // ---------- 大当り珠雨 ----------
  _buildRain() {
    const N = this.rainN = 320;
    this.rainIM = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.02, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.1, envMapIntensity: 1.0 }),
      N
    );
    this.rainIM.frustumCulled = false;
    this.rain = Array.from({ length: N }, () => ({ on: false, p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0 }));
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < N; i++) this.rainIM.setMatrixAt(i, zero);
    this.R.scene.add(this.rainIM);
  }

  startRain(dur = 3.2) { this.raining = true; this.rainT = dur; }

  _updateRain(dt) {
    if (this.raining) {
      this.rainT -= dt;
      if (this.rainT <= 0) this.raining = false;
      let toSpawn = 3;
      for (const r of this.rain) {
        if (toSpawn <= 0) break;
        if (r.on) continue;
        r.on = true; r.life = 3.5 + Math.random();
        r.p.set((Math.random() - 0.5) * 2.4, 3.3 + Math.random() * 0.8, 0.35 + Math.random() * 1.1);
        r.v.set((Math.random() - 0.5) * 0.8, -0.5 - Math.random(), (Math.random() - 0.5) * 0.4);
        toSpawn--;
      }
    }
    let any = false;
    for (let i = 0; i < this.rainN; i++) {
      const r = this.rain[i];
      if (!r.on) continue;
      any = true;
      r.life -= dt;
      r.v.y -= 6.5 * dt;
      r.p.addScaledVector(r.v, dt);
      if (r.p.y < 0.025 && r.v.y < 0) {
        r.v.y *= -0.35; r.v.x *= 0.8; r.p.y = 0.025;
      }
      if (r.life <= 0) {
        r.on = false;
        this._m.makeScale(0, 0, 0);
      } else {
        const sc = Math.min(1, r.life);
        this._m.makeScale(sc, sc, sc).setPosition(r.p);
      }
      this.rainIM.setMatrixAt(i, this._m);
    }
    if (any || this.raining) this.rainIM.instanceMatrix.needsUpdate = true;
  }

  // ---------- ざわ‥ざわ‥ ----------
  _buildZawa() {
    const mkTex = (txt, size) => {
      const cv = document.createElement('canvas');
      cv.width = 512; cv.height = 160;
      const g = cv.getContext('2d');
      g.font = `900 ${size}px "Hiragino Sans", "PingFang SC", sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 10; g.strokeStyle = 'rgba(0,0,0,0.9)';
      g.strokeText(txt, 256, 80);
      g.fillStyle = 'rgba(235,235,240,0.95)';
      g.fillText(txt, 256, 80);
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    const texes = [mkTex('ざわ…', 96), mkTex('ざわざわ…', 72), mkTex('ざわ…', 120)];
    this.zawas = [];
    for (let i = 0; i < 12; i++) {
      const mat = new THREE.SpriteMaterial({
        map: texes[i % 3], transparent: true, opacity: 0, depthWrite: false,
      });
      const sp = new THREE.Sprite(mat);
      sp.scale.set(0.6, 0.19, 1);
      sp.renderOrder = 70;
      sp.visible = false;
      this.R.scene.add(sp);
      this.zawas.push({ sp, life: 0, max: 2.8, phase: Math.random() * 9 });
    }
  }

  spawnZawa() {
    const z = this.zawas.find(z => z.life <= 0);
    if (!z) return;
    const side = Math.random() < 0.5 ? -1 : 1;
    z.sp.position.set(side * (0.75 + Math.random() * 0.55), 0.8 + Math.random() * 1.5, 0.3 + Math.random() * 0.8);
    z.life = z.max = 2.4 + Math.random() * 0.9;
    z.phase = Math.random() * 9;
    const s = 0.5 + Math.random() * 0.45;
    z.sp.scale.set(s, s * 0.31, 1);
    z.sp.visible = true;
  }

  _updateZawa(dt, tension) { if(document.body.classList.contains('reduced')){for(const z of this.zawas)z.sp.visible=false;return;}
    if (tension > 0) {
      this.zawaTimer -= dt;
      const interval = [9, 2.4, 1.3, 0.55][tension];
      if (this.zawaTimer <= 0) { this.spawnZawa(); this.zawaTimer = interval * (0.7 + Math.random() * 0.6); }
    }
    for (const z of this.zawas) {
      if (z.life <= 0) { z.sp.visible = false; continue; }
      z.life -= dt;
      z.sp.position.y += 0.10 * dt;
      z.sp.position.x += Math.sin(this.t * 2.1 + z.phase) * 0.03 * dt;
      const f = 1 - z.life / z.max;
      z.sp.material.opacity = 0.55 * Math.pow(Math.sin(Math.min(1, f) * Math.PI), 0.7);
    }
  }

  // ---------- 沼泽 ----------
  _initBubbles() {
    this.bubbles = Array.from({ length: 36 }, () => ({
      x: (Math.random() - 0.5) * 1.1, z: -0.12 + (Math.random() - 0.5) * 0.3,
      phase: Math.random() * 9, speed: 0.5 + Math.random() * 1.2,
    }));
  }

  splash(x, z) {
    const u = this.R.swampUniforms.uSplash.value;
    u[this.splashSlot].set(x, -(z + 0.12), 0.001);
    this.splashSlot = (this.splashSlot + 1) % 6;
    this.emitLocal(x, CFG.swampY + 0.02, z, 20, { col: [0.35, 2.0, 0.9], speed: 0.35, up: 0.6, life: 0.55, size: 0.02, grav: 2.2 });
  }

  // ---------- 事件视效 ----------
  pinFlash(idx) { this.pinFlashes.set(idx, 1.0); }

  gateBurst() {
    this.gatePulseT = 0;
    this.emitLocal(0, CFG.gate.y, 0.04, 30, { col: [2.6, 1.9, 0.5], speed: 0.4, up: 0.7, life: 0.7, size: 0.03 });
  }

  blockFlash() { this.blockT = 0; this.shake(0.012); }

  airPuff(tier) {
    const bw = CFG.bowls.list[tier];
    const wh = bw.holes.find(h => h.win);
    const hole=holeGeometry(bw,wh),hx=hole.x,hz=hole.z;
    this.emitLocal(hx, bw.cy + 0.03, bw.cz + hz, 26,
      { col: [0.8, 1.6, 1.8], speed: 0.28, up: 0.9, life: 0.5, size: 0.02, grav: 0.6 });
  }

  sinkFX(tier, win, x, y, z) {
    this.shakeAmp=0; // Keep the hole and ball steady during entry.
    this.ledFlash[tier] = 1;
    this.ledFlashCol[tier] = win ? [3.2, 2.2, 0.5] : [2.4, 0.25, 0.2];
    if (win) {
      this.winPulse[tier] = 0;
      this.emitLocal(x, y + 0.02, z, 46, { col: [3, 2.1, 0.5], speed: 0.5, up: 0.8, life: 0.8, size: 0.032 });
    } else {
      this.emitLocal(x, y + 0.02, z, 14, { col: [0.5, 1.2, 0.6], speed: 0.3, up: 0.35, life: 0.5, size: 0.022 });
    }
  }

  jackpotBurst() { this.shakeAmp=0; if(document.body.classList.contains('reduced'))return;
    const p = this._local(0, CFG.pocket.y + 0.05, CFG.pocket.z);
    this.emit(p.x, p.y, p.z, 140, { col: [3.2, 2.3, 0.6], speed: 1.2, up: 2.6, life: 1.6, size: 0.05, grav: 2.8 });
    this.startRain(3.4);
  }

  shake(a) { if(document.body.classList.contains('reduced'))return; this.shakeAmp = Math.min(0.12, this.shakeAmp + a); }

  setCamMode(mode, tier = 0) { this.camMode = mode; this.camTier = tier; }
  setNeonMode(m) { this.neonMode = m; }

  // ============================================================
  update(dt, sim, state) {
    this.t += dt;
    const R = this.R, t = this.t;
    R.banknoteRain.update(dt,{reduced:document.body.classList.contains('reduced'),enabled:this.banknotesEnabled!==false});

    this.uDpr.value = R.renderer.getPixelRatio();   // 降档会改 DPR,点精灵跟着走

    // ---- 钉子闪光衰减 ----
    if (this.pinFlashes.size) {
      for (const [idx, v] of this.pinFlashes) {
        const nv = v - dt * 3.5;
        if (nv <= 0) {
          R.pinsIM.setColorAt(idx, R.pinBase);
          this.pgAmp[idx] = 0;
          this.pinFlashes.delete(idx);
        } else {
          this._c.setRGB(0.847 + nv * 2.6, 0.706 + nv * 1.9, 0.416 + nv * 0.8);
          R.pinsIM.setColorAt(idx, this._c);
          this.pgAmp[idx] = nv * nv;          // 辉光收得比钉子本身快一点,免得糊成一片
          this.pinFlashes.set(idx, nv);
        }
      }
      R.pinsIM.instanceColor.needsUpdate = true;
      this.pinGlow.geometry.attributes.aAmp.needsUpdate = true;
    }

    // ---- 大回転盤 ----
    R.discGs.forEach((g, i) => { g.rotation.z = sim.discAngles[i]; });

    // ---- チューリップ(翼角与物理同源;状态灯:开=绿 闭=红,ブロック爆闪) ----
    R.wingL.rotation.z = sim.shutterA;
    R.wingR.rotation.z = Math.PI - sim.shutterA;
    this.blockT += dt;
    if (this.blockT < 0.9) {
      const strobe = Math.sin(this.t * 46) > 0 ? 1 : 0.12;
      R.tulipLampMat.color.setRGB(3.2 * strobe, 0.2, 0.2);
    } else if (sim.shutterOpen) {
      const b = 0.85 + 0.3 * Math.sin(t * 7);
      R.tulipLampMat.color.setRGB(0.25 * b, 1.7 * b, 0.5 * b);
    } else {
      R.tulipLampMat.color.setRGB(1.5, 0.22, 0.22);
    }

    // ---- 入口 ----
    this.gatePulseT += dt;
    const gp = Math.max(0, 1 - this.gatePulseT * 2.2);
    R.gateFlash.material.opacity = gp;
    R.gateFlash.scale.setScalar(1 + (1 - gp) * 1.8);
    R.gateRing.material.opacity = 0.55 + 0.35 * Math.sin(t * 3.2);

    // ---- 皿:洞口位置(随转动)/ LED / 金环脉冲 ----
    R.bowlRefs.forEach((br, bi) => {
      const rot = sim.bowlAngles[bi];
      if(br.fan){
        const duty=CFG.bowls.air.chance,phase=((sim.time%CFG.bowls.air.period)+CFG.bowls.air.period)%CFG.bowls.air.period/CFG.bowls.air.period;
        const active=duty>0&&(phase<duty||sim.time-sim.airBurstStart<CFG.bowls.air.burstDuration);
        br.fan.housing.visible=duty>0;
        br.fan.rotor.rotation.z+=dt*(active?24:1.5);
        br.fan.light.color.setRGB(active ? .3 : .08,active ? 1.4 : .3,active ? 1.7 : .35);
      }
      const slope = bowlSlope(br.bw.ringR, br.bw.R);  // 洞口环贴碗面法线倾斜,防穿模
      br.holes.forEach((h, hi) => {
        const a = br.bw.holes[hi].a + rot;
        const hole=holeGeometry(br.bw,br.bw.holes[hi],rot),ca=Math.cos(hole.a),sa=Math.sin(hole.a);
        h.hg.position.set(hole.x,bowlSurfaceY(hole.x,hole.z,br.bw,rot)+.0025,hole.z);
        const localSlope=bowlSlope(hole.radial,br.bw.R);
        _HN.set(hole.vertical?0:-localSlope*ca,1,hole.vertical?0:-localSlope*sa).normalize();
        h.hg.quaternion.setFromUnitVectors(_UP, _HN);
        if (h.win) {
          const pulse = h.ring.userData.rainbow?1:1 + 0.18 * Math.sin(t * 5 + bi);
          h.ring.scale.setScalar(pulse);
          if(h.ring.userData.rainbow)updateRainbowRim(h.ring,dt,document.body.classList.contains('reduced'));
        }
      });
      // LED
      this.ledFlash[bi] = Math.max(0, this.ledFlash[bi] - dt * 1.6);
      const f = this.ledFlash[bi];
      if (f > 0 && this.ledFlashCol[bi]) {
        const c = this.ledFlashCol[bi];
        br.ledMat.color.setRGB(0.06 + c[0] * f, 0.3 + c[1] * f, 0.45 + c[2] * f);
      } else if (this.activeTiers.has(bi)) {
        const b = 0.8 + 0.5 * Math.sin(t * 6);
        br.ledMat.color.setRGB(1.0 * b, 0.85 * b, 0.5 * b);
      } else {
        br.ledMat.color.setRGB(0.04, 0.17, 0.26);
      }
      this.winPulse[bi] += dt;
    });

    // ---- 大当り口光环 ----
    const jk = this.jackpotOn ? 1 : 0;
    const pkb = 0.7 + 0.5 * Math.sin(t * (3 + jk * 9));
    R.pkRingMat.color.setRGB((0.75 + jk * 2.0) * pkb, (0.52 + jk * 1.4) * pkb, 0.15 * pkb);

    // ---- 沼泽 ----
    R.swampUniforms.uT.value = t;
    for (const s of R.swampUniforms.uSplash.value) {
      if (s.z < 3) s.z += dt * 1.6;
    }
    // 气泡
    this.bubbles.forEach((b, i) => {
      const cyc = (t * b.speed + b.phase) % 2;
      const sc = cyc < 1.6 ? Math.min(1, cyc * 2) * 0.9 : Math.max(0, (2 - cyc) * 2.5);
      if (cyc < 0.02) { b.x = (Math.random() - 0.5) * 1.1; b.z = -0.12 + (Math.random() - 0.5) * 0.3; }
      this._m.makeScale(sc, sc, sc).setPosition(b.x, CFG.swampY + 0.004, b.z);
      R.bubbleIM.setMatrixAt(i, this._m);
    });
    R.bubbleIM.instanceMatrix.needsUpdate = true;
    R.swampLight.intensity = 0.30 + Math.sin(t * 2.3) * 0.09 + Math.sin(t * 7.1) * 0.05;

    // ---- 玻璃流光 ----
    R.sheen.material.map.offset.x = (t * 0.018) % 1;

    // ---- 霓虹 ----
    const mode = this.neonMode;
    R.neonMats.forEach((m, i) => {
      if (mode === 'jackpot') {
        this._c.setRGB(1, 0.72, 0.3);
        m.color.setRGB(this._c.r * 2.0, this._c.g * 2.0, this._c.b * 2.0);
      } else if (mode === 'tension') {
        const b = 0.85 + 0.4 * Math.sin(t * 5.5 + i * 1.3);
        m.color.setRGB(1.6 * b, 1.0 * b, 0.22 * b);
      } else {
        const b = 0.85 + 0.05 * Math.sin(t * 1.6 + i * 2.1);
        m.color.setRGB(0.65 * b, 0.47 * b, 0.22 * b);
      }
    });

    // ---- 看板灯泡跑马 ----
    if (!this._bulbAcc) this._bulbAcc = 0;
    this._bulbAcc += dt;
    if (this._bulbAcc > 0.033) {
      this._bulbAcc = 0;
      const speed = mode === 'jackpot' ? 14 : mode === 'tension' ? 5 : 2.4;
      for (let i = 0; i < R.bulbN; i++) {
        const ph = 0.5 + 0.5 * Math.sin(i * (Math.PI * 2 / R.bulbN) * 3 - t * speed);
        const v = Math.pow(ph, 3);
        if (mode === 'jackpot') {
          this._c.setRGB(1, 0.72 + v * 0.15, 0.28);
          this._c.multiplyScalar(0.6 + v * 2.4);
        } else {
          this._c.setRGB(0.35 + v * 2.0, 0.2 + v * 1.5, 0.05 + v * 0.5);
        }
        R.bulbIM.setColorAt(i, this._c);
      }
      R.bulbIM.instanceColor.needsUpdate = true;
    }

    // ---- 手柄 ----
    this.handleKick = Math.max(0, this.handleKick - dt * 6);
    const hc = this.handleCharge + this.handleKick * 0.15;
    R.hKnobG.rotation.z += ((-hc * 1.5) - R.hKnobG.rotation.z) * Math.min(1, dt * 10);

    // ---- 机体倾斜(作弊视觉) ----
    this.tiltVis += (this.tiltTarget - this.tiltVis) * Math.min(1, dt * 4);
    R.machineG.rotation.z = -this.tiltVis * 0.022;

    // ---- 尘埃 ----
    const dp = R.dustGeo.attributes.position.array;
    for (let i = 0; i < R.dustN; i++) {
      dp[i * 3] += R.dustVel[i][0] * dt * 10;
      dp[i * 3 + 1] += R.dustVel[i][1] * dt * 10;
      dp[i * 3 + 2] += R.dustVel[i][2] * dt * 10;
      if (dp[i * 3 + 1] > 3.4) dp[i * 3 + 1] = 0;
      if (dp[i * 3 + 1] < 0) dp[i * 3 + 1] = 3.4;
      if (Math.abs(dp[i * 3]) > 2.1) dp[i * 3] *= -0.98;
    }
    R.dustGeo.attributes.position.needsUpdate = true;

    this._updateSparks(dt);
    this._updateRain(dt);
    this._updateZawa(dt, state.tension);

    // ---- 运镜 ----
    // ↑↓ 视角上下平移(仅锁定视角的 TITLE/WIDE 生效)
    this.viewOff += (this.viewOffTarget - this.viewOff) * Math.min(1, dt * 5);
    if (!state.freeCam) {
      let dst, tgt;
      switch (this.camMode) {
        case 'TITLE':
          dst = [Math.sin(t * 0.13) * 0.35, 1.95 + Math.sin(t * 0.09) * 0.18 + this.viewOff, 3.35];
          tgt = [0, 1.48 + this.viewOff, 0];
          break;
        case 'CRUUNE': {
          const y = TIER_Y[this.camTier];
          // 竖屏时横向视野窄、纵向富余,特写机位整体往前收,皿才占得满
          if(this.detailView){const pose=bowlCameraPose({height:y,aspect:R.camera.aspect,...this.detailPose});dst=pose.position;tgt=pose.target;}
          else {const pose=autoBowlCameraPose({height:y,aspect:R.camera.aspect,tier:this.camTier});dst=pose.position;tgt=pose.target;}
          break;
        }
        case 'JACKPOT':
          dst = [0.85 + Math.sin(t * 0.9) * 0.1, 1.55, 2.9];
          tgt = [0, 1.4, 0];
          break;
        default: // WIDE:正对机台
          dst = [0, 1.75 + this.viewOff, 4.75]; // Leave visible background outside the cabinet.
          tgt = [0, 1.57 + this.viewOff, 0];
      }
      const k = 1 - Math.exp(-2.6 * dt);
      this._v.set(
        dst[0] + this.mouse.x * 0.10,
        dst[1] + this.mouse.y * 0.07,
        dst[2]
      );
      this.curPos.lerp(this._v, k);
      this._v.set(tgt[0] + this.mouse.x * 0.03, tgt[1] + this.mouse.y * 0.02, tgt[2]);
      this.curTgt.lerp(this._v, k);
      // 抖动
      this.shakeAmp *= Math.exp(-3.2 * dt);
      const sa = this.shakeAmp;
      const sx = (Math.sin(t * 39) * 0.6 + Math.sin(t * 57 + 1.7) * 0.4) * sa;
      const sy = (Math.sin(t * 47 + 0.9) * 0.6 + Math.sin(t * 63 + 2.6) * 0.4) * sa;
      R.camera.position.set(this.curPos.x + sx, this.curPos.y + sy, this.curPos.z);
      this._v.copy(this.curTgt); this._v.x += sx * 0.4; this._v.y += sy * 0.4;
      R.camera.lookAt(this._v);
    } else {
      R.controls.update();
      // Keep the lens in front of cabinet surfaces, including after damping.
      if(R.camera.position.z<.55){R.camera.position.z=.55;R.camera.lookAt(R.controls.target);}
    }
  }
}
