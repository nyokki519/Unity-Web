import * as THREE from '../vendor/three/three.module.js';
import {
  createHandleGeometry, createMilkStreamGeometry, createSpoonStemGeometry, CUP_PROFILE, FOAM_PLANE, PITCHER_LIP,
  shapePitcherSpout, tableCameraFraming, updateMilkStream,
} from './cup-model.js';
import { createCanvasFallback } from './fallback-cup.js';
import { projectInkPlane } from './ink-overlay.js';
import { canvasOf, PHOTO_SIZE } from './surface.js';
import { createWalnutImages } from './walnut.js';

const { radius: FOAM_RADIUS, height: FOAM_HEIGHT } = FOAM_PLANE;
const DRAW_HANDLE_ANGLE = -1.46;

function walnutTextures() {
  const { colorCanvas, reliefCanvas } = createWalnutImages();
  function repeatingTexture(canvas) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3.5, 3.5);
    texture.anisotropy = 4;
    return texture;
  }
  const map = repeatingTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return { map, bumpMap: repeatingTexture(reliefCanvas) };
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
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(rows.map(([r, y]) => new THREE.Vector2(r, y)), 144), material);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

function buildTableware(scene, foam) {
  const porcelain = new THREE.MeshPhysicalMaterial({
    color: '#eae7e1', roughness: .30, clearcoat: .83, clearcoatRoughness: .17,
  });
  const saucer = lathe([
    [0, .04], [.78, .04], [.96, .02], [1.12, .02], [1.38, .035], [1.72, .08],
    [2.02, .16], [2.16, .23], [2.20, .28], [2.20, .31], [2.17, .35], [2.11, .37],
    [2.04, .35], [1.86, .27], [1.65, .2], [1.41, .17], [1.17, .16], [.96, .16],
    [.89, .13], [.82, .12], [0, .12],
  ], porcelain);
  saucer.scale.set(1.08, 1, 1.08);
  saucer.position.set(-.20, 0, .19);
  scene.add(saucer);

  const cup = new THREE.Group();
  const bowl = lathe(CUP_PROFILE, porcelain);
  cup.add(bowl);
  const handleRing = new THREE.Mesh(createHandleGeometry(), porcelain);
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
  return { disk, foamTexture, handle };
}

function buildSpoon(scene) {
  const spoon = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: '#dfdedb', metalness: .89, roughness: .22,
  });
  // Hollow, shallow spoon bowl. It is on the saucer only at service.
  const bowl = lathe([
    [0, .035], [.1, .034], [.195, .043], [.255, .067], [.283, .095],
    [.285, .105], [.273, .114], [.252, .107], [.195, .079], [.1, .055], [0, .046],
  ], material);
  bowl.scale.x = 1.6;
  bowl.position.x = -.61;
  spoon.add(bowl);
  const handle = new THREE.Mesh(createSpoonStemGeometry(), material);
  handle.position.set(.24, .085, 0);
  handle.castShadow = true;
  spoon.add(handle);
  spoon.position.set(-.07, .25, 1.54);
  spoon.rotation.y = -.06;
  spoon.visible = false;
  scene.add(spoon);
  return spoon;
}

