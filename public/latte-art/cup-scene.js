import * as THREE from '../vendor/three/three.module.js';
import { paintChocolate } from './drawing.js';

const FOAM_RADIUS = 1.332;
const FOAM_HEIGHT = 1.17;
const ART_SIZE = 1024;
const PHOTO_SIZE = 1200;
const DRAW_HANDLE_ANGLE = -1.43;
const PEN_COLORS = { espresso: '#8b4a29', foam: '#f8eee0' };

function canvasOf(size) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  return canvas;
}

function randomFrom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function createSurface() {
  const surface = canvasOf(ART_SIZE);
  const base = canvasOf(ART_SIZE);
  const context = surface.getContext('2d');
  const ground = base.getContext('2d');
  const random = randomFrom(7123);
  const bubbles = Array.from({ length: 2500 }, () => {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random());
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      radius: (0.4 + random() ** 4 * 3.2) / (ART_SIZE / 2),
      highlight: random() > 0.38,
    };
  });
  let baseFill = -1;

  function updateBase(fill) {
    const half = ART_SIZE / 2;
    ground.setTransform(half, 0, 0, half, half, half);
    ground.fillStyle = PEN_COLORS.espresso;
    ground.fillRect(-1, -1, 2, 2);
    const edge = 0.22 + fill * 0.72;
    const espresso = ground.createRadialGradient(-0.16, -0.19, 0.12, 0, 0, 1.06);
    espresso.addColorStop(0, '#a8693f');
    espresso.addColorStop(.78, '#9c5f37');
    espresso.addColorStop(1, '#6d361c');
    ground.fillStyle = espresso;
    ground.fillRect(-1, -1, 2, 2);
    if (fill > 0) {
      const foam = ground.createRadialGradient(-.18, -.2, .04, 0, 0, edge + .055);
      foam.addColorStop(0, '#fffdf4');
      foam.addColorStop(.7, PEN_COLORS.foam);
      foam.addColorStop(.92, '#e5cfb6');
      foam.addColorStop(1, '#dec2a100');
      ground.globalAlpha = Math.min(1, fill * 2.1);
      ground.fillStyle = foam;
      ground.fillRect(-1, -1, 2, 2);
      ground.globalAlpha = 1;
    }
    for (const bubble of bubbles) {
      const insideFoam = fill > 0 && Math.hypot(bubble.x, bubble.y) < edge;
      ground.fillStyle = insideFoam
        ? (bubble.highlight ? '#ffffff8a' : '#8d694525')
        : (bubble.highlight ? '#ebbc7f3c' : '#522d212e');
      ground.beginPath();
      ground.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
      ground.fill();
    }
  }

  return {
    canvas: surface,
    paint(fill, strokes) {
      if (baseFill !== fill) {
        updateBase(fill);
        baseFill = fill;
      }
      context.resetTransform();
      context.drawImage(base, 0, 0);
      const radius = ART_SIZE / 2;
      context.save();
      context.setTransform(radius, 0, 0, radius, radius, radius);
      context.beginPath();
      context.arc(0, 0, 1, 0, Math.PI * 2);
      context.clip();
      paintChocolate(context, strokes);
      context.restore();
    },
  };
}

function walnutTexture() {
  const canvas = canvasOf(512);
  const context = canvas.getContext('2d');
  const image = context.createImageData(512, 512);
  const random = randomFrom(701);
  const bands = Float32Array.from({ length: 512 }, () => random());
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const wave = 5 * Math.sin(x / 58 + y / 49) + 1.5 * Math.sin(x / 19 + y / 33);
      const track = y + wave + 512;
      const row = Math.floor(track) % 512;
      const fraction = track - Math.floor(track);
      const fiber = THREE.MathUtils.lerp(bands[row], bands[(row + 1) % 512], fraction);
      const grain = 12 * fiber + 6 * Math.sin(y / 17 + Math.sin(x / 53)) + 4 * random();
      const offset = (y * 512 + x) * 4;
      image.data[offset] = 84 + grain;
      image.data[offset + 1] = 74 + grain;
      image.data[offset + 2] = 66 + grain;
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3.5, 3.5);
  texture.anisotropy = 4;
  return texture;
}

