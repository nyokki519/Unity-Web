import{projectCabinet}from'./project-cabinet.js';
import{renderProfile}from'./render-profile.js';
// Adapted with author permission reported by the user. See ../NOTICE.txt.
// ============================================================
// 「沼」场景构建 —— 机体 / 盘面 / 三段皿 / 霓虹 / 材质
// 返回 refs 对象供 fx.js 与 main.js 驱动
// ============================================================
import {paintCabinetArt} from './cabinet-art.js';
import {createBanknoteRain} from './banknote-rain.js';
import * as THREE from '../../vendor/three/three.module.js';
import { EffectComposer } from '../../vendor/three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../../vendor/three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../../vendor/three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../../vendor/three/addons/postprocessing/OutputPass.js';
import { OrbitControls } from '../../vendor/three/addons/controls/OrbitControls.js';
import * as BGU from '../../vendor/three/addons/utils/BufferGeometryUtils.js';
import { CFG, buildLayout } from './config.js';
import { bowlSurfaceY, bowlY, winFlyPts, entryFlyPts } from './physics.js';

// ---------- 画布纹理工具 ----------
function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  return t;
}

const GOLD = 0xc9a66b, DARKRED = 0x163d2b;

function goldMat(rough = 0.32) {
  return new THREE.MeshStandardMaterial({ color: GOLD, metalness: 0.95, roughness: rough, envMapIntensity: 1.1 });
}

// 触屏 / 弱机判定:决定初始画质档(2=桌面 1=手机 0=降档后)
// ?touch=1 可在桌面强制手机 UI(方便调试)
export const TOUCH = /[?&]touch=1/.test(location.search) || (typeof matchMedia === 'function'
  && (matchMedia('(pointer: coarse)').matches
    || (navigator.maxTouchPoints > 0 && !matchMedia('(hover: hover)').matches)));


// UnrealBloomPass 自带的高斯核取 sigma = kernelRadius,尾部权重还有中心的 80%,
// 等于一个硬截断的方形盒滤波:碰上过曝像素(钉子闪光)糊出来的是一块硬边方块。
// 按 sigma = r/2.6 重配权重(边缘只剩 3%),衰减就是圆的了;shader 自己会归一化。
function roundBloomKernel(bloom) {
  for (const m of bloom.separableBlurMaterials) {
    const r = m.defines.KERNEL_RADIUS, s2 = (r / 2.6) ** 2;
    const c = m.uniforms.gaussianCoefficients.value;
    for (let i = 0; i < r; i++) c[i] = Math.exp(-0.5 * i * i / s2);
  }
}