export function createCupScene(mainCanvas, fallbackCanvas, inkCanvas, foam, onReady) {
  const renderer = new THREE.WebGLRenderer({
    canvas: mainCanvas, antialias: true, powerPreference: 'low-power',
  });
  const ink = inkCanvas.getContext('2d');
  inkCanvas.width = inkCanvas.height = foam.canvas.width;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#554a40');
  scene.environment = windowReflection();
  scene.environmentIntensity = .47;
  scene.environmentRotation.y = .32;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;

  const atmosphere = new THREE.HemisphereLight('#fff5e8', '#655345', 1.91);
  const windowLight = new THREE.DirectionalLight('#fff8f1', 3.1);
  windowLight.position.set(-5, 8, -3.4);
  windowLight.castShadow = true;
  windowLight.shadow.mapSize.set(1024, 1024);
  Object.assign(windowLight.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 16 });
  windowLight.shadow.normalBias = .022;
  windowLight.shadow.bias = -.0002;
  windowLight.shadow.intensity = .66;
  windowLight.shadow.radius = 2.5;
  scene.add(atmosphere, windowLight);

  const wood = walnutTextures();
  const table = new THREE.Mesh(new THREE.PlaneGeometry(55, 55), new THREE.MeshStandardMaterial({
    ...wood, bumpScale: .006, color: '#d8d0c7', roughness: .77,
  }));
  table.rotation.x = -Math.PI / 2;
  table.receiveShadow = true;
  scene.add(table);
  const { disk, foamTexture, handle } = buildTableware(scene, foam);
  const liveFoam = canvasOf(512);
  const liveFoamContext = liveFoam.getContext('2d');
  const liveFoamTexture = new THREE.CanvasTexture(liveFoam);
  liveFoamTexture.colorSpace = THREE.SRGBColorSpace;
  liveFoamTexture.anisotropy = foamTexture.anisotropy;
  const spoon = buildSpoon(scene);
  const { pitcher, spout } = buildPitcher(scene);
  const stream = new THREE.Mesh(
    createMilkStreamGeometry(),
    new THREE.MeshStandardMaterial({ color: '#fff6de', roughness: .24 }),
  );
  stream.visible = false;
  stream.frustumCulled = false;
  scene.add(stream);
  const streamStart = new THREE.Vector3();
  const streamEnd = new THREE.Vector3();
  let pourAim = { x: 0, y: 0 };
  const camera = new THREE.PerspectiveCamera(28, 1, .1, 80);
  const target = new THREE.Vector3();
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -FOAM_HEIGHT);
  const hit = new THREE.Vector3();
  const coords = new THREE.Vector2();
  const bufferSize = new THREE.Vector2();
  const projection = new THREE.Matrix4();
  const drawingMode = window.matchMedia('(prefers-reduced-motion: reduce)');
  let mode = 'draw';
  let pending = 0;
  let artwork = { fill: 1, strokes: [], active: null };
  let artworkDirty = false;
  let backdropDirty = true;
  let animating = false;
  let contextUnavailable = false;
  let substitute = null;
  let firstFrame = onReady;

  function revealControls() {
    firstFrame?.();
    firstFrame = null;
  }

  function placeCamera(camera, view, aspect) {
    const framing = tableCameraFraming(view, aspect);
    const elevation = THREE.MathUtils.degToRad(framing.elevation);
    const dist = framing.distance;
    target.set(framing.targetX, framing.targetY, framing.targetZ);
    camera.aspect = aspect;
    const { clientWidth: width, clientHeight: height } = mainCanvas;
    if (framing.shiftX && width && height) {
      camera.setViewOffset(width, height, width * framing.shiftX, height * framing.shiftY, width, height);
    } else {
      camera.clearViewOffset();
    }
    camera.position.set(0, target.y + dist * Math.sin(elevation), target.z + dist * Math.cos(elevation));
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
  }

  function paintPendingArtwork() {
    const drawing = mode === 'draw';
    if (!artworkDirty && !(drawing && backdropDirty)) return;
    const { fill, strokes, active } = artwork;
    if (drawing) {
      if (artworkDirty) foam.paintInkPreview(ink, strokes, active);
      if (backdropDirty) foam.paintBlank(fill);
    } else {
      foam.paint(fill, strokes, active, mode === 'pour' ? pourAim : undefined);
    }
    artworkDirty = false;
    if (drawing && !backdropDirty) return;
    if (disk.material.map === liveFoamTexture) {
      liveFoamContext.drawImage(foam.canvas, 0, 0, liveFoam.width, liveFoam.height);
      liveFoamTexture.needsUpdate = true;
    } else {
      foamTexture.needsUpdate = true;
    }
  }

  function drawFrame() {
    if (contextUnavailable) return;
    paintPendingArtwork();
    if (mode === 'draw' && !backdropDirty) return;
    renderer.render(scene, camera);
    backdropDirty = false;
    inkCanvas.hidden = mode !== 'draw';
    if (substitute) fallbackCanvas.hidden = true;
    revealControls();
  }

  function invalidate() {
    if (pending || contextUnavailable) return;
    pending = requestAnimationFrame(() => {
      pending = 0;
      drawFrame();
    });
  }

  function resize() {
    if (contextUnavailable) return;
    const { width, height } = mainCanvas.getBoundingClientRect();
    if (!width || !height) return;
    animating = false;
    backdropDirty = true;
    handle.rotation.y = mode === 'serve' ? 0 : DRAW_HANDLE_ANGLE;
    renderer.shadowMap.needsUpdate = true;
    const ratio = Math.min(devicePixelRatio || 1, 1.75);
    const texture = Math.min(width, height) * ratio <= 740 ? liveFoamTexture : foamTexture;
    if (disk.material.map !== texture) {
      disk.material.map = texture;
      artworkDirty = true;
    }
    renderer.getSize(bufferSize);
    if (bufferSize.x !== width || bufferSize.y !== height || renderer.getPixelRatio() !== ratio) {
      renderer.setDrawingBufferSize(width, height, ratio);
    }
    placeCamera(camera, mode, width / height);
    if (mode === 'draw') {
      projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      const matrix = projectInkPlane(projection.elements, { width, height }, FOAM_PLANE, inkCanvas.width);
      inkCanvas.style.transform = `matrix3d(${matrix.join(',')})`;
    }
    invalidate();
  }
  new ResizeObserver(resize).observe(mainCanvas);

  function activateFallback() {
    contextUnavailable = true;
    animating = false;
    inkCanvas.hidden = true;
    substitute ??= createCanvasFallback(mainCanvas, fallbackCanvas, foam, {
      overlay: true, tableImage: wood.map.image,
    });
    fallbackCanvas.hidden = false;
    substitute.resize();
    substitute.setMode(mode);
    substitute.setPour(artwork.fill, pourAim);
    substitute.setArtwork(artwork.fill, artwork.strokes, artwork.active);
    revealControls();
    return substitute;
  }

  mainCanvas.addEventListener('webglcontextlost', activateFallback);
  mainCanvas.addEventListener('webglcontextrestored', () => {
    contextUnavailable = false;
    artworkDirty = true;
    setMode(mode);
    if (mode === 'pour') setPour(artwork.fill, pourAim);
  });

  function setMode(next, animate = false) {
    mode = next;
    if (contextUnavailable) {
      substitute.setMode(next);
      return;
    }
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
        renderer.shadowMap.needsUpdate = true;
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
    if (contextUnavailable) return substitute.sample(event);
    const rect = mainCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    coords.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    ray.setFromCamera(coords, camera);
    if (!ray.ray.intersectPlane(plane, hit)) return null;
    return { x: hit.x / FOAM_RADIUS, y: hit.z / FOAM_RADIUS };
  }

  function photo() {
    const gl = renderer.getContext();
    if (contextUnavailable || gl.isContextLost()) return activateFallback().photo();
    // Capture the actual cup with the same textured surface. Nothing in the HTML is composited.
    foam.paintPhoto(artwork.fill, artwork.strokes);
    foamTexture.needsUpdate = true;
    artworkDirty = true;
    const picture = canvasOf(PHOTO_SIZE);
    const framing = new THREE.PerspectiveCamera(28, 1, .1, 80);
    placeCamera(framing, 'photo', 1);
    const oldSize = renderer.getSize(new THREE.Vector2());
    const oldRatio = renderer.getPixelRatio();
    const originalExposure = renderer.toneMappingExposure;
    const angle = handle.rotation.y;
    const hadSpoon = spoon.visible;
    const displayTexture = disk.material.map;
    try {
      renderer.setDrawingBufferSize(PHOTO_SIZE, PHOTO_SIZE, 1);
      renderer.toneMappingExposure = .74;
      handle.rotation.y = 0;
      spoon.visible = true;
      disk.material.map = foamTexture;
      renderer.shadowMap.needsUpdate = true;
      renderer.render(scene, framing);
      picture.getContext('2d').drawImage(mainCanvas, 0, 0);
    } catch (error) {
      if (!gl.isContextLost()) throw error;
    } finally {
      handle.rotation.y = angle;
      spoon.visible = hadSpoon;
      disk.material.map = displayTexture;
      renderer.toneMappingExposure = originalExposure;
      renderer.setDrawingBufferSize(oldSize.x, oldSize.y, oldRatio);
      renderer.shadowMap.needsUpdate = true;
      backdropDirty = true;
      invalidate();
    }
    if (gl.isContextLost()) return activateFallback().photo();
    return picture;
  }

  function setPour(fill, position = pourAim, flowing = false) {
    const length = Math.max(1, Math.hypot(position.x, position.y));
    pourAim = { x: position.x / length, y: position.y / length };
    if (contextUnavailable) {
      substitute.setPour(fill, pourAim, flowing);
      return;
    }
    pitcher.rotation.z = .08 + (flowing ? fill * .62 : 0);
    pitcher.position.x = 1.53 + pourAim.x * .30;
    pitcher.position.z = -.48 + pourAim.y * .5;
    stream.visible = mode === 'pour' && flowing && fill > .02;
    if (mode === 'pour') renderer.shadowMap.needsUpdate = true;
    if (stream.visible) {
      spout.getWorldPosition(streamStart);
      streamEnd.set(pourAim.x * FOAM_RADIUS, FOAM_HEIGHT, pourAim.y * FOAM_RADIUS);
      updateMilkStream(stream.geometry, streamStart, streamEnd, fill);
    }
    invalidate();
  }

  resize();
  return {
    input: mainCanvas,
    sample, setMode, resize, photo,
    setArtwork(fill, strokes, active) {
      artwork = { fill, strokes, active };
      artworkDirty = true;
      if (contextUnavailable) substitute.setArtwork(fill, strokes, active);
      else invalidate();
    },
    setPour,
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
  shapePitcherSpout(pitcher.geometry);
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
  spout.position.set(PITCHER_LIP.x, PITCHER_LIP.y, PITCHER_LIP.z);
  pivot.add(spout);
  scene.add(pivot);
  return { pitcher: pivot, spout };
}