function windowReflection() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  const room = context.createLinearGradient(0, 0, 0, 128);
  room.addColorStop(0, '#8f8175');
  room.addColorStop(.43, '#6c5747');
  room.addColorStop(.64, '#3d2e24');
  room.addColorStop(1, '#241a14');
  context.fillStyle = room;
  context.fillRect(0, 0, 256, 128);
  context.fillStyle = '#dcd7cf';
  context.fillRect(53, 21, 46, 33);
  context.fillStyle = '#fffaf1';
  context.fillRect(55, 23, 19, 29);
  context.fillRect(77, 23, 20, 29);
  context.fillStyle = '#a48b73';
  context.fillRect(177, 50, 31, 19);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.mapping = THREE.EquirectangularReflectionMapping;
  return map;
}

function lathe(rows, material) {
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(rows.map(([r, y]) => new THREE.Vector2(r, y)), 112), material);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

function buildTableware(scene, foam) {
  const porcelain = new THREE.MeshPhysicalMaterial({
    color: '#eee8de', roughness: .31, clearcoat: .55, clearcoatRoughness: .24,
  });
  const saucer = lathe([
    [0, .04], [.78, .04], [.96, .02], [1.12, .02], [1.38, .035], [1.72, .08],
    [2.02, .16], [2.16, .23], [2.20, .28], [2.20, .31], [2.17, .35], [2.11, .37],
    [2.04, .35], [1.86, .27], [1.65, .2], [1.41, .17], [1.17, .16], [.96, .16],
    [.89, .13], [.82, .12], [0, .12],
  ], porcelain);
  saucer.scale.set(1.045, 1, 1.045);
  saucer.position.set(-.14, 0, .05);
  scene.add(saucer);

  const cup = new THREE.Group();
  const bowl = lathe([
    [0, .15], [.58, .15], [.64, .15], [.69, .17], [.71, .20], [.8, .25], [.93, .32],
    [1.05, .44], [1.16, .57], [1.26, .73], [1.35, .92], [1.41, 1.12], [1.43, 1.28],
    [1.43, 1.34], [1.415, 1.37], [1.39, 1.38], [1.367, 1.36], [1.353, 1.324],
    [1.347, 1.22], [1.30, 1.03], [1.25, .87], [1.15, .69], [1.02, .51],
    [.85, .38], [.68, .33], [0, .33],
  ], porcelain);
  cup.add(bowl);
  const handleRing = new THREE.Mesh(new THREE.TorusGeometry(.37, .105, 14, 56), porcelain);
  handleRing.scale.set(1.12, .82, 1.24);
  handleRing.position.set(1.72, .88, 0);
  handleRing.castShadow = handleRing.receiveShadow = true;
  const handle = new THREE.Group();
  handle.add(handleRing);
  cup.add(handle);
  const foamTexture = new THREE.CanvasTexture(foam.canvas);
  foamTexture.colorSpace = THREE.SRGBColorSpace;
  foamTexture.anisotropy = 4;
  // A horizontal disk shares its plane and local orientation with the input ray.
  const disk = new THREE.Mesh(new THREE.CircleGeometry(FOAM_RADIUS, 120), new THREE.MeshPhysicalMaterial({
    map: foamTexture, color: '#ffffff', roughness: .67, clearcoat: .05,
  }));
  disk.rotation.x = -Math.PI / 2;
  disk.position.y = FOAM_HEIGHT;
  disk.receiveShadow = true;
  cup.add(disk);
  scene.add(cup);
  return { foamTexture, handle };
}

function buildSpoon(scene) {
  const spoon = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: '#d5ccc0', metalness: .45, roughness: .26,
  });
  // Hollow, shallow spoon bowl. It is on the saucer only at service.
  const bowl = lathe([
    [0, .035], [.1, .034], [.195, .043], [.255, .067], [.283, .095],
    [.285, .105], [.273, .114], [.252, .107], [.195, .079], [.1, .055], [0, .046],
  ], material);
  bowl.scale.x = 1.6;
  bowl.position.x = -.61;
  spoon.add(bowl);
  const handle = new THREE.Mesh(new THREE.CapsuleGeometry(.07, 1.34, 8, 24), material);
  handle.rotateZ(Math.PI / 2);
  handle.scale.set(1, 1, .66);
  handle.position.set(.40, .082, 0);
  handle.castShadow = true;
  spoon.add(handle);
  spoon.position.set(-.07, .25, 1.54);
  spoon.rotation.y = -.06;
  spoon.visible = false;
  scene.add(spoon);
  return spoon;
}