// ============================================================
export function buildScene(canvas,layout=buildLayout()) {
  let qual = 2;
  const profile=()=>renderProfile({mobile:TOUCH,quality:qual,deviceRatio:devicePixelRatio,maxSamples:renderer.capabilities.maxSamples});

  const context=canvas.getContext('webgl2',{alpha:false,preserveDrawingBuffer:true,antialias:!TOUCH,premultipliedAlpha:false,powerPreference:'high-performance'});
  if(!context)throw new Error('WebGL2を開始できませんでした');
  const renderer = new THREE.WebGLRenderer({ canvas, context, alpha:false, preserveDrawingBuffer:true, antialias: !TOUCH, powerPreference: 'high-performance' });
  renderer.setPixelRatio(profile().pixelRatio);
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = qual >= 2 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101b17);renderer.setClearColor(0x101b17,1);
  scene.fog = new THREE.FogExp2(0x101b17, 0.04);

  // 明亮摄影棚环境:暖白主光 + 绯红/金条灯点缀 + 沼绿背光
  const pmrem = new THREE.PMREMGenerator(renderer);
  {
    const es = new THREE.Scene();
    es.background = new THREE.Color(0x697167);
    const strip = (w, h, color, intensity, pos, rot) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
      m.position.set(...pos); m.rotation.set(...rot);
      es.add(m);
    };
    strip(5, 2.2, 0xfff1da, 2.6, [0, 5, 0], [Math.PI / 2, 0, 0]);
    strip(1.2, 5, 0xd9c39b, 0.65, [-5, 2, 0], [0, Math.PI / 2, 0]);
    strip(1.2, 5, 0xffb32e, 1.1, [5, 2, 0], [0, -Math.PI / 2, 0]);
    strip(2.5, 1.2, 0x22e090, 0.45, [0, 1.6, -5], [0, 0, 0]);
    strip(8, 8, 0x9a9488, 0.9, [0, -3, 0], [-Math.PI / 2, 0, 0]);
    scene.environment = pmrem.fromScene(es, 0.04).texture;
  }
  scene.environmentIntensity = 1.0;

  // 竖屏手机横向视野会被切掉,按画幅比反算 fov,保证机台整台入画
  function fitFov(a) {
    const D = 3.88, HH = 1.647, HW = 0.875;   // 参考机位距离 / 机台半高 / 半宽(桌面正好 46°)
    const deg = THREE.MathUtils.radToDeg(Math.max(2 * Math.atan(HH / D), 2 * Math.atan(HW / (D * a))));
    return THREE.MathUtils.clamp(deg, 40, 60);
  }
  const camera = new THREE.PerspectiveCamera(fitFov(innerWidth / innerHeight), innerWidth / innerHeight, 0.05, 40);
  camera.position.set(0, 1.85, 3.6);
  camera.lookAt(0, 1.5, 0);

  // ---------- 灯光 ----------
  scene.add(new THREE.HemisphereLight(0xfff2e0, 0xb0a894, 0.7));
  const key = new THREE.SpotLight(0xffdcb0, 48, 0, 0.52, 0.65, 1.8);
  key.position.set(2.4, 4.4, 3.0);
  key.castShadow = true;
  key.shadow.mapSize.set(profile().shadowSize,profile().shadowSize);
  key.shadow.bias = -0.0004;
  const keyTgt = new THREE.Object3D(); keyTgt.position.set(0, 1.4, 0);
  scene.add(keyTgt); key.target = keyTgt;
  scene.add(key);
  const fillP = new THREE.PointLight(0xc1ccbc, 1.2, 9, 1.9);
  fillP.position.set(-2.4, 2.0, 1.6);
  scene.add(fillP);
  const warmP = new THREE.PointLight(0xff8855, 2.2, 7, 1.9);
  warmP.position.set(1.4, 0.8, 2.4);
  scene.add(warmP);

  // ---------- 地板(浅色摄影棚) ----------
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(14, 48),
    new THREE.MeshStandardMaterial({ color: 0x242e27, roughness: 0.65, metalness: 0.05, envMapIntensity: 0.55 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // ============================================================
  // 机体
  // ============================================================
  const machineG = new THREE.Group();
  scene.add(machineG);
  const boardG = new THREE.Group();
  boardG.position.y = CFG.machineY;
  machineG.add(boardG);

  const B = CFG.board, COL = CFG.column;

  // ---------- 盘面背板(带凹龛开孔的画布纹理) ----------
  let boardArtwork=null;
  const drawBoard=(g,w,h)=>{
    paintCabinetArt(g,w,h,boardArtwork);
    // 底部沼泽绿光
    const rg = g.createRadialGradient(w / 2, h * 0.95, 40, w / 2, h * 0.95, 480);
    rg.addColorStop(0, 'rgba(28,220,120,0.17)'); rg.addColorStop(1, 'rgba(28,220,120,0)');
    g.fillStyle = rg; g.fillRect(0, h * 0.6, w, h * 0.4);
    // 圆拱描边
    g.strokeStyle = 'rgba(217,174,84,0.14)'; g.lineWidth = 5;
    g.beginPath(); g.arc(w / 2, h * (1 - 1.42 / 2.06), 0.585 / 1.24 * w, Math.PI, 0); g.stroke();
    // 凹龛开孔(透明)+ 金边
    g.clearRect(343, 871, 338, 710);
    g.strokeStyle = 'rgba(217,174,84,0.5)'; g.lineWidth = 4;
    g.strokeRect(341, 869, 342, 714);
  };
  const boardTex=canvasTex(1024,1700,drawBoard);boardTex.userData.artwork='loading';
  const artImage=new Image();artImage.decoding='async';
  artImage.onload=()=>{boardArtwork=artImage;const cv=boardTex.image,g=cv.getContext('2d');g.clearRect(0,0,cv.width,cv.height);drawBoard(g,cv.width,cv.height);boardTex.needsUpdate=true;boardTex.userData.artwork='ready';};
  artImage.onerror=()=>{boardTex.userData.artwork='error';};
  artImage.src=new URL('../assets/infernal-backplate.webp',import.meta.url).href;
  const boardMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.24, 2.06),
    new THREE.MeshStandardMaterial({ map: boardTex, emissiveMap:boardTex,emissive:0xffffff,emissiveIntensity:.35,transparent: true, alphaTest: 0.4, roughness: 0.85, metalness: 0 })
  );
  boardMesh.position.set(0, 1.01, -0.004);
  boardG.add(boardMesh);

  // ---------- 凹龛(转盘密室) ----------
  const alcoveMat = new THREE.MeshStandardMaterial({ color: 0x102a20, roughness: 0.85, metalness: 0.2 });
  const alcoveBackTex = canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#102d22'; g.fillRect(0, 0, w, h);
    for (let x = 12; x < w; x += 24) {
      g.fillStyle = 'rgba(217,174,84,0.10)'; g.fillRect(x, 0, 2, h);
    }
    const rg = g.createRadialGradient(w / 2, h, 20, w / 2, h, 300);
    rg.addColorStop(0, 'rgba(30,220,130,0.20)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(0, 0, w, h);
  });
  const alcoveBack = new THREE.Mesh(new THREE.PlaneGeometry(0.41, 0.86),
    new THREE.MeshStandardMaterial({ map: alcoveBackTex, roughness: 0.8 }));
  alcoveBack.position.set(0, 0.575, -0.30);
  boardG.add(alcoveBack);
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(0.30, 0.86), alcoveMat);
    side.position.set(s * 0.205, 0.575, -0.15);
    side.rotation.y = -s * Math.PI / 2;
    boardG.add(side);
  }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(0.41, 0.30), alcoveMat);
  ceil.position.set(0, 1.0, -0.15); ceil.rotation.x = Math.PI / 2;
  boardG.add(ceil);
  // 凹龛内照明(暖白为主,让白瓷皿可读;沼绿光只做点缀)
  const alcoveLight = new THREE.PointLight(0xfff0d0, 0.18, 0.9, 1.8);
  alcoveLight.position.set(0, 0.68, 0.06);
  boardG.add(alcoveLight);
  const swampLight = new THREE.PointLight(0x2fff8f, 0.30, 0.5, 1.8);
  swampLight.position.set(0, 0.135, 0.02);
  boardG.add(swampLight);

  // 凹龛金色包边
  const trimMat = goldMat(0.3);
  const mkBox = (w, h, d, x, y, z, mat = trimMat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    boardG.add(m); return m;
  };
  mkBox(0.014, 0.88, 0.024, -0.211, 0.575, 0.006);
  mkBox(0.014, 0.88, 0.024, 0.211, 0.575, 0.006);
  mkBox(0.436, 0.014, 0.024, 0, 1.008, 0.006);
  mkBox(0.436, 0.014, 0.024, 0, 0.142, 0.006);

  // 斜檐(珠子滚落的金坡)
  for (const s of [-1, 1]) {
    const wedge = mkBox(0.19, 0.012, 0.05, s * 0.1175, 0.965, 0.024);
    wedge.rotation.z = -s * 0.381;
  }

  // ---------- 外框 / 圆拱 / 侧壁 ----------
  const domeTrim = new THREE.Mesh(new THREE.TorusGeometry(0.615, 0.014, 10, 64, Math.PI), goldMat(0.35));
  domeTrim.position.set(0, B.domeC.y, 0.01);
  boardG.add(domeTrim);
  for (const s of [-1, 1]) {
    mkBox(0.024, 1.34, 0.05, s * 0.612, 0.75, 0.01, new THREE.MeshStandardMaterial({ color: 0x214d37, metalness: 0.6, roughness: 0.4 }));
  }
  mkBox(1.25, 0.05, 0.05, 0, 0.075, 0.01, new THREE.MeshStandardMaterial({ color: 0x214d37, metalness: 0.6, roughness: 0.4 }));

  // 内导轨(发射滑槽)
  const railArc = new THREE.Mesh(
    new THREE.TorusGeometry(CFG.rail.Rin, 0.007, 8, 48, (207 - 125) * Math.PI / 180),
    new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 1, roughness: 0.15 })
  );
  railArc.position.set(0, B.domeC.y, 0.028);
  railArc.rotation.z = 125 * Math.PI / 180;
  boardG.add(railArc);

  // ---------- 钉子(合并几何 + 实例化,支持命中闪光) ----------

  const pinGeoBody = new THREE.CylinderGeometry(0.0075, 0.0075, 0.055, 8);
  pinGeoBody.rotateX(Math.PI / 2); pinGeoBody.translate(0, 0, 0.0275);
  const pinGeoCap = new THREE.SphereGeometry(0.0095, 10, 8);
  pinGeoCap.translate(0, 0, 0.055);
  const pinGeo = BGU.mergeGeometries([pinGeoBody, pinGeoCap]);
  const pinMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.95, roughness: 0.3, envMapIntensity: 1.2 });
  const pinsIM = new THREE.InstancedMesh(pinGeo, pinMat, layout.pins.length);
  const pinBase = new THREE.Color(0xd8b46a);
  {
    const m4 = new THREE.Matrix4();
    layout.pins.forEach((p, i) => {
      m4.setPosition(p.x, p.y, 0);
      pinsIM.setMatrixAt(i, m4);
      pinsIM.setColorAt(i, pinBase);
    });
    pinsIM.instanceColor.needsUpdate = true;
  }
  boardG.add(pinsIM);

  // ---------- 大回転盤 ×2(旋转部分 = discGs,珠子被盘面驮行/凸钉弹飞) ----------
  const discGs = CFG.discs.map((w, wi) => {
    // 静止底座环
    const base = new THREE.Mesh(new THREE.CylinderGeometry(w.R + 0.010, w.R + 0.013, 0.012, 48),
      new THREE.MeshStandardMaterial({ color: 0x214d37, metalness: 0.7, roughness: 0.35 }));
    base.rotation.x = Math.PI / 2;
    base.position.set(w.x, w.y, 0.004);
    boardG.add(base);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(w.R + 0.008, 0.0045, 8, 56), goldMat(0.3));
    rim.position.set(w.x, w.y, 0.012);
    boardG.add(rim);
    // 旋转组
    const g = new THREE.Group();
    g.position.set(w.x, w.y, 0.012);
    // 盘面(螺旋纹画布,旋转可见)
    const faceTex = canvasTex(512, 512, (gc, cw, ch) => {
      gc.translate(cw / 2, ch / 2);
      const grd = gc.createRadialGradient(0, 0, 10, 0, 0, cw / 2);
      grd.addColorStop(0, '#3a1018'); grd.addColorStop(0.8, '#183f2d'); grd.addColorStop(1, '#160609');
      gc.fillStyle = grd;
      gc.beginPath(); gc.arc(0, 0, cw / 2, 0, Math.PI * 2); gc.fill();
      // 三条金色螺旋臂
      gc.strokeStyle = 'rgba(222,178,92,0.75)'; gc.lineWidth = 10; gc.lineCap = 'round';
      for (let arm = 0; arm < 3; arm++) {
        gc.beginPath();
        for (let t = 0; t <= 1; t += 0.02) {
          const a = arm * Math.PI * 2 / 3 + t * 2.4;
          const r = 26 + t * (cw / 2 - 52);
          const px = Math.cos(a) * r, py = Math.sin(a) * r;
          t === 0 ? gc.moveTo(px, py) : gc.lineTo(px, py);
        }
        gc.stroke();
      }
      // 外圈刻度
      gc.fillStyle = 'rgba(222,178,92,0.5)';
      for (let i = 0; i < 24; i++) {
        gc.save(); gc.rotate(i * Math.PI / 12);
        gc.fillRect(cw / 2 - 26, -3, 14, 6);
        gc.restore();
      }
    });
    const face = new THREE.Mesh(new THREE.CircleGeometry(w.R, 48),
      new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.4, metalness: 0.55, envMapIntensity: 0.8 }));
    g.add(face);
    // 凸钉(与物理 nubR/nubSize 一致)
    const nubGeo = new THREE.CylinderGeometry(w.nubSize, w.nubSize + 0.002, 0.030, 10);
    nubGeo.rotateX(Math.PI / 2);
    for (let ni = 0; ni < w.nubs; ni++) {
      const na = ni * Math.PI * 2 / w.nubs;
      const nub = new THREE.Mesh(nubGeo, goldMat(0.25));
      nub.position.set(Math.cos(na) * w.nubR, Math.sin(na) * w.nubR, 0.014);
      g.add(nub);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(w.nubSize + 0.001, 10, 8), goldMat(0.2));
      cap.position.set(Math.cos(na) * w.nubR, Math.sin(na) * w.nubR, 0.029);
      g.add(cap);
    }
    // 中央轴帽
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.034, 12), goldMat(0.22));
    hub.rotation.x = Math.PI / 2; hub.position.z = 0.014;
    g.add(hub);
    boardG.add(g);
    return g;
  });

  // ---------- 導軌可视化(返し甲板 + 掻き落とし,与物理 segs 同几何) ----------
  const railBar = (x0, y0, x1, y1, thick = 0.011) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(len + 0.008, thick, 0.036), goldMat(0.35));
    bar.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0.024);
    bar.rotation.z = Math.atan2(y1 - y0, x1 - x0);
    boardG.add(bar);
    return bar;
  };
  railBar(0.4704, 1.7875, 0.3850, 1.5450);           // 返し甲板
  railBar(0.235, 1.215, 0.085, 1.172);               // 掻き落とし右
  railBar(-0.235, 1.215, -0.085, 1.172);             // 掻き落とし左

  // ---------- 電動チューリップ(随机开閉的双翼) ----------
  const tulipG = new THREE.Group();
  const SH = CFG.shutter;
  tulipG.position.set(0, SH.y, 0.03);
  boardG.add(tulipG);
  const wingGeo = new THREE.BoxGeometry(SH.wingLen + 0.006, 0.011, 0.042);
  wingGeo.translate((SH.wingLen + 0.006) / 2 - 0.003, 0, 0);
  const wingMat = new THREE.MeshStandardMaterial({ color: 0xe23a50, metalness: 0.75, roughness: 0.25, envMapIntensity: 1.0 });
  const wingL = new THREE.Mesh(wingGeo, wingMat);
  wingL.position.set(-SH.halfW, 0, 0);
  tulipG.add(wingL);
  const wingR = new THREE.Mesh(wingGeo, wingMat.clone());
  wingR.position.set(SH.halfW, 0, 0);
  tulipG.add(wingR);
  // 翼尖 LED
  const tipMatL = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 0.3, 0.3), toneMapped: false });
  for (const [wing, tm] of [[wingL, tipMatL], [wingR, tipMatL]]) {
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), tm);
    tip.position.set(SH.wingLen, 0, 0);
    wing.add(tip);
  }
  // 铰链座
  for (const s of [-1, 1]) {
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 10), goldMat(0.25));
    hinge.rotation.x = Math.PI / 2;
    hinge.position.set(s * SH.halfW, 0, 0);
    tulipG.add(hinge);
  }
  // 两颊(与物理 segs 同几何)
  railBar(SH.halfW, SH.y, 0.115, 1.038, 0.010);
  railBar(-SH.halfW, SH.y, -0.115, 1.038, 0.010);
  // 状态灯(开=绿 / 闭=红,ブロック时爆闪)
  const tulipLampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.25, 0.25), toneMapped: false });
  const tulipLamp = new THREE.Mesh(new THREE.SphereGeometry(0.011, 12, 10), tulipLampMat);
  tulipLamp.position.set(0, SH.y + 0.075, 0.045);
  boardG.add(tulipLamp);
  const lampHood = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.017, 0.016, 12), goldMat(0.3));
  lampHood.position.set(0, SH.y + 0.088, 0.045);
  boardG.add(lampHood);

  // ---------- 入口(命の入口) ----------
  const gateG = new THREE.Group();
  gateG.position.set(0, CFG.gate.y, 0.03);
  const gateRing = new THREE.Mesh(new THREE.TorusGeometry(CFG.gate.halfW + 0.010, 0.004, 8, 24),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.5, 0.4), toneMapped: false, transparent: true, opacity: 0.85 }));
  gateG.add(gateRing);
  const gateFlash = new THREE.Mesh(new THREE.TorusGeometry(CFG.gate.halfW + 0.010, 0.006, 8, 24),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3, 1), toneMapped: false, transparent: true, opacity: 0 }));
  gateG.add(gateFlash);
  boardG.add(gateG);
  // ---------- 三段皿 ----------
  const bowlRefs = [];
  CFG.bowls.list.forEach((bw, bi) => {
    const g = new THREE.Group();
    g.position.set(0, bw.cy, bw.cz);
    // 碗体
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const r = 0.004 + (bw.R - 0.004) * (i / 40);
      pts.push(new THREE.Vector2(r, bowlY(r, bw.R)));
    }
    pts.push(new THREE.Vector2(bw.R + 0.005, bowlY(bw.R, bw.R) + 0.016));
    pts.push(new THREE.Vector2(bw.R + 0.008, bowlY(bw.R, bw.R) + 0.030));
    const dishGeo=new THREE.LatheGeometry(pts,72);
    const positions=dishGeo.attributes.position;
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),z=positions.getZ(i);
      positions.setY(i,positions.getY(i)+bowlSurfaceY(x,z,bw)-bowlY(Math.hypot(x,z),bw.R));
    }
    dishGeo.computeVertexNormals();
    const dish = new THREE.Mesh(dishGeo,
      new THREE.MeshPhysicalMaterial({
        color: 0xe8f1f8, metalness: 0, roughness: 0.16,
        transparent: true, opacity: 0.17, clearcoat: 0.8, clearcoatRoughness: 0.22,
        envMapIntensity: 0.4, side: THREE.DoubleSide, depthWrite: false,
      }));
    dish.renderOrder = 10;
    g.add(dish);
    // 金缘
    const rim = new THREE.Mesh(new THREE.TorusGeometry(bw.R + 0.006, 0.0042, 8, 48), goldMat(0.28));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = bowlY(bw.R, bw.R) + 0.030;
    g.add(rim);
    // LED 光环(状态色,收窄贴住碗底)
    const ledMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.05, 0.22, 0.32), toneMapped: false });
    const led = new THREE.Mesh(new THREE.TorusGeometry(bw.R * 0.52, 0.0038, 8, 40), ledMat);
    led.rotation.x = Math.PI / 2;
    led.position.y = -0.008;
    g.add(led);
    // 中央支撑柱脚 + 后方支撑臂
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.028, 0.075, 12), goldMat(0.32));
    stem.position.y = -0.042;
    g.add(stem);
    // 支撑臂只从皿心伸到凹龛后壁(旧算式多出 215mm,会从皿前面捅出来挡住落口)
    const armLen = Math.abs(CFG.column.backZ - bw.cz);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, armLen, 8),
      new THREE.MeshStandardMaterial({ color: 0x8d8d92, metalness: 1, roughness: 0.28 }));
    arm.rotation.x = Math.PI / 2;
    arm.position.set(0, -0.055, (CFG.column.backZ - bw.cz) / 2);
    g.add(arm);
    // ハズレ穴的排水漏斗(可见的"漏进沼泽"结构)
    for (const h of bw.holes) {
      if (h.win) continue;
      const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.013, 0.034, 10, 1, true),
        new THREE.MeshStandardMaterial({ color: 0x5e594e, metalness: 0.6, roughness: 0.5, side: THREE.DoubleSide }));
      stub.position.set(Math.cos(h.a) * bw.ringR, -0.015, Math.sin(h.a) * bw.ringR);
      g.add(stub);
    }
    // 洞口
    const holes = bw.holes.map((h) => {
      const hg = new THREE.Group();
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.0215, 20),
        new THREE.MeshBasicMaterial({ color: 0x000000 }));
      disc.rotation.x = -Math.PI / 2;
      hg.add(disc);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(CFG.bowls.contacts.rimRadius, 0.0028, 8, 24),
        new THREE.MeshBasicMaterial({
          color: h.win ? new THREE.Color(2.6, 1.8, 0.35) : new THREE.Color(0.5, 0.06, 0.06),
          toneMapped: false,
        }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.0018;
      hg.add(ring);
      g.add(hg);
      return { hg, win: !!h.win, ring };
    });
    boardG.add(g);
    let fan=null;
    if(bi===CFG.bowls.air.tier){
      const wh=bw.holes.find(h=>h.win),nx=Math.cos(wh.a),nz=Math.sin(wh.a);
      const housing=new THREE.Group();
      housing.position.set(nx*(bw.R-.012),bowlY(bw.R-.012,bw.R)+.034,nz*(bw.R-.012));
      housing.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(-nx,0,-nz));
      const light=new THREE.MeshBasicMaterial({color:0x357883,toneMapped:false});
      housing.add(new THREE.Mesh(new THREE.TorusGeometry(.016,.0025,6,24),goldMat(.3)));
      const rotor=new THREE.Group();
      for(let k=0;k<3;k++){
        const blade=new THREE.Mesh(new THREE.BoxGeometry(.018,.005,.002),light);
        const a=k*Math.PI*2/3;blade.position.set(Math.cos(a)*.005,Math.sin(a)*.005,0);blade.rotation.z=a;rotor.add(blade);
      }
      housing.add(rotor);g.add(housing);fan={housing,rotor,light};
    }
    bowlRefs.push({ group: g, holes, ledMat, bw, bi, fan });
  });

  // ---------- 落球導軌(承托式金双轨) ----------
  // 旧版两根轨夹在珠子两侧齐腰处、横档还从珠心正中穿过:珠子悬在中间、下面全空,
  // 看着像一条"轨迹示意线"而不是承着珠子的东西(用户第四轮反馈)。
  // 现在轨距 34mm < 珠径 52mm,双轨沉到珠腹下方 ±36° 的两个接触点上,
  // 横档改成从珠底兜过去的 U 型托架(圆心在珠心轨迹上、半径=珠半径+轨半径,
  // 与珠同心所以永不相擦),珠子是骑在轨上滚下去的。
  // 出落口的竖直下坠段不铺轨(自由落体),轨道从曲线开始倾斜处接起。
  const railMat = goldMat(0.48);
  const RAIL_R = 0.0032;                                  // 轨管半径
  const CONT = CFG.ball.r + RAIL_R;                       // 珠心→轨心的相切距离
  const RAIL_W = 0.017;                                   // 轨距半宽
  const RAIL_D = Math.sqrt(CONT * CONT - RAIL_W * RAIL_W);// 轨心在珠心下方的深度
  const CANG = Math.atan2(RAIL_W, RAIL_D);                // 接触角
  function railGuide(curve, { trimY = -9, seg = 64 } = {}) {
    const g = new THREE.Group();
    const P = [], T = [], N = [], S = [];
    for (let i = 0; i <= seg; i++) {
      const p = curve.getPoint(i / seg), tn = curve.getTangent(i / seg).normalize();
      if (!P.length && tn.y < -0.93) continue;   // 出落口的竖直段留空
      if (p.y < trimY) break;                    // 快贴到下面碗面前停轨,末段让珠子飞进皿
      let n = new THREE.Vector3(0, -1, 0).addScaledVector(tn, tn.y);   // 垂直于轨向的"下"
      n = n.lengthSq() > 1e-4 ? n.normalize() : N[N.length - 1].clone();
      P.push(p); T.push(tn); N.push(n); S.push(tn.clone().cross(n).normalize());
    }
    if (P.length < 3) return g;
    for (const sgn of [1, -1]) {                 // 双轨贴着珠腹下方的两个接触点走
      const off = P.map((p, i) => p.clone()
        .addScaledVector(N[i], RAIL_D).addScaledVector(S[i], RAIL_W * sgn));
      g.add(new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(off), off.length * 2, RAIL_R, 7, false), railMat));
      for (const e of [off[0], off[off.length - 1]]) {    // 端头圆珠收口
        const cap = new THREE.Mesh(new THREE.SphereGeometry(RAIL_R * 1.5, 8, 6), railMat);
        cap.position.copy(e); g.add(cap);
      }
    }
    const cum = [0];
    for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + P[i].distanceTo(P[i - 1]));
    const L = cum[P.length - 1], m4 = new THREE.Matrix4();
    const tie = (i, ear) => {                    // U 型托架,两端多兜出 ear 弧度当焊耳
      const arc = 2 * (CANG + ear);
      const geo = new THREE.TorusGeometry(CONT, 0.0016, 5, 12, arc);
      geo.rotateZ(-arc / 2);                     // 弧段居中到局部 +X(轨面正下方)
      const m = new THREE.Mesh(geo, railMat);
      m4.makeBasis(N[i], S[i], T[i]);
      m.quaternion.setFromRotationMatrix(m4);
      m.position.copy(P[i]);
      g.add(m);
    };
    tie(0, 0.85);                                // 起点大 U:接住自由落体下来的珠子
    const nT = Math.max(1, Math.round((L - 0.06) / 0.048));
    for (let k = 0; k < nT; k++) {               // 末端 55mm 内不放托架,焊耳别伸进碗里
      const s = 0.02 + (k + 0.7) / nT * (L - 0.075);
      tie(cum.findIndex(c => c >= s), 0.42);
    }
    return g;
  }

  // 入口→第一皿(物理脚本 toChuteGate 与这里共用 entryFlyPts,珠子就骑在这条轨上)
  const E = entryFlyPts();
  const entryCurve = new THREE.CubicBezierCurve3(...E.fly.map(p => new THREE.Vector3(p[0], p[1], p[2])));
  boardG.add(railGuide(entryCurve, { trimY: E.fly[3][1] + 0.020 }));
  const inRing = new THREE.Mesh(new THREE.TorusGeometry(CFG.gate.halfW + 0.008, 0.004, 8, 20), goldMat(0.3));
  inRing.position.set(0, CFG.gate.y, CFG.board.ballZ);
  boardG.add(inRing);

  // ---------- 大当りポケット ----------
  const pocketG = new THREE.Group();
  pocketG.position.set(CFG.pocket.x, CFG.pocket.y, CFG.pocket.z);
  const pk = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0.012, 0), new THREE.Vector2(0.02, 0.01),
    new THREE.Vector2(0.032, 0.026), new THREE.Vector2(0.044, 0.046), new THREE.Vector2(0.05, 0.06),
  ], 32), goldMat(0.22));
  pocketG.add(pk);
  const pkRingMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2, 0.5), toneMapped: false });
  const pkRing = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.0045, 8, 32), pkRingMat);
  pkRing.rotation.x = Math.PI / 2; pkRing.position.y = 0.062;
  pocketG.add(pkRing);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.045, 6),
    new THREE.MeshStandardMaterial({ color: 0x40260c, metalness: 0.85, roughness: 0.35 }));
  ped.position.y = -0.028;
  pocketG.add(ped);
  const pkLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.10, 0.032),
    new THREE.MeshBasicMaterial({
      map: canvasTex(320, 100, (g, w, h) => {
        g.fillStyle = '#1c0505'; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#ffd35e'; g.lineWidth = 5; g.strokeRect(3, 3, w - 6, h - 6);
        const gr = g.createLinearGradient(0, 10, 0, h - 10);
        gr.addColorStop(0, '#fff2b0'); gr.addColorStop(1, '#e8a92c');
        g.fillStyle = gr; g.font = 'bold 64px "Hiragino Mincho ProN", serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('三 段 突 破', w / 2, h / 2 + 4);
      }), toneMapped: false,
    }));
  pkLabel.position.set(0, 0.02, 0.09);
  pkLabel.rotation.x = -0.25;
  pocketG.add(pkLabel);
  boardG.add(pocketG);

  // 皿→皿→ポケット贯通導軌(几何与物理脚本共用 winFlyPts 的贝塞尔)
  for (let bi = 0; bi < CFG.bowls.list.length; bi++) {
    const W = winFlyPts(bi);
    const dp = W.drop[0];        // dp[1] = 碗面 + 珠半径
    const surfY = dp[1] - CFG.ball.r;
    // 当り穴下的金落口:内径必须大于珠径(52mm),否则珠子会从锥壁里穿出来
    const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.029, 0.046, 16, 1, true),
      new THREE.MeshStandardMaterial({
        color: GOLD, metalness: 0.95, roughness: 0.3, envMapIntensity: 1.1, side: THREE.DoubleSide,
      }));
    funnel.position.set(dp[0], surfY - 0.021, dp[2]);
    boardG.add(funnel);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.0335, 0.0026, 6, 24), goldMat(0.3));
    lip.rotation.x = Math.PI / 2;
    lip.position.set(dp[0], surfY - 0.043, dp[2]);
    boardG.add(lip);
    // 漏斗口 → 下一段的導軌(最終皿→ポケット只有 9cm,留空让珠子自由落体更带劲)
    const nb = CFG.bowls.list[bi + 1];
    if (!nb) continue;
    const fly = new THREE.CubicBezierCurve3(...W.fly.map(p => new THREE.Vector3(p[0], p[1], p[2])));
    boardG.add(railGuide(fly, { trimY: W.fly[3][1] + 0.020 }));
  }

  // ---------- 沼泽液面(着色器) ----------
  const swampUniforms = {
    uT: { value: 0 },
    uSplash: { value: Array.from({ length: 6 }, () => new THREE.Vector3(0, 0, 99)) }, // x,z,age
  };
  const swampMat = new THREE.ShaderMaterial({
    uniforms: swampUniforms,
    transparent: true,
    vertexShader: `
      varying vec2 vUv; varying vec3 vPos;
      void main() {
        vUv = uv; vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float uT;
      uniform vec3 uSplash[6];
      varying vec2 vUv; varying vec3 vPos;
      void main() {
        vec2 p = vPos.xy; // plane 未旋转前局部:x 宽,y 深(旋转后为世界 z)
        float w1 = sin(p.x * 34.0 + uT * 1.3) * sin(p.y * 28.0 - uT * 0.9);
        float w2 = sin((p.x + p.y) * 21.0 - uT * 1.9);
        float glow = 0.5 + 0.5 * sin(uT * 0.8);
        vec3 col = mix(vec3(0.006, 0.075, 0.038), vec3(0.035, 0.30, 0.14), 0.5 + 0.28 * w1 + 0.2 * w2);
        col += vec3(0.014, 0.15, 0.06) * glow * smoothstep(0.5, 0.0, abs(p.x));
        // 波纹
        for (int i = 0; i < 6; i++) {
          vec3 s = uSplash[i];
          if (s.z < 3.0) {
            float d = distance(p, s.xy);
            float ring = smoothstep(0.035, 0.0, abs(d - s.z * 0.22)) * (1.0 - s.z / 3.0);
            col += vec3(0.15, 0.8, 0.36) * ring;
          }
        }
        float edge = smoothstep(0.0, 0.06, 0.58 - abs(p.x)) * smoothstep(0.0, 0.05, 0.18 - abs(p.y));
        gl_FragColor = vec4(col, 0.94 * edge + 0.04);
      }`,
  });
  const swamp = new THREE.Mesh(new THREE.PlaneGeometry(1.16, 0.36), swampMat);
  swamp.rotation.x = -Math.PI / 2;
  swamp.position.set(0, CFG.swampY, -0.12);
  swamp.renderOrder = 4;
  boardG.add(swamp);

  // 沼泽气泡
  const bubbleIM = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.006, 6, 5),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.18, 0.85, 0.42), toneMapped: false, transparent: true, opacity: 0.45 }),
    36
  );
  boardG.add(bubbleIM);

  // ---------- 前玻璃 ----------
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(1.22, 2.04),
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff, transparent: true, opacity: 0.05, roughness: 0.04, metalness: 0,
      envMapIntensity: 0.5, depthWrite: false,
    })
  );
  glass.position.set(0, 1.01, B.glassZ);
  glass.renderOrder = 50;
  boardG.add(glass);
  // 流光
  const sheen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.22, 2.04),
    new THREE.MeshBasicMaterial({
      map: canvasTex(256, 512, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, w, h);
        gr.addColorStop(0.42, 'rgba(255,255,255,0)');
        gr.addColorStop(0.5, 'rgba(255,255,255,0.5)');
        gr.addColorStop(0.53, 'rgba(255,255,255,0.1)');
        gr.addColorStop(0.6, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      }),
      transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false,
    })
  );
  sheen.position.set(0, 1.01, B.glassZ + 0.002);
  sheen.renderOrder = 60;
  boardG.add(sheen);

  // ---------- 机柜 ----------
  const cabMat = new THREE.MeshStandardMaterial({ color: 0x30090f, roughness: 0.22, metalness: 0.55, envMapIntensity: 1.1 });
  const addCab = (w, h, d, x, y, z, mat = cabMat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    machineG.add(m); return m;
  };
  // 侧柱
  addCab(0.17, 2.72, 0.46, -0.695, 1.36, -0.03);
  addCab(0.17, 2.72, 0.46, 0.695, 1.36, -0.03);
  // 顶部看板箱
  addCab(1.56, 0.44, 0.42, 0, 2.83, -0.05);
  // 操作台
  addCab(1.56, 0.64, 0.52, 0, 0.30, -0.04);
  addCab(1.30, 0.10, 0.42, 0, 0.05, -0.02, new THREE.MeshStandardMaterial({ color: 0x08070a, roughness: 0.6 }));

  // 看板(沼)
  const marqueeTex = canvasTex(1024, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#21523b'); gr.addColorStop(1, '#091f17');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d9ae54'; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28);
    g.strokeStyle = 'rgba(217,174,84,0.35)'; g.lineWidth = 3; g.strokeRect(30, 30, w - 60, h - 60);
    // 大「沼」
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#ffde7a'; g.shadowBlur = 12;
    const tg = g.createLinearGradient(0, h * 0.12, 0, h * 0.88);
    tg.addColorStop(0, '#fff7d8'); tg.addColorStop(0.5, '#ffd35e'); tg.addColorStop(1, '#b87e14');
    g.fillStyle = tg;
    g.font = '700 140px "Hiragino Mincho ProN", "Yu Mincho", serif';
    g.fillText('喫茶Unity', w / 2, h / 2 + 18);
    g.shadowBlur = 0;
    g.fillStyle = '#e8dcc0';
    g.font = '600 44px "Futura", "Avenir Next", sans-serif';
    g.fillText('喫 茶 遊 技 室', w / 2, h - 62);
    g.fillStyle = '#629074';
    g.font = 'bold 40px "Hiragino Mincho ProN", serif';
    g.textAlign = 'left';
    g.fillText('Unity MIX', 60, 80);
    g.textAlign = 'right';
    g.fillText('一人用', w - 60, 80);
  });
  const marquee = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 0.36),
    new THREE.MeshBasicMaterial({ map: marqueeTex, toneMapped: false }));
  marquee.position.set(0, 2.83, 0.162);
  machineG.add(marquee);

  // 看板跑马灯泡
  const bulbN = 26;
  const bulbIM = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.016, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
    bulbN
  );
  const bulbPos = [];
  {
    const m4 = new THREE.Matrix4();
    const W = 1.50, H = 0.42, per = 2 * (W + H);
    for (let i = 0; i < bulbN; i++) {
      const t = i / bulbN * per;
      let x, y;
      if (t < W) { x = -W / 2 + t; y = H / 2; }
      else if (t < W + H) { x = W / 2; y = H / 2 - (t - W); }
      else if (t < 2 * W + H) { x = W / 2 - (t - W - H); y = -H / 2; }
      else { x = -W / 2; y = -H / 2 + (t - 2 * W - H); }
      bulbPos.push([x, 2.83 + y, 0.17]);
      m4.setPosition(x, 2.83 + y, 0.17);
      bulbIM.setMatrixAt(i, m4);
      bulbIM.setColorAt(i, new THREE.Color(0.3, 0.15, 0.04));
    }
    bulbIM.instanceColor.needsUpdate = true;
  }
  machineG.add(bulbIM);

  // 霓虹灯管
  const neonMats = [];
  const mkNeon = (w, h, d, x, y, z) => {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 0.25, 0.5), toneMapped: false });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    machineG.add(m);
    neonMats.push(mat);
    return m;
  };
  mkNeon(0.02, 2.35, 0.02, -0.63, 1.42, 0.19);
  mkNeon(0.02, 2.35, 0.02, 0.63, 1.42, 0.19);
  mkNeon(1.30, 0.018, 0.018, 0, 2.686, 0.185);
  mkNeon(1.30, 0.018, 0.018, 0, 0.635, 0.23);

  // 侧柱告示牌
  const placard = (lines, x) => {
    const t = canvasTex(256, 1024, (g, w, h) => {
      g.fillStyle = '#123a2b'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#d9ae54'; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16);
      g.fillStyle = '#ffd970';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const chars = lines.split('');
      const step = (h - 120) / chars.length;
      chars.forEach((c, i) => {
        g.font = /[¥0-9,]/.test(c) ? 'bold 92px "Menlo", monospace' : 'bold 100px "Hiragino Mincho ProN", serif';
        g.fillText(c, w / 2, 80 + step * (i + 0.5));
      });
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.115, 0.46 * (lines.length / 5 + 0.55)),
      new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
    m.position.set(x, 1.72, 0.205);
    machineG.add(m);
  };
  placard('一玉二百枚', -0.695);
  placard('三段突破', 0.695);

  // ---------- 操作台细节:托盘 / 珠堆 / 手柄 ----------
  const trayMat = new THREE.MeshStandardMaterial({ color: 0x2a1a08, metalness: 0.8, roughness: 0.4 });
  addCab(0.86, 0.05, 0.24, -0.10, 0.585, 0.23, trayMat);
  addCab(0.86, 0.09, 0.02, -0.10, 0.62, 0.345, trayMat);
  addCab(0.02, 0.09, 0.24, -0.52, 0.62, 0.23, trayMat);
  addCab(0.02, 0.09, 0.24, 0.32, 0.62, 0.23, trayMat);
  const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1.0, roughness: 0.07, envMapIntensity: 1.05 });
  const heapMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, metalness: 1.0, roughness: 0.3, envMapIntensity: 0.32 });
  const heapIM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.021, 12, 9), heapMat, 80);
  {
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 80; i++) {
      m4.setPosition(-0.10 + (Math.random() - 0.5) * 0.78, 0.625 + Math.random() * 0.03, 0.23 + (Math.random() - 0.5) * 0.19);
      heapIM.setMatrixAt(i, m4);
    }
  }
  machineG.add(heapIM);

  const consoleTex=canvasTex(1024,512,(g,w,h)=>{
    g.fillStyle='#123b2a';g.fillRect(0,0,w,h);g.strokeStyle='#d6b972';g.lineWidth=7;g.strokeRect(18,18,w-36,h-36);
    g.beginPath();g.arc(w/2,205,100,0,Math.PI*2);g.stroke();g.lineWidth=12;g.beginPath();g.moveTo(w/2-45,183);g.lineTo(w/2-32,235);g.quadraticCurveTo(w/2,260,w/2+32,235);g.lineTo(w/2+45,183);g.closePath();g.stroke();g.beginPath();g.arc(w/2+49,205,21,-Math.PI/2,Math.PI/2);g.stroke();
    g.fillStyle='#f2e8c7';g.font='bold 64px sans-serif';g.textAlign='center';g.fillText('喫茶Unity',w/2,390);
  });
  const consolePanel = new THREE.Mesh(new THREE.PlaneGeometry(1.48, 0.56),
    new THREE.MeshStandardMaterial({ map: consoleTex, roughness: 0.35, metalness: 0.3 }));
  consolePanel.position.set(0, 0.295, 0.223);
  machineG.add(consolePanel);

  const handleG = new THREE.Group();
  handleG.position.set(0.52, 0.42, 0.24);
  const hBase = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.062, 0.07, 20), goldMat(0.3));
  hBase.rotation.x = Math.PI / 2;
  handleG.add(hBase);
  const hKnobG = new THREE.Group();
  const hCap = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.05, 14),
    new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 1, roughness: 0.2 }));
  hCap.rotation.x = Math.PI / 2; hCap.position.z = 0.05;
  hKnobG.add(hCap);
  for (let i = 0; i < 3; i++) {
    const lug = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.062, 0.032),
      new THREE.MeshStandardMaterial({ color: 0x222228, metalness: 0.7, roughness: 0.35 }));
    const a = i * (Math.PI * 2 / 3);
    lug.position.set(Math.cos(a) * 0.036, Math.sin(a) * 0.036, 0.055);
    lug.rotation.z = a + Math.PI / 2;
    hKnobG.add(lug);
  }
  handleG.add(hKnobG);
  machineG.add(handleG);

  // ---------- 珠子(实例化) ----------
  const ballsIM = new THREE.InstancedMesh(new THREE.SphereGeometry(CFG.ball.r, 20, 14), ballMat.clone(), 128);
  ballsIM.frustumCulled = false;
  boardG.add(ballsIM);

  // ---------- 尘埃 ----------
  const dustN = qual >= 2 ? 240 : 110;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustN * 3);
  const dustVel = [];
  for (let i = 0; i < dustN; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 4.0;
    dustPos[i * 3 + 1] = Math.random() * 3.4;
    dustPos[i * 3 + 2] = -0.6 + Math.random() * 2.6;
    dustVel.push([(Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.014, (Math.random() - 0.5) * 0.02]);
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    size: 0.015, sizeAttenuation: true, transparent: true, opacity: 0.25,
    map: canvasTex(64, 64, (g, w, h) => {
      const r = g.createRadialGradient(32, 32, 2, 32, 32, 30);
      r.addColorStop(0, 'rgba(255,240,210,1)'); r.addColorStop(1, 'rgba(255,240,210,0)');
      g.fillStyle = r; g.fillRect(0, 0, w, h);
    }),
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  scene.add(dust);

  const banknoteRain=createBanknoteRain();
  machineG.updateWorldMatrix(true,true);
  const cabinetBounds=new THREE.Box3().setFromObject(machineG),cabinetCorners=[];
  for(const x of [cabinetBounds.min.x,cabinetBounds.max.x])for(const y of [cabinetBounds.min.y,cabinetBounds.max.y])for(const z of [cabinetBounds.min.z,cabinetBounds.max.z])cabinetCorners.push(new THREE.Vector3(x,y,z));
  function maskBackground(){
   camera.updateMatrixWorld();machineG.updateWorldMatrix(true,false);
   banknoteRain.excludeRect(projectCabinet(cabinetCorners,machineG.matrixWorld,camera,innerWidth,innerHeight),innerWidth,innerHeight);
  }



  // ---------- 后期 ----------
  // 高 DPR 下缓冲本身就是超采样,再叠 4× MSAA 只是白烧一倍填充率
  const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight,
    { samples: profile().samples, type: THREE.HalfFloatType });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.22, 0.35, 1.2);
  roundBloomKernel(bloom);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 1.55, 0);
  controls.enableDamping = true;
  controls.enablePan=false;
  controls.minDistance=1.15;controls.maxDistance=7;
  controls.minAzimuthAngle=-Math.PI/3;controls.maxAzimuthAngle=Math.PI/3;
  controls.minPolarAngle=Math.PI/9;controls.maxPolarAngle=Math.PI*.47;
  controls.enabled = false;
  // 右键留给发射(自由视角下左键要转镜头,发射只能挂右键 / 单击),平移改用中键
  controls.mouseButtons.RIGHT = null;

  let resizeDirty=false,lastWidth=0,lastHeight=0,lastRatio=0;
  function resize() {
    const w = innerWidth, h = innerHeight,ratio=renderer.getPixelRatio();
    if(w===lastWidth&&h===lastHeight&&ratio===lastRatio)return;
    lastWidth=w;lastHeight=h;lastRatio=ratio;
    camera.aspect = w / h;
    camera.fov = fitFov(camera.aspect);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    // composer 必须跟上 renderer 的 DPR:setSize 内部会按 _pixelRatio 放大给 rt 和各 pass,
    // 之前额外调一次 bloom.setSize(CSS px) 会把辉光 mip 链打回半分辨率(方块辉光更大更糊)
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
  }
  resize();   // 初始化时也得走一遍:rt 是按 CSS px 建的,不同步 DPR 的话整个画面会按 1× 渲染再放大
  const requestResize=()=>{resizeDirty=true;};
  function applyPendingResize(){if(resizeDirty){resizeDirty=false;resize();}}
  addEventListener('resize', requestResize);
  addEventListener('orientationchange', () => setTimeout(requestResize, 260));
  if (window.visualViewport) visualViewport.addEventListener('resize', requestResize);

  // 掉帧时逐级降档(手机上先砍分辨率,再砍阴影)
  function setQuality(l) {
    qual = Math.max(0, Math.min(2, l));
    const ratio=profile().pixelRatio;
    if(renderer.getPixelRatio()!==ratio)renderer.setPixelRatio(ratio);
    key.castShadow = qual >= 1;
    renderer.shadowMap.type=qual>=2?THREE.PCFSoftShadowMap:THREE.PCFShadowMap;
    const shadowSize=profile().shadowSize;
    if(key.shadow.mapSize.x!==shadowSize){key.shadow.mapSize.set(shadowSize,shadowSize);key.shadow.map?.dispose();key.shadow.map=null;}
    const samples=profile().samples;
    for(const target of [composer.renderTarget1,composer.renderTarget2])if(target.samples!==samples){target.dispose();target.samples=samples;}
    bloom.strength = qual >= 1 ? 0.22 : 0.15;
    requestResize();
    return qual;
  }

  return {
    THREE, renderer, scene, camera, composer, bloom, controls, banknoteRain, maskBackground,
    machineG, boardG, boardTex,
    pinsIM, pinBase, discGs, wingL, wingR, tulipLampMat, gateRing, gateFlash,
    bowlRefs, pkRingMat, pocketG,
    swampUniforms, bubbleIM, sheen,
    neonMats, bulbIM, bulbN,
    handleG, hKnobG, ballsIM,
    dust, dustGeo, dustVel, dustN,
    alcoveLight, swampLight, key,
    resize, applyPendingResize, setQuality, quality: () => qual, touch: TOUCH,
  };
}
