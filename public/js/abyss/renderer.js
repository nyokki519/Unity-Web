import * as THREE from "../../vendor/three/three.module.js";
import { holesAt, gateAt } from "./config.js";

const W = 1000,
  H = 1600;
const center = (t) => ({ x: t.cx ?? t.x ?? 500, y: t.cy ?? t.y ?? 1000 });
const radius = (t) => t.radius ?? t.r ?? 130;
function environment() {
  const faces = [];
  for (let i = 0; i < 6; i++) {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#adbfc9");
    g.addColorStop(0.32, "#18212b");
    g.addColorStop(0.49, "#f9ffff");
    g.addColorStop(0.55, "#879ca5");
    g.addColorStop(0.65, "#121a22");
    g.addColorStop(1, "#020609");
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
    x.fillStyle = i % 2 ? "#ffffff" : "#b7d5df";
    x.fillRect(26, 12, 18, 220);
    x.fillRect(175, 10, 46, 110);
    faces.push(c);
  }
  const map = new THREE.CubeTexture(faces);
  map.needsUpdate = true;
  return map;
}
function label(text, color = "#8ca8ab", size = 26) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 128;
  const x = c.getContext("2d");
  x.clearRect(0, 0, 1024, 128);
  x.font = `500 ${size * 2}px monospace`;
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillStyle = color;
  x.fillText(text, 512, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function fallback(canvas, board) {
  const ctx = canvas.getContext("2d");
  let width = 0,
    height = 0;
  const view = { zoom: 1, panX: 0, panY: 0 };
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    width = canvas.width = Math.max(
      1,
      Math.round(rect.width * Math.min(devicePixelRatio || 1, 2)),
    );
    height = canvas.height = Math.max(
      1,
      Math.round(rect.height * Math.min(devicePixelRatio || 1, 2)),
    );
  };
  resize();
  return {
    mode: "canvas",
    resize,
    setView(v = {}) {
      for (const k of ["zoom", "panX", "panY"])
        if (Number.isFinite(v[k])) view[k] = v[k];
      view.zoom = Math.max(1, Math.min(4, view.zoom));
    },
    resetView() {
      Object.assign(view, { zoom: 1, panX: 0, panY: 0 });
    },
    dispose() {
      ctx?.clearRect(0, 0, width, height);
    },
    render(game, { camera = "overview" } = {}) {
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#03090e";
      ctx.fillRect(0, 0, width, height);
      const b = camera === "follow" ? (game.balls || []).at(-1) : null,
        z = view.zoom * (b ? 1.7 : 1),
        cx = (b?.renderX ?? 500) - view.panX,
        cy = (b?.renderY ?? 800) - view.panY,
        scale = Math.min(width / W, height / H) * z;
      ctx.setTransform(
        scale,
        0,
        0,
        scale,
        width / 2 - cx * scale,
        height / 2 - cy * scale,
      );
      ctx.fillStyle = "#081319";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#46616a";
      ctx.lineWidth = 8;
      ctx.strokeRect(18, 18, 964, 1564);
      for (const p of board.pins || []) {
        ctx.fillStyle = "#bda56d";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r || 3, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const t of board.trays || []) {
        const c = center(t);
        ctx.fillStyle = "#526471";
        ctx.beginPath();
        ctx.arc(c.x, c.y, radius(t), 0, Math.PI * 2);
        ctx.fill();
        for (const h of holesAt(t, game.elapsed || 0)) {
          ctx.fillStyle = h.win ? "#061f1c" : "#020608";
          ctx.beginPath();
          ctx.arc(c.x + h.x, c.y + h.y, h.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = h.win ? "#65ddbc" : "#c2a15c";
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }
      if (board.gate) {
        const g = gateAt(board.gate, game.elapsed || 0);
        ctx.fillStyle = "#c7ab6c";
        ctx.fillRect(
          g.barX - g.width / 2,
          g.y - g.height / 2,
          g.width,
          g.height,
        );
      }
      for (const b of game.balls || []) {
        ctx.fillStyle = "#e6f6ff";
        ctx.beginPath();
        ctx.arc(b.renderX ?? b.x, b.renderY ?? b.y, b.r || 5.5, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };
}

export function createRenderer(canvas, board) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch {
    return fallback(canvas, board);
  }
  renderer.setClearColor(0x03090e);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(),
    env = environment();
  scene.environment = env;
  const camera = new THREE.OrthographicCamera(-500, 500, 800, -800, 1, 6000);
  camera.position.set(500, -1120, 2500);
  camera.lookAt(500, -800, 0);
  const materials = [];
  const mat = (color, metalness = 0.8, roughness = 0.3, extra = {}) => {
    const m = new THREE.MeshStandardMaterial({
      color,
      metalness,
      roughness,
      ...extra,
    });
    materials.push(m);
    return m;
  };
  const dark = mat(0x0d1c25, 0.85, 0.38),
    edge = mat(0x465b65, 0.95, 0.23),
    brass = mat(0xb59958, 0.9, 0.24),
    chrome = mat(0xf0f8ff, 1, 0.075),
    black = mat(0x010407, 0.3, 0.75),
    floor = mat(0x19313a, 0.85, 0.35),
    glow = mat(0x73dbc7, 0.4, 0.25, {
      emissive: 0x24aa8c,
      emissiveIntensity: 1.4,
    });
  floor.envMapIntensity = 0.12;
  floor.metalness = 0.4;
  floor.roughness = 0.65;
  dark.envMapIntensity = 0.22;
  edge.envMapIntensity = 0.18;
  edge.roughness = 0.38;
  const winning = mat(0xf0c76d, 0.8, 0.2, {
    emissive: 0x8a4d0a,
    emissiveIntensity: 0.65,
  });
  const mesh = (g, m, x, y, z = 0, parent = scene) => {
    const o = new THREE.Mesh(g, m);
    o.position.set(x, -y, z);
    parent.add(o);
    return o;
  };
  const box = (x, y, w, h, d, m, z = 0) =>
    mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z);
  box(500, 800, 1000, 1600, 44, dark, -65);
  box(500, 480, 934, 894, 7, floor, -12);
  // Recessed lower machine bay; bowl cut-outs reveal the deep black collection shaft.
  box(500, 1210, 900, 700, 8, black, -31);
  for (const x of [27, 973]) {
    box(x, 800, 20, 1550, 48, edge, -13);
    box(x + (x < 500 ? 15 : -15), 800, 3, 1490, 4, glow, 12);
  }
  for (const y of [23, 1577]) box(500, y, 950, 18, 50, edge, -14);
  const line = (points, m = brass, r = 3) => {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(p[0], -p[1], p[2] ?? 8)),
    );
    return mesh(
      new THREE.TubeGeometry(
        curve,
        Math.max(8, points.length * 8),
        r,
        8,
        false,
      ),
      m,
      0,
      0,
    );
  };
  // Cabinet edge screws, cast corners and precision turned pin field.
  const screwGeo = new THREE.CylinderGeometry(5, 5, 3, 12);
  screwGeo.rotateX(Math.PI / 2);
  for (const x of [27, 973])
    for (const y of [40, 400, 800, 1200, 1560])
      mesh(screwGeo, chrome, x, y, 15);
  const pins = board.pins || [];
  const pinGeo = new THREE.CylinderGeometry(2.6, 4.2, 14, 10);
  pinGeo.rotateX(Math.PI / 2);
  const pinMesh = new THREE.InstancedMesh(pinGeo, brass, pins.length);
  const pinHead = new THREE.InstancedMesh(
    new THREE.SphereGeometry(3.2, 10, 8),
    chrome,
    pins.length,
  );
  const matrix = new THREE.Matrix4();
  pins.forEach((p, i) => {
    matrix.makeScale((p.r || 5) / 3.2, (p.r || 5) / 3.2, 1);
    matrix.setPosition(p.x, -p.y, 1);
    pinMesh.setMatrixAt(i, matrix);
    matrix.makeScale((p.r || 5) / 3.2, (p.r || 5) / 3.2, 1);
    matrix.setPosition(p.x, -p.y, 9);
    pinHead.setMatrixAt(i, matrix);
  });
  scene.add(pinMesh, pinHead);
  for (const rail of board.rails || []) {
    if (rail.x1 != null)
      line(
        [
          [rail.x1, rail.y1],
          [rail.x2, rail.y2],
        ],
        edge,
        rail.r ?? 4,
      );
    else if (rail.points)
      line(
        rail.points.map((p) => [p.x, p.y]),
        edge,
        rail.r ?? 4,
      );
  }
  line(
    [
      [board.left ?? 45, 130],
      [board.left ?? 45, 920],
    ],
    edge,
    4,
  );
  line(
    [
      [board.right ?? 865, 130],
      [board.right ?? 865, 920],
    ],
    edge,
    4,
  );
  const entry = board.entry;
  if (entry) {
    const l = entry.x - entry.width / 2,
      rr = entry.x + entry.width / 2;
    box(
      ((board.left ?? 45) + l) / 2,
      entry.y + 20,
      l - (board.left ?? 45),
      35,
      20,
      dark,
      -3,
    );
    box(
      (rr + (board.right ?? 865)) / 2,
      entry.y + 20,
      (board.right ?? 865) - rr,
      35,
      20,
      dark,
      -3,
    );
    line(
      [
        [l, entry.y - 6],
        [l, entry.y + 40],
      ],
      brass,
      3,
    );
    line(
      [
        [rr, entry.y - 6],
        [rr, entry.y + 40],
      ],
      brass,
      3,
    );
  }
  line(
    [
      [953, 1480],
      [953, 185],
      [930, 125],
      [875, 90],
      [820, 94],
    ],
    edge,
    5,
  );
  line(
    [
      [905, 1450],
      [905, 960],
    ],
    edge,
    4,
  );
  const launcher = board.launcher || { x: 930, y: 1450 };
  box(launcher.x, launcher.y + 25, 42, 92, 24, dark, 0);
  box(launcher.x, launcher.y + 23, 8, 65, 18, brass, 15);
  mesh(
    new THREE.TorusGeometry(19, 3, 8, 32),
    chrome,
    launcher.x,
    launcher.y - 20,
    12,
  );
  const launchLabel = label("LAUNCH", "#bba56e", 13);
  mesh(
    new THREE.PlaneGeometry(110, 20),
    new THREE.MeshBasicMaterial({ map: launchLabel, transparent: true }),
    875,
    1532,
    10,
  );
  line(
    [
      [360, 977],
      [360, 1515],
      [400, 1540],
      [600, 1540],
      [640, 1515],
      [640, 977],
    ],
    edge,
    3,
  );
  for (let i = 0; i < 3; i++) {
    const y = 1110 + i * 175;
    line(
      [
        [655, y - 35],
        [770, y - 35],
        [785, y],
        [770, y + 35],
        [655, y + 35],
      ],
      dark,
      4,
    );
    const tex = label(
      ["TRANSFER / 01", "TRANSFER / 02", "CORE / FINAL"][i],
      "#668a8c",
      13,
    );
    mesh(
      new THREE.PlaneGeometry(150, 24),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
      735,
      y,
      8,
    );
  }
  const trays = [];
  for (const [i, t] of (board.trays || []).entries()) {
    const c = center(t),
      r = radius(t),
      group = new THREE.Group();
    group.position.set(c.x, -c.y, t.z ?? 0);
    scene.add(group);
    const shape = new THREE.Shape();
    shape.absarc(0, 0, r, 0, Math.PI * 2, false);
    const initial = holesAt(t, 0);
    for (const h of initial) {
      const hole = new THREE.Path();
      hole.absarc(h.x, -h.y, h.r, 0, Math.PI * 2, true);
      shape.holes.push(hole);
    }
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 8,
      bevelEnabled: true,
      bevelSize: 1.1,
      bevelThickness: 1.1,
      bevelSegments: 1,
      curveSegments: 32,
    });
    geometry.translate(0, 0, -8);
    const bowlMaterial = mat(i === 1 ? 0x40565c : 0x344b54, 0.87, 0.32);
    bowlMaterial.envMapIntensity = 0.55;
    mesh(geometry, bowlMaterial, 0, 0, 0, group);
    // Dense radial surface: a smooth spun bowl, with shader apertures through every triangle.
    const vertices = [],
      indices = [],
      radial = 16,
      segments = 64;
    for (let ri = 0; ri <= radial; ri++)
      for (let j = 0; j <= segments; j++) {
        const rr = (r * ri) / radial,
          a = (j / segments) * Math.PI * 2;
        vertices.push(
          Math.cos(a) * rr,
          Math.sin(a) * rr,
          1 + 12 * (rr / r) ** 2,
        );
      }
    for (let ri = 0; ri < radial; ri++)
      for (let j = 0; j < segments; j++) {
        const a = ri * (segments + 1) + j,
          b = a + segments + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    const smooth = new THREE.BufferGeometry();
    smooth.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    smooth.setIndex(indices);
    smooth.computeVertexNormals();
    const smoothMaterial = bowlMaterial.clone();
    smoothMaterial.onBeforeCompile = (shader) => {
      shader.vertexShader =
        "varying vec2 bowlPosition;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nbowlPosition=position.xy;",
      );
      shader.fragmentShader =
        "varying vec2 bowlPosition;\n" + shader.fragmentShader;
      const cut = initial
        .map(
          (h) =>
            `if(distance(bowlPosition,vec2(${h.x.toFixed(6)},${(-h.y).toFixed(6)}))<${h.r.toFixed(6)})discard;`,
        )
        .join("\n");
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <clipping_planes_fragment>",
        "#include <clipping_planes_fragment>\n" + cut,
      );
    };
    smoothMaterial.customProgramCacheKey = () =>
      `bowl-${i}-${initial.map((h) => h.r).join()}`;
    mesh(smooth, smoothMaterial, 0, 0, 0, group);
    // Thin concentric machining grooves preserve the real apertures below.
    const ring = (rr, z, m, tube = 2, parent = scene) =>
      mesh(
        new THREE.TorusGeometry(rr, tube, 8, 64),
        m,
        parent === group ? 0 : c.x,
        parent === group ? 0 : c.y,
        z + (parent === group ? 0 : (t.z ?? 0)),
        parent,
      );
    ring(r + 3, 16, brass, 3);
    ring(r + 8, 5, edge, 5);
    ring(r + 8, 25, edge, 2);
    const housingShape = new THREE.Shape();
    housingShape.absarc(0, 0, r + 11, 0, Math.PI * 2, false);
    const hollow = new THREE.Path();
    hollow.absarc(0, 0, r - 2, 0, Math.PI * 2, true);
    housingShape.holes.push(hollow);
    mesh(
      new THREE.ExtrudeGeometry(housingShape, {
        depth: 24,
        bevelEnabled: false,
        curveSegments: 32,
      }),
      dark,
      c.x,
      c.y,
      (t.z ?? 0) - 27,
    );
    for (const h of initial) {
      const hx = h.x,
        hy = h.y;
      mesh(
        new THREE.TorusGeometry(h.r + 0.8, 1.35, 8, 40),
        h.win ? winning : brass,
        hx,
        hy,
        1 + (12 * (hx * hx + hy * hy)) / (r * r),
        group,
      );
      const shaft = new THREE.CylinderGeometry(h.r, h.r, 22, 32, 1, true);
      shaft.rotateX(Math.PI / 2);
      mesh(shaft, black, hx, hy, -14, group);
    }
    const tx = label(
      `0${i + 1}   /   ${i === 2 ? "JACKPOT CORE" : "ORBITAL CHAMBER"}`,
      "#7e9ba3",
      15,
    );
    mesh(
      new THREE.PlaneGeometry(290, 36),
      new THREE.MeshBasicMaterial({
        map: tx,
        transparent: true,
        depthWrite: false,
      }),
      c.x - 270,
      c.y,
      9,
    );
    trays.push({ t, group, initial });
  }
  const header = label("PROJECT  /  ABYSS", "#c9b887", 23);
  mesh(
    new THREE.PlaneGeometry(440, 55),
    new THREE.MeshBasicMaterial({ map: header, transparent: true }),
    470,
    66,
    15,
  );
  const gate = box(500, 835, 90, 11, 19, brass, 5);
  const heatMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const heat = new THREE.InstancedMesh(
    new THREE.CircleGeometry(1, 12),
    heatMaterial,
    640,
  );
  heat.visible = false;
  scene.add(heat);
  const selection = mesh(
    new THREE.TorusGeometry(14, 2, 8, 40),
    winning,
    0,
    0,
    20,
  );
  selection.visible = false;
  let selected = -1;
  const selectedLabel = mesh(
    new THREE.PlaneGeometry(90, 22),
    new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }),
    0,
    0,
    22,
  );
  selectedLabel.visible = false;
  const ballGeo = new THREE.SphereGeometry(1, 24, 18),
    balls = [],
    shadows = [];
  const steelCanvas = document.createElement("canvas");
  steelCanvas.width = 256;
  steelCanvas.height = 128;
  const steelContext = steelCanvas.getContext("2d");
  steelContext.fillStyle = "#f7fafb";
  steelContext.fillRect(0, 0, 256, 128);
  steelContext.fillStyle = "#89969c";
  steelContext.fillRect(0, 61, 256, 2);
  steelContext.fillStyle = "#bac7cd";
  for (let i = 0; i < 14; i++) steelContext.fillRect(i * 19, 62, 7, 1);
  const steelTexture = new THREE.CanvasTexture(steelCanvas);
  steelTexture.colorSpace = THREE.SRGBColorSpace;
  const ballMaterial = chrome.clone();
  ballMaterial.map = steelTexture;
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 64;
  const sc = shadowCanvas.getContext("2d"),
    sg = sc.createRadialGradient(32, 32, 2, 32, 32, 32);
  sg.addColorStop(0, "rgba(0,0,0,.65)");
  sg.addColorStop(0.45, "rgba(0,0,0,.28)");
  sg.addColorStop(1, "rgba(0,0,0,0)");
  sc.fillStyle = sg;
  sc.fillRect(0, 0, 64, 64);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas),
    shadowMaterial = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
  const shadowGeo = new THREE.PlaneGeometry(1, 1);
  const pinShadows = new THREE.InstancedMesh(
    shadowGeo,
    shadowMaterial,
    pins.length,
  );
  pins.forEach((p, i) => {
    matrix.makeScale(23, 23, 1);
    matrix.setPosition(p.x + 2, -p.y - 3, -7.9);
    pinShadows.setMatrixAt(i, matrix);
  });
  scene.add(pinShadows);
  const tracePool = [],
    traceBlue = new THREE.LineBasicMaterial({
      color: 0x6ba6c2,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
    traceGreen = new THREE.LineBasicMaterial({
      color: 0x68d6b0,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
  const view = { zoom: 1, panX: 0, panY: 0 },
    focus = new THREE.Vector2(500, 800);
  function setView(next = {}) {
    for (const k of ["zoom", "panX", "panY"])
      if (Number.isFinite(next[k])) view[k] = next[k];
    view.zoom = Math.max(1, Math.min(4, view.zoom));
  }
  function resetView() {
    Object.assign(view, { zoom: 1, panX: 0, panY: 0 });
    focus.set(500, 800);
  }

  const light = new THREE.HemisphereLight(0xd9efff, 0x112323, 1.2);
  scene.add(light);
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(0, 200, 1600);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x73b4ce, 0.9);
  fill.position.set(1100, -1000, 600);
  scene.add(fill);
  let lastQuality = "",
    disposed = false,
    autoRatio = Math.min(globalThis.devicePixelRatio || 1, 1.25),
    lastFrameAt = 0,
    frameAverage = 16.7,
    qualitySamples = 0,
    lastJackpots = 0,
    jackpotAt = -Infinity;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width),
      height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    const aspect = width / height,
      viewH = Math.max(1700, 1060 / aspect),
      viewW = viewH * aspect;
    camera.left = -viewW / 2;
    camera.right = viewW / 2;
    camera.top = viewH / 2;
    camera.bottom = -viewH / 2;
    camera.updateProjectionMatrix();
  }
  resize();
  return {
    mode: "webgl",
    resize,
    setView,
    resetView,
    getDiagnostics() {
      return {
        pixelRatio: renderer.getPixelRatio(),
        frameMs: Math.round(frameAverage),
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
      };
    },
    render(
      game,
      {
        quality = "auto",
        reducedMotion = false,
        camera: cameraMode = "overview",
        heatmap = false,
        heatmapMode = "density",
        selectedPin = -1,
        trails = false,
      } = {},
    ) {
      if (disposed) return;
      const frameAt = performance.now();
      if (lastFrameAt) {
        const elapsed = Math.min(500, frameAt - lastFrameAt);
        frameAverage = frameAverage * 0.9 + elapsed * 0.1;
      }
      lastFrameAt = frameAt;
      if (lastQuality !== quality) {
        renderer.setPixelRatio(
          quality === "auto"
            ? autoRatio
            : Math.min(
                globalThis.devicePixelRatio || 1,
                quality === "low" ? 0.75 : 2,
              ),
        );
        resize();
        lastQuality = quality;
        qualitySamples = 0;
      }
      if (quality === "auto" && ++qualitySamples >= 18) {
        qualitySamples = 0;
        const next =
          frameAverage > 38
            ? Math.max(0.6, autoRatio * 0.8)
            : frameAverage < 20
              ? Math.min(globalThis.devicePixelRatio || 1, 1.5, autoRatio * 1.1)
              : autoRatio;
        if (Math.abs(next - autoRatio) > 0.03) {
          autoRatio = next;
          renderer.setPixelRatio(autoRatio);
          resize();
        }
      }

      const time = game.elapsed || 0;
      const selectedPoint = pins[selectedPin];
      selection.visible = selectedLabel.visible = !!selectedPoint;
      if (selectedPoint) {
        selection.position.set(selectedPoint.x, -selectedPoint.y, 21);
        selectedLabel.position.set(selectedPoint.x, -selectedPoint.y - 24, 22);
        if (selected !== selectedPin) {
          selectedLabel.material.map?.dispose();
          selectedLabel.material.map = label(
            `PIN ${selectedPin}`,
            "#f4d58c",
            20,
          );
          selectedLabel.material.needsUpdate = true;
          selected = selectedPin;
        }
      }
      for (const item of trays) {
        const now = holesAt(item.t, time),
          a = item.initial[0],
          b = now[0],
          c = center(item.t);
        if (a && b)
          item.group.rotation.z = -(
            Math.atan2(b.y, b.x) - Math.atan2(a.y, a.x)
          );
      }
      const active = game.balls || [];
      while (balls.length < active.length) {
        const b = new THREE.Mesh(ballGeo, ballMaterial);
        scene.add(b);
        balls.push(b);
        const shadow = new THREE.Mesh(shadowGeo, shadowMaterial);
        scene.add(shadow);
        shadows.push(shadow);
      }
      balls.forEach((o, i) => {
        const b = active[i];
        o.visible = !!b;
        shadows[i].visible = !!b;
        if (b) {
          o.position.set(
            b.renderX ?? b.x,
            -(b.renderY ?? b.y),
            b.renderZ ?? (b.r || 5.5) + 10,
          );
          o.scale.setScalar(b.r || 5.5);
          const previous = o.userData;
          if (previous.id === b.id) {
            o.rotateOnWorldAxis(
              new THREE.Vector3(0, 1, 0),
              (o.position.x - previous.x) / (b.r || 5.5),
            );
            o.rotateOnWorldAxis(
              new THREE.Vector3(1, 0, 0),
              -(o.position.y - previous.y) / (b.r || 5.5),
            );
          }
          Object.assign(previous, {
            id: b.id,
            x: o.position.x,
            y: o.position.y,
          });
          const shadow = shadows[i],
            t = b.zone === "tray" ? board.trays[b.stage - 1] : null;
          shadow.visible = b.zone !== "fall" && b.zone !== "transfer";
          shadow.position.set(
            o.position.x + 2,
            o.position.y - 3,
            t
              ? t.z + 1 + 12 * ((b.x * b.x + b.y * b.y) / (t.radius * t.radius))
              : -7.8,
          );
          shadow.scale.set(22, 22, 1);
        }
      });
      const g = board.gate;
      if (g) {
        const state = gateAt(g, time);
        gate.position.set(state.barX, -g.y, 5);
        gate.scale.set(g.width / 90, g.height / 11, 1);
      }
      heat.visible = !!heatmap;
      if (heatmap) {
        const stats = game.stats || {},
          mode = heatmapMode,
          values =
            mode === "stalled"
              ? stats.stalled || []
              : mode === "pins"
                ? stats.pinHits || []
                : mode === "outflow"
                  ? stats.outflow || []
                  : stats.heatmap || [],
          cols = stats.heatmapCols || 20,
          rows = stats.heatmapRows || 32,
          max = Math.max(1, ...values);
        for (let i = 0; i < 640; i++) {
          const value = values[i] || 0,
            norm = value / max,
            rr = value
              ? (mode === "pins" ? 7 : 4) +
                Math.sqrt(norm) * (mode === "outflow" ? 28 : 22)
              : 0;
          let x = (((i % cols) + 0.5) * W) / cols,
            y = ((Math.floor(i / cols) + 0.5) * H) / rows,
            z = 18;
          if (mode === "pins") {
            x = pins[i]?.x || 0;
            y = pins[i]?.y || 0;
            z = 19;
          } else if (mode === "outflow") {
            x = ((i + 0.5) * W) / 20;
            y = 1560;
            z = 18;
          }
          matrix.makeScale(rr, rr, 1);
          matrix.setPosition(x, -y, z);
          heat.setMatrixAt(i, matrix);
          const color =
            norm < 0.5
              ? new THREE.Color(0x2478ff).lerp(
                  new THREE.Color(0xffd54a),
                  norm * 2,
                )
              : new THREE.Color(0xffd54a).lerp(
                  new THREE.Color(0xff3b2f),
                  (norm - 0.5) * 2,
                );
          heat.setColorAt(i, color);
        }
        heat.instanceMatrix.needsUpdate = true;
        if (heat.instanceColor) heat.instanceColor.needsUpdate = true;
      }
      if ((game.jackpots || 0) > lastJackpots) jackpotAt = time;
      lastJackpots = game.jackpots || 0;
      const pulse = Math.max(0, 1 - (time - jackpotAt) / 1.4);
      winning.emissiveIntensity = 0.65 + (reducedMotion ? 0.5 : 1.5) * pulse;
      glow.emissiveIntensity = 1.4 + 0.5 * pulse;
      const routes = trails
        ? [
            ...(game.traces || [])
              .slice(-32)
              .map((r) => ({ route: r, success: false })),
            ...(game.successRoutes || [])
              .slice(-10)
              .map((r) => ({ route: r, success: true })),
          ]
        : [];
      while (tracePool.length < routes.length) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(new Float32Array(60 * 3), 3).setUsage(
            THREE.DynamicDrawUsage,
          ),
        );
        const line = new THREE.Line(geometry, traceBlue);
        line.frustumCulled = false;
        scene.add(line);
        tracePool.push(line);
      }
      tracePool.forEach((line, i) => {
        const item = routes[i];
        line.visible = !!item;
        if (!item) return;
        const points = (item.route.points || []).slice(-60),
          attribute = line.geometry.attributes.position;
        for (let j = 0; j < points.length; j++) {
          const p = points[j];
          attribute.setXYZ(j, p.x, -p.y, (p.z ?? 12) + 2);
        }
        attribute.needsUpdate = true;
        line.geometry.setDrawRange(0, points.length);
        line.material = item.success ? traceGreen : traceBlue;
      });
      const followed = cameraMode === "follow" ? active.at(-1) : null;
      const tx = (followed?.renderX ?? 500) - view.panX,
        ty = (followed?.renderY ?? 800) - view.panY;
      focus.lerp(new THREE.Vector2(tx, ty), reducedMotion ? 1 : 0.12);
      camera.position.set(focus.x, -focus.y - 320, 2500);
      camera.lookAt(focus.x, -focus.y, 0);
      camera.zoom = view.zoom * (followed ? 1.7 : 1);
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      const geometries = new Set(),
        mats = new Set(),
        textures = new Set();
      scene.traverse((o) => {
        if (o.geometry) geometries.add(o.geometry);
        for (const m of Array.isArray(o.material)
          ? o.material
          : o.material
            ? [o.material]
            : []) {
          mats.add(m);
          if (m.map) textures.add(m.map);
        }
      });
      geometries.add(ballGeo);
      mats.add(ballMaterial);
      mats.add(traceBlue);
      mats.add(traceGreen);
      textures.add(steelTexture);
      geometries.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      env.dispose();
      renderer.dispose();
    },
  };
}