export function createCupScene(mainCanvas, fallbackCanvas, foam) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: mainCanvas, antialias: true, powerPreference: 'low-power' });
  } catch {
    return createCanvasFallback(mainCanvas, fallbackCanvas, foam);
  }
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#554a40');
  scene.environment = windowReflection();
  scene.environmentIntensity = .38;
  scene.environmentRotation.y = .32;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const atmosphere = new THREE.HemisphereLight('#fff5e8', '#655345', 1.91);
  const windowLight = new THREE.DirectionalLight('#fff8f1', 3.1);
  windowLight.position.set(-5, 8, -3.4);
  windowLight.castShadow = true;
  windowLight.shadow.mapSize.set(1024, 1024);
  Object.assign(windowLight.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 16 });
  windowLight.shadow.normalBias = .018;
  windowLight.shadow.bias = -.0002;
  windowLight.shadow.intensity = .66;
  scene.add(atmosphere, windowLight);

  const table = new THREE.Mesh(new THREE.PlaneGeometry(55, 55), new THREE.MeshStandardMaterial({
    map: walnutTexture(), color: '#d8d0c7', roughness: .84,
  }));
  table.rotation.x = -Math.PI / 2;
  table.receiveShadow = true;
  scene.add(table);
  const { foamTexture, handle } = buildTableware(scene, foam);
  const spoon = buildSpoon(scene);
  const { pitcher, spout } = buildPitcher(scene);
  const stream = new THREE.Mesh(
    new THREE.CylinderGeometry(.021, .038, 1, 16),
    new THREE.MeshStandardMaterial({ color: '#fff6de', roughness: .24 }),
  );
  stream.visible = false;
  scene.add(stream);
  const streamStart = new THREE.Vector3();
  const streamEnd = new THREE.Vector3();
  const streamAxis = new THREE.Vector3();
  const vertical = new THREE.Vector3(0, 1, 0);
  let pourAim = { x: 0, y: 0 };
  const camera = new THREE.PerspectiveCamera(28, 1, .1, 80);
  const target = new THREE.Vector3();
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -FOAM_HEIGHT);
  const hit = new THREE.Vector3();
  const coords = new THREE.Vector2();
  const drawingMode = window.matchMedia('(prefers-reduced-motion: reduce)');
  let mode = 'draw';
  let pending = 0;
  let pendingArtwork = null;
  let animating = false;

  function placeCamera(camera, view, aspect) {
    const tall = aspect < .75;
    const served = view === 'serve' || view === 'photo';
    const elevation = THREE.MathUtils.degToRad(served ? 73 : tall ? 66 : 57);
    const dist = view === 'photo' ? 10.9 : tall ? (served ? 12.2 : 17.4) * Math.max(.9, .462 / aspect) : served ? 10.6 : 11.25;
    target.set(tall ? .02 : .18, served ? .67 : .69, tall && !served ? .22 : .08);
    camera.aspect = aspect;
    const { clientWidth: width, clientHeight: height } = mainCanvas;
    if (tall && !served && width && height) {
      camera.setViewOffset(width, height, -width * .083, height * .097, width, height);
    } else {
      camera.clearViewOffset();
    }
    camera.position.set(0, target.y + dist * Math.sin(elevation), target.z + dist * Math.cos(elevation));
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
  }

  function paintPendingArtwork() {
    if (!pendingArtwork) return;
    foam.paint(pendingArtwork.fill, pendingArtwork.strokes);
    pendingArtwork = null;
    foamTexture.needsUpdate = true;
  }

  function drawFrame() {
    paintPendingArtwork();
    renderer.render(scene, camera);
  }

  function invalidate() {
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = 0;
      drawFrame();
    });
  }

  function resize() {
    const { width, height } = mainCanvas.getBoundingClientRect();
    if (!width || !height) return;
    animating = false;
    handle.rotation.y = mode === 'serve' ? 0 : DRAW_HANDLE_ANGLE;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    renderer.setSize(width, height, false);
    placeCamera(camera, mode, width / height);
    invalidate();
  }
  new ResizeObserver(resize).observe(mainCanvas);
  mainCanvas.addEventListener('webglcontextrestored', resize);

  function setMode(next, animate = false) {
    mode = next;
    pitcher.visible = next === 'pour';
    spoon.visible = next === 'serve';
    if (next !== 'pour') stream.visible = false;
    const { width, height } = mainCanvas.getBoundingClientRect();
    const handleAngle = next === 'serve' ? 0 : DRAW_HANDLE_ANGLE;
    if (animate && !drawingMode.matches) {
      const from = camera.clone();
      const to = camera.clone();
      placeCamera(to, next, width / height);
      const start = performance.now();
      const fromAngle = handle.rotation.y;
      animating = true;
      function move(now) {
        if (!animating || mode !== next) return;
        const t = Math.min(1, (now - start) / 680);
        const ease = t * t * (3 - 2 * t);
        camera.position.lerpVectors(from.position, to.position, ease);
        camera.quaternion.slerpQuaternions(from.quaternion, to.quaternion, ease);
        if (t < 1 && from.view?.enabled) {
          camera.setViewOffset(width, height, from.view.offsetX * (1 - ease), from.view.offsetY * (1 - ease), width, height);
        } else if (camera.view?.enabled) {
          camera.clearViewOffset();
        }
        handle.rotation.y = THREE.MathUtils.lerp(fromAngle, handleAngle, ease);
        camera.updateMatrixWorld(true);
        drawFrame();
        if (t < 1) requestAnimationFrame(move);
        else animating = false;
      }
      requestAnimationFrame(move);
    } else {
      animating = false;
      handle.rotation.y = handleAngle;
      resize();
    }
  }

  function sample(event) {
    const rect = mainCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    coords.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    ray.setFromCamera(coords, camera);
    if (!ray.ray.intersectPlane(plane, hit)) return null;
    return { x: hit.x / FOAM_RADIUS, y: hit.z / FOAM_RADIUS };
  }

  function photo() {
    // Capture the actual cup with the same textured surface. Nothing in the HTML is composited.
    paintPendingArtwork();
    const picture = canvasOf(PHOTO_SIZE);
    const framing = new THREE.PerspectiveCamera(28, 1, .1, 80);
    placeCamera(framing, 'photo', 1);
    const oldSize = renderer.getSize(new THREE.Vector2());
    const oldRatio = renderer.getPixelRatio();
    const angle = handle.rotation.y;
    const hadSpoon = spoon.visible;
    try {
      renderer.setPixelRatio(1);
      renderer.setSize(PHOTO_SIZE, PHOTO_SIZE, false);
      handle.rotation.y = 0;
      spoon.visible = true;
      renderer.render(scene, framing);
      picture.getContext('2d').drawImage(mainCanvas, 0, 0);
    } finally {
      handle.rotation.y = angle;
      spoon.visible = hadSpoon;
      renderer.setPixelRatio(oldRatio);
      renderer.setSize(oldSize.x, oldSize.y, false);
      invalidate();
    }
    return picture;
  }

  resize();
  return {
    input: mainCanvas,
    sample, setMode, resize, photo,
    setArtwork(fill, strokes) {
      pendingArtwork = { fill, strokes };
      invalidate();
    },
    setPour(fill, position = pourAim) {
      const length = Math.max(1, Math.hypot(position.x, position.y));
      pourAim = { x: position.x / length, y: position.y / length };
      pitcher.rotation.z = .08 + fill * .62;
      pitcher.position.x = 1.8 + pourAim.x * .38;
      pitcher.position.z = -.48 + pourAim.y * .5;
      stream.visible = mode === 'pour' && fill > .02;
      if (stream.visible) {
        spout.getWorldPosition(streamStart);
        streamEnd.set(pourAim.x * FOAM_RADIUS, FOAM_HEIGHT, pourAim.y * FOAM_RADIUS);
        streamAxis.subVectors(streamStart, streamEnd);
        stream.position.copy(streamStart).lerp(streamEnd, .5);
        stream.scale.y = streamAxis.length();
        stream.quaternion.setFromUnitVectors(vertical, streamAxis.normalize());
      }
      invalidate();
    },
  };
}

