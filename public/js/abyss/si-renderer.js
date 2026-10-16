import {
  createAutoCamera,
  renderPixelRatio,
  transitionWeight,
} from "./presentation.js";
import { bowlHeight } from "./si-geometry.js";
import * as THREE from "../../vendor/three/three.module.js";

const deepest = (balls) =>
  balls.reduce(
    (a, b) =>
      !a ||
      (b.stage || 0) > (a.stage || 0) ||
      ((b.stage || 0) === (a.stage || 0) && b.id > a.id)
        ? b
        : a,
    null,
  );
const vector = (p) => new THREE.Vector3(p?.x || 0, p?.y || 0, p?.z || 0);
function reflection() {
  const faces = Array.from({ length: 6 }, (_, i) => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const x = c.getContext("2d"),
      g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#c4dce5");
    g.addColorStop(0.35, "#14232f");
    g.addColorStop(0.48, "#f5ffff");
    g.addColorStop(0.57, "#526b7b");
    g.addColorStop(1, "#03080e");
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
    x.fillStyle = i % 2 ? "#fff" : "#e6c58c";
    x.fillRect(40, 12, 20, 200);
    return c;
  });
  const t = new THREE.CubeTexture(faces);
  t.needsUpdate = true;
  return t;
}
function geometry(p, board) {
  let g;
  if (p.kind === "mesh") {
    g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(p.vertices), 3),
    );
    if (p.indices)
      g.setIndex(new THREE.BufferAttribute(new Uint32Array(p.indices), 1));
    g.computeVertexNormals();
  } else if (p.kind === "box") {
    const e = p.halfExtents;
    g = new THREE.BoxGeometry(e.x * 2, e.y * 2, e.z * 2);
  } else if (p.kind === "capsule")
    g = new THREE.CapsuleGeometry(p.radius, 2 * (p.halfHeight || 0), 4, 12);
  else g = new THREE.CylinderGeometry(p.radius, p.radius, 2 * p.halfHeight, 24);
  if (p.tag === "bowl" && board) {
    const t = board.trays[Number(p.id.split("-")[1])],
      a = g.attributes.position,
      n = [];
    for (let i = 0; i < a.count; i++) {
      const x = a.getX(i) - t.cx,
        z = a.getZ(i) - t.cz,
        r = Math.hypot(x, z) || 1,
        s =
          (t.depth / t.radius) *
          (t.profile === "curved" ? (2 * r) / t.radius : 1),
        v = new THREE.Vector3(
          (-s * x) / r - t.tilt,
          1,
          (-s * z) / r - (t.tiltZ || 0),
        ).normalize();
      n.push(v.x, v.y, v.z);
    }
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
  }
  return g;
}
function fallback(canvas, board) {
  const ctx = canvas.getContext("2d");
  let w = 1,
    h = 1;
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    w = canvas.width = Math.max(1, r.width);
    h = canvas.height = Math.max(1, r.height);
  };
  resize();
  return {
    mode: "canvas",
    resize,
    setView() {},
    resetView() {},
    dispose() {},
    render(game) {
      ctx.fillStyle = "#07111c";
      ctx.fillRect(0, 0, w, h);
      const scale = Math.min(w / 0.58, h / 0.95),
        ox = (w - 0.5 * scale) / 2,
        oy = h * 0.92;
      const point = (x, y, z) => [
        ox + x * scale,
        oy - y * scale - z * scale * 0.35,
      ];
      ctx.strokeStyle = "#647581";
      ctx.lineWidth = 1;
      for (const p of board.parts || []) {
        if (p.visible === false || p.tag === "glass") continue;
        const g = geometry(p, board);
        const a = g.getAttribute("position");
        const q = new THREE.Quaternion(
            p.rotation?.x || 0,
            p.rotation?.y || 0,
            p.rotation?.z || 0,
            p.rotation?.w ?? 1,
          ),
          pos = vector(p.position);
        const ids = g.index?.array;
        ctx.beginPath();
        for (let i = 0; i < (ids?.length || a.count); i += 3) {
          for (let j = 0; j < 3; j++) {
            const v = new THREE.Vector3()
              .fromBufferAttribute(a, ids ? ids[i + j] : i + j)
              .applyQuaternion(q)
              .add(pos);
            const s = point(v.x, v.y, v.z);
            j ? ctx.lineTo(...s) : ctx.moveTo(...s);
          }
          ctx.closePath();
        }
        ctx.stroke();
        g.dispose();
      }
      for (const b of game.balls || []) {
        const s = point(b.x, b.y, b.z);
        ctx.beginPath();
        ctx.arc(...s, (b.r || 0.0055) * scale, 0, Math.PI * 2);
        ctx.fillStyle = "#edfaff";
        ctx.fill();
      }
      ctx.fillStyle = "#abc0cb";
      ctx.font = "11px monospace";
      ctx.fillText("SI · CANVAS PROJECTION", 12, 20);
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
  renderer.localClippingEnabled = true;
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x071a16);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(38, 1, 0.01, 5),
    overviewCamera = new THREE.PerspectiveCamera(38, 0.625, 0.01, 5),
    env = reflection();
  overviewCamera.position.set(0.25, 1.1, 1.2);
  overviewCamera.lookAt(0.25, 0.4, 0.05);
  scene.environment = env;
  scene.add(new THREE.HemisphereLight(0xd8efff, 0x2d2013, 0.8));
  const key = new THREE.DirectionalLight(0xffe1ac, 3);
  key.position.set(-0.3, 1.2, 1);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xd6f4ff, 1.3);
  fill.position.set(0.6, 0.5, -0.4);
  scene.add(fill);
  const materials = {
    back: new THREE.MeshStandardMaterial({
      color: 0x0d2922,
      metalness: 0.65,
      roughness: 0.4,
    }),
    steel: new THREE.MeshStandardMaterial({
      color: 0x9cb4b4,
      metalness: 0.9,
      roughness: 0.25,
      side: THREE.DoubleSide,
    }),
    brass: new THREE.MeshStandardMaterial({
      color: 0xc5a55d,
      metalness: 0.7,
      roughness: 0.23,
      side: THREE.DoubleSide,
    }),
    dish: new THREE.MeshStandardMaterial({
      color: 0x91a49a,
      metalness: 0.3,
      roughness: 0.3,
      envMapIntensity: 0.45,
      side: THREE.DoubleSide,
    }),
    shaft: new THREE.MeshStandardMaterial({
      color: 0x20372f,
      metalness: 0.3,
      roughness: 0.35,
      side: THREE.DoubleSide,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xc3e8f5,
      transparent: true,
      opacity: 0.055,
      depthWrite: false,
      roughness: 0.1,
      metalness: 0.1,
    }),
    chrome: new THREE.MeshStandardMaterial({
      color: 0xecf6ff,
      metalness: 1,
      roughness: 0.13,
      side: THREE.DoubleSide,
    }),
  };
  const buckets = new Map(),
    resources = [],
    gates = [];
  for (const p of board.parts || []) {
    if (p.visible === false) continue;
    let g = geometry(p, board);
    const mat =
      p.tag === "glass"
        ? "glass"
        : p.tag === "back"
          ? "back"
          : p.tag === "bowl"
            ? "dish"
            : p.tag === "shaft"
              ? "shaft"
              : ["rim", "gate"].includes(p.tag)
                ? "brass"
                : p.tag === "pin"
                  ? "chrome"
                  : "steel";
    if (p.tag === "gate") {
      const m = new THREE.Mesh(g, materials[mat]);
      m.position.copy(vector(p.position));
      if (p.rotation)
        m.quaternion.set(
          p.rotation.x,
          p.rotation.y,
          p.rotation.z,
          p.rotation.w,
        );
      scene.add(m);
      gates.push(m);
      resources.push(g);
      continue;
    }
    const matrix = new THREE.Matrix4().compose(
      vector(p.position),
      new THREE.Quaternion(
        p.rotation?.x || 0,
        p.rotation?.y || 0,
        p.rotation?.z || 0,
        p.rotation?.w ?? 1,
      ),
      new THREE.Vector3(1, 1, 1),
    );
    g.applyMatrix4(matrix);
    if (g.index) {
      const old = g;
      g = g.toNonIndexed();
      old.dispose();
    }
    if (!buckets.has(mat)) buckets.set(mat, []);
    buckets.get(mat).push(g);
  }
  for (const [mat, geos] of buckets) {
    const count = geos.reduce((s, g) => s + g.attributes.position.count, 0),
      positions = new Float32Array(count * 3),
      normals = new Float32Array(count * 3);
    let offset = 0;
    for (const g of geos) {
      positions.set(g.attributes.position.array, offset);
      normals.set(g.attributes.normal.array, offset);
      offset += g.attributes.position.array.length;
      g.dispose();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
    resources.push(g);
    scene.add(new THREE.Mesh(g, materials[mat]));
  }
  // Aperture rings only decorate the actual openings; they do not cover holes.
  const apertureGood = new THREE.MeshStandardMaterial({
      color: 0xffd36d,
      metalness: 0.9,
      roughness: 0.18,
      emissive: 0x47300b,
    }),
    apertureMiss = new THREE.MeshStandardMaterial({
      color: 0x343e3b,
      metalness: 0.8,
      roughness: 0.3,
    });
  for (const t of board.trays || [])
    for (const h of t.holes) {
      const geo = new THREE.TorusGeometry(h.r + 0.0004, 0.0005, 4, 32),
        ring = new THREE.Mesh(geo, h.win ? apertureGood : apertureMiss);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(
        t.cx + h.x,
        bowlHeight(t, h.x, h.z) + 0.0004,
        t.cz + h.z,
      );
      scene.add(ring);
      resources.push(geo);
    }
  const ballMaterial = new THREE.MeshStandardMaterial({
    color: 0xf2ffff,
    metalness: 0.72,
    roughness: 0.18,
    emissive: 0x203f35,
    emissiveIntensity: 0.4,
  });
  const ballGeo = new THREE.SphereGeometry(1, 32, 24);
  resources.push(ballGeo);
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 64;
  const shadowContext = shadowCanvas.getContext("2d"),
    shadowGradient = shadowContext.createRadialGradient(32, 32, 0, 32, 32, 32);
  shadowGradient.addColorStop(0, "rgba(255,255,255,1)");
  shadowGradient.addColorStop(0.35, "rgba(255,255,255,.7)");
  shadowGradient.addColorStop(1, "rgba(255,255,255,0)");
  shadowContext.fillStyle = shadowGradient;
  shadowContext.fillRect(0, 0, 64, 64);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const ballMeshes = new Map(),
    shadows = new Map(),
    shadowGeometry = new THREE.CircleGeometry(1, 24);
  resources.push(shadowGeometry);
  const markerGeo = new THREE.TorusGeometry(0.005, 0.0007, 4, 20),
    markerMat = new THREE.MeshBasicMaterial({
      color: 0x50efdd,
      depthTest: false,
    }),
    marker = new THREE.Mesh(markerGeo, markerMat);
  scene.add(marker);
  resources.push(markerGeo);
  const traceGeo = new THREE.BufferGeometry(),
    traceMat = new THREE.LineBasicMaterial({
      color: 0x62cbd5,
      transparent: true,
      opacity: 0.45,
    }),
    trace = new THREE.LineSegments(traceGeo, traceMat);
  scene.add(trace);
  resources.push(traceGeo);
  const heatGeo = new THREE.SphereGeometry(1, 6, 4),
    heatMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
    heat = new THREE.InstancedMesh(heatGeo, heatMat, 640);
  heat.count = 0;
  scene.add(heat);
  resources.push(heatGeo);
  const view = { zoom: 1, panX: 0, panY: 0 };
  const target = new THREE.Vector3(0.25, 0.4, 0.05),
    eye = new THREE.Vector3(0.25, 1.1, 1.2);
  let initialized = false,
    lastQuality,
    lastFrameTime = 0,
    currentMode = "overview",
    focusedStage = 0;
  const autoCamera = createAutoCamera(),
    lookPoint = target.clone();
  const cut = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1),
    bottomCut = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1);
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    renderer.setPixelRatio(
      renderPixelRatio(
        lastQuality,
        globalThis.devicePixelRatio,
        r.width,
        r.height,
      ),
    );
    renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false);
    camera.aspect = Math.max(1, r.width) / Math.max(1, r.height);
    camera.updateProjectionMatrix();
  };
  resize();
  return {
    mode: "webgl",
    resize,
    setView(v = {}) {
      for (const k of Object.keys(view))
        if (Number.isFinite(v[k])) view[k] = v[k];
      view.zoom = THREE.MathUtils.clamp(view.zoom, 1, 4);
    },
    resetView() {
      Object.assign(view, { zoom: 1, panX: 0, panY: 0 });
      initialized = false;
      autoCamera.reset();
    },
    getViewState() {
      const t = board.trays[focusedStage - 1];
      return {
        mode: currentMode,
        focusedStage,
        zoom: view.zoom,
        pixelRatio: renderer.getPixelRatio(),
        buffer: { width: canvas.width, height: canvas.height },
        cameraDistance: camera.position.distanceTo(lookPoint),
        bounds: t
          ? Array.from({ length: 16 }, (_, i) => {
              const a = (i * Math.PI) / 8,
                v = new THREE.Vector3(
                  t.cx + (t.radius + 0.003) * Math.cos(a),
                  t.cy + 0.025,
                  t.cz + (t.radius + 0.003) * Math.sin(a),
                ).project(camera);
              return { x: v.x, y: v.y };
            })
          : [],
      };
    },
    render(game, opts = {}) {
      if (opts.quality !== lastQuality) {
        lastQuality = opts.quality;
        resize();
      }
      const balls = game.balls || [],
        active = new Set();
      for (const b of balls) {
        active.add(b.id);
        let mesh = ballMeshes.get(b.id);
        if (!mesh) {
          mesh = new THREE.Mesh(ballGeo, ballMaterial);
          scene.add(mesh);
          ballMeshes.set(b.id, mesh);
        }
        mesh.position.set(b.x, b.y, b.z);
        mesh.scale.setScalar(b.r || 0.0055);
        if (b.rotation)
          mesh.quaternion.set(
            b.rotation.x,
            b.rotation.y,
            b.rotation.z,
            b.rotation.w,
          );
      }
      for (const [id, m] of ballMeshes)
        if (!active.has(id)) {
          scene.remove(m);
          ballMeshes.delete(id);
        }
      for (const [id, m] of shadows)
        if (!active.has(id)) {
          scene.remove(m);
          m.material.dispose();
          shadows.delete(id);
        }
      for (const b of balls) {
        let shadow = shadows.get(b.id);
        if (!shadow) {
          shadow = new THREE.Mesh(
            shadowGeometry,
            new THREE.MeshBasicMaterial({
              color: 0x091b17,
              map: shadowTexture,
              transparent: true,
              opacity: 0.2,
              depthWrite: false,
              polygonOffset: true,
              polygonOffsetFactor: -1,
            }),
          );
          scene.add(shadow);
          shadows.set(b.id, shadow);
        }
        const t = board.trays[b.stage - 1];
        shadow.visible = !!t && b.zone === "tray";
        if (!shadow.visible) continue;
        const x = b.x - t.cx,
          z = b.z - t.cz,
          r = Math.hypot(x, z),
          floor = bowlHeight(t, x, z),
          height = Math.max(0, b.y - floor - b.r);
        shadow.visible =
          r < t.radius &&
          !t.holes.some((h) => Math.hypot(x - h.x, z - h.z) < h.r) &&
          height < 0.025;
        if (!shadow.visible) continue;
        const slope =
            (t.depth / t.radius) *
            (t.profile === "curved" ? (2 * r) / t.radius : 1),
          normal = new THREE.Vector3(
            (-slope * x) / (r || 1) - t.tilt,
            1,
            (-slope * z) / (r || 1) - (t.tiltZ || 0),
          ).normalize();
        shadow.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          normal,
        );
        shadow.position.set(b.x, floor + 0.0002, b.z);
        shadow.scale.setScalar(b.r * (1.12 + height * 20));
        shadow.material.opacity = 0.24 * (1 - height / 0.025);
      }

      if (game.gatePose)
        for (const m of gates) {
          m.position.copy(vector(game.gatePose.position));
          const q = game.gatePose.rotation;
          if (q) m.quaternion.set(q.x, q.y, q.z, q.w);
        }
      const mode = autoCamera.choose(game, opts),
        focus = deepest(balls);
      currentMode = mode;
      target.set(0.25, 0.4, 0.05);
      eye.set(0.25, 1.1, 1.2);
      const trayIndex = { cradle1: 0, cradle2: 1, cradle3: 2 }[mode];
      if (trayIndex !== undefined) {
        const t = board.trays?.[trayIndex];
        if (t) {
          target.set(t.cx, t.cy, t.cz);
          target.y -= 0.008;
          const distance =
            (2 * t.radius + 0.022) /
            (2 * Math.tan((38 * Math.PI) / 360) * camera.aspect);
          eye
            .copy(target)
            .add(
              new THREE.Vector3(0, 0.95, 0.3)
                .normalize()
                .multiplyScalar(distance),
            );
        }
      } else if (mode === "follow" && focus) {
        target.set(focus.x, focus.y, focus.z);
        eye.copy(target).add(new THREE.Vector3(0, 0.24, 0.4));
      } else if (mode === "forest") {
        target.set(0.235, 0.53, 0.007);
        eye.set(0.235, 0.59, 0.94);
      } else if (mode === "rail") {
        target.set(0.42, 0.43, 0.03);
        eye.set(0.72, 0.65, 0.8);
      } else if (mode === "gate") {
        const p =
          game.gatePose?.position ||
          board.parts?.find((p) => p.tag === "gate")?.position;
        if (p) {
          target.copy(vector(p));
          eye.copy(target).add(new THREE.Vector3(0.06, 0.18, 0.35));
        }
      }
      const focusedTray =
        trayIndex !== undefined ? board.trays[trayIndex] : null;
      focusedStage = focusedTray?.stage || 0;
      cut.constant = focusedTray ? focusedTray.cy + 0.032 : 2;
      bottomCut.constant = focusedTray
        ? -(focusedTray.cy - focusedTray.depth - 0.035)
        : 2;
      for (const material of [
        ...Object.values(materials),
        ballMaterial,
        apertureGood,
        apertureMiss,
        ...[...shadows.values()].map((s) => s.material),
      ])
        material.clippingPlanes = focusedTray ? [cut, bottomCut] : [];
      if (mode === "free") {
        target.x += view.panX * 0.0005;
        target.y -= view.panY * 0.0005;
        eye.x += view.panX * 0.0005;
        eye.y -= view.panY * 0.0005;
      }
      eye.sub(target).divideScalar(view.zoom).add(target);
      const now = performance.now(),
        dt =
          opts.delta ??
          (lastFrameTime
            ? Math.min(0.1, (now - lastFrameTime) / 1000)
            : 1 / 60);
      lastFrameTime = now;
      const weight =
        !initialized || opts.reducedMotion ? 1 : transitionWeight(dt);
      camera.position.lerp(eye, weight);
      lookPoint.lerp(target, weight);
      camera.lookAt(lookPoint);
      initialized = true;
      const pin = board.pins?.[opts.selectedPin];
      marker.visible = !!pin;
      if (pin) marker.position.set(pin.x, pin.y, pin.z + 0.005);
      const segments = [];
      if (opts.trails) {
        for (const route of [
          ...(game.traces || []).slice(-20),
          ...(game.successRoutes || []).slice(-8),
        ]) {
          const points = Array.isArray(route) ? route : route.points || [];
          for (let i = 1; i < points.length; i++) {
            const a = points[i - 1],
              b = points[i];
            if (Number.isFinite(a.x) && Number.isFinite(b.x))
              segments.push(a.x, a.y, a.z || 0, b.x, b.y, b.z || 0);
          }
        }
      }
      traceGeo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(segments, 3),
      );
      trace.visible = segments.length > 0;
      heat.count = 0;
      if (opts.heatmap) {
        const s = game.stats || {},
          mode = opts.heatmapMode,
          values =
            mode === "pins"
              ? s.pinHits
              : mode === "stalled"
                ? s.stalled
                : mode === "outflow"
                  ? s.outflow
                  : s.heatmap;
        const max = Math.max(1, ...(values || [])),
          matrix = new THREE.Matrix4(),
          color = new THREE.Color();
        for (let i = 0; i < Math.min(640, values?.length || 0); i++) {
          if (!values[i]) continue;
          const pin = board.pins?.[i],
            cols = s.heatmapCols || 20,
            rows = s.heatmapRows || 32,
            n = values[i] / max;
          let x =
              mode === "pins"
                ? pin?.x
                : (((i % cols) + 0.5) * board.width) / cols,
            y =
              mode === "pins"
                ? pin?.y
                : board.height -
                  ((Math.floor(i / cols) + 0.5) * board.height) / rows;
          if (mode === "outflow") {
            x = ((i + 0.5) * board.width) / values.length;
            y = 0.02;
          }
          if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
          matrix.makeScale(
            0.003 + Math.sqrt(n) * 0.009,
            0.003 + Math.sqrt(n) * 0.009,
            0.001,
          );
          matrix.setPosition(x, y, 0.055);
          heat.setMatrixAt(heat.count, matrix);
          color.setHSL((1 - n) * 0.6, 1, 0.55);
          heat.setColorAt(heat.count++, color);
        }
        heat.instanceMatrix.needsUpdate = true;
        if (heat.instanceColor) heat.instanceColor.needsUpdate = true;
      }
      renderer.setViewport(
        0,
        0,
        canvas.width / renderer.getPixelRatio(),
        canvas.height / renderer.getPixelRatio(),
      );
      renderer.setScissorTest(false);
      renderer.render(scene, camera);
      if (focusedTray) {
        const width = canvas.width / renderer.getPixelRatio(),
          height = canvas.height / renderer.getPixelRatio(),
          w = Math.min(88, width * 0.24),
          h = w * 1.6;
        overviewCamera.aspect = w / h;
        overviewCamera.updateProjectionMatrix();
        for (const m of [
          ...Object.values(materials),
          ballMaterial,
          apertureGood,
          apertureMiss,
          ...[...shadows.values()].map((s) => s.material),
        ])
          m.clippingPlanes = [];
        renderer.setViewport(width - w - 10, 10, w, h);
        renderer.setScissor(width - w - 10, 10, w, h);
        renderer.setScissorTest(true);
        renderer.render(scene, overviewCamera);
        renderer.setScissorTest(false);
      }
    },
    dispose() {
      resources.forEach((g) => g.dispose());
      Object.values(materials).forEach((m) => m.dispose());
      ballMaterial.dispose();
      apertureGood.dispose();
      apertureMiss.dispose();
      markerMat.dispose();
      traceMat.dispose();
      heatMat.dispose();
      shadowTexture.dispose();
      env.dispose();
      renderer.dispose();
      ballMeshes.clear();
      for (const s of shadows.values()) s.material.dispose();
      shadows.clear();
    },
  };
}