function buildPitcher(scene) {
  const pivot = new THREE.Group();
  pivot.position.set(1.9, 1.43, -.5);
  const steel = new THREE.MeshStandardMaterial({ color: '#bdb9b0', metalness: .58, roughness: .29 });
  const pitcher = lathe([
    [0, 0], [.51, 0], [.58, .07], [.60, .22], [.54, .72], [.47, 1.13],
    [.45, 1.18], [.43, 1.16], [.47, .65], [.52, .2], [0, .10],
  ], steel);
  pivot.add(pitcher);
  const milk = new THREE.Mesh(new THREE.CircleGeometry(.46, 56), new THREE.MeshStandardMaterial({ color: '#f6eee1' }));
  milk.rotation.x = -Math.PI / 2;
  milk.position.y = .92;
  pivot.add(milk);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(.35, .052, 10, 30), steel);
  handle.position.set(.58, .55, 0);
  handle.scale.y = 1.22;
  pivot.add(handle);
  const spout = new THREE.Object3D();
  spout.position.set(-.59, 1.1, 0);
  pivot.add(spout);
  const lip = new THREE.Mesh(new THREE.ConeGeometry(.16, .33, 20), steel);
  lip.rotation.z = Math.PI / 2;
  lip.position.set(-.49, 1.085, 0);
  pivot.add(lip);
  scene.add(pivot);
  return { pitcher: pivot, spout };
}

function createCanvasFallback(mainCanvas, canvas, foam) {
  mainCanvas.hidden = true;
  canvas.hidden = false;
  const context = canvas.getContext('2d');
  let mode = 'draw';
  let width = 1;
  let height = 1;
  let ratio = 1;
  function layout(w, h, view) {
    return {
      x: w * .5,
      y: h * (view === 'photo' ? .49 : .47),
      r: Math.min(w * (view === 'photo' ? .315 : .34), h * .31),
    };
  }
  function paint(ctx, w, h, view) {
    const { x, y, r } = layout(w, h, view);
    const backdrop = ctx.createLinearGradient(0, 0, w, h);
    backdrop.addColorStop(0, '#b2a18e');
    backdrop.addColorStop(1, '#574437');
    ctx.fillStyle = backdrop;
    ctx.fillRect(0, 0, w, h);
    function ellipse(rx, ry, color, offsetY = 0) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x, y + offsetY, r * rx, r * ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.shadowColor = '#1c130aa0';
    ctx.shadowBlur = r * .20;
    ctx.shadowOffsetX = r * .08;
    ctx.shadowOffsetY = r * .16;
    ellipse(1.50, 1.28, '#e8e3da', .13 * r);
    ctx.restore();
    ctx.strokeStyle = '#ded8cd';
    ctx.lineWidth = r * .15;
    ctx.beginPath();
    ctx.ellipse(x + r * 1.09, y + r * .09, r * .31, r * .20, 0, 0, Math.PI * 2);
    ctx.stroke();
    ellipse(1.05, .94, '#bdb4a5', r * .08);
    ellipse(1.055, .934, '#fff7e9');
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * .88, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(foam.canvas, x - r, y - r * .88, r * 2, r * 1.76);
    ctx.restore();
  }
  function draw() {
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    paint(context, width, height, mode);
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    ratio = Math.min(devicePixelRatio || 1, 1.75);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    draw();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();
  return {
    input: canvas,
    setArtwork(fill, strokes) { foam.paint(fill, strokes); draw(); },
    resize,
    setMode(next) { mode = next; draw(); },
    setPour() {},
    sample(event) {
      const rect = canvas.getBoundingClientRect();
      const { x, y, r } = layout(width, height, mode);
      return { x: (event.clientX - rect.left - x) / r, y: (event.clientY - rect.top - y) / (r * .88) };
    },
    photo() {
      const picture = canvasOf(PHOTO_SIZE);
      paint(picture.getContext('2d'), PHOTO_SIZE, PHOTO_SIZE, 'photo');
      return picture;
    },
  };
}
