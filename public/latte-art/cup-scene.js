import * as THREE from '../vendor/three/three.module.js';
import {
  createChocolatePen, createHandleGeometry, createMilkStreamGeometry, createSpoonStemGeometry,
  PITCHER_LIP, shapePitcherSpout, updateMilkStream,
} from './cup-model.js';
import { createCanvasFallback } from './fallback-cup.js';
import { CUP_PROFILE, drawingFoamClips, FOAM_PLANE, tableCameraFraming, visibleFoamClips } from './foam-geometry.js';
import { projectInkPlane } from './ink-overlay.js';
import { createPitcherLiquid } from './pitcher-liquid.js';
import { MILK_CAPACITY } from './milk-pour.js';
import { canvasOf, PHOTO_SIZE } from './surface.js';
import { createWalnutImages } from './walnut.js';

const { radius: FOAM_RADIUS, height: FOAM_HEIGHT } = FOAM_PLANE;
const DRAW_HANDLE_ANGLE = -1.69;
const LIVE_TOOL_PIXEL_RATIO = .82;

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
  const disk = new THREE.Mesh(new THREE.CircleGeometry(FOAM_RADIUS, 120), new THREE.MeshBasicMaterial({
    map: foamTexture, toneMapped: false,
  }));
  disk.rotation.x = -Math.PI / 2;
  disk.position.y = FOAM_HEIGHT;
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

export function createCupScene(mainCanvas, fallbackCanvas, inkCanvas, stillCanvas, pourCanvas, foam, onReady) {
  const renderer = new THREE.WebGLRenderer({
    canvas: mainCanvas, alpha: true, antialias: true, powerPreference: 'low-power',
  });
  renderer.setClearAlpha(0);
  const ink = inkCanvas.getContext('2d');
  const still = stillCanvas.getContext('2d', { alpha: false });
  const liquid = pourCanvas.getContext('2d');
  inkCanvas.width = inkCanvas.height = foam.canvas.width;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#554a40');
  scene.environment = windowReflection();
  scene.environmentIntensity = .47;
  scene.environmentRotation.y = .32;
  const pourScene = new THREE.Scene();
  pourScene.environment = scene.environment;
  pourScene.environmentIntensity = scene.environmentIntensity;
  pourScene.environmentRotation.copy(scene.environmentRotation);
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
  const pouringLight = windowLight.clone();
  pouringLight.castShadow = false;
  pourScene.add(atmosphere.clone(), pouringLight);

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
  const { pitcher, spout, pitcherMilk } = buildPitcher(pourScene);
  const chocolatePen = createChocolatePen();
  chocolatePen.visible = false;
  scene.add(chocolatePen);
  const stream = new THREE.Mesh(
    createMilkStreamGeometry(),
    new THREE.MeshStandardMaterial({ color: '#fff6de', roughness: .24 }),
  );
  stream.visible = false;
  stream.frustumCulled = false;
  pourScene.add(stream);
  const streamStart = new THREE.Vector3();
  const streamEnd = new THREE.Vector3();
  const idlePitcher = new THREE.Vector3(.73, 1.52, -1.49);
  let pourView = { position: { x: 0, y: 0 }, flow: 0, resting: 1, amount: 0 };
  const camera = new THREE.PerspectiveCamera(28, 1, .1, 80);
  const target = new THREE.Vector3();
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -FOAM_HEIGHT);
  const hit = new THREE.Vector3();
  const coords = new THREE.Vector2();
  const bufferSize = new THREE.Vector2();
  const projection = new THREE.Matrix4();
  const drawingMode = window.matchMedia('(prefers-reduced-motion: reduce)');
  let mode = 'pour';
  let pending = 0;
  let artwork = { strokes: [], active: null };
  let foamClips = [];
  let pourClips = [];
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
    target.set(framing.targetX, framing.targetY, framing.targetZ);
    camera.aspect = aspect;
    const { clientWidth: width, clientHeight: height } = mainCanvas;
    if (framing.shiftX && width && height) {
      camera.setViewOffset(width, height, width * framing.shiftX, height * framing.shiftY, width, height);
    } else {
      camera.clearViewOffset();
    }
    camera.position.set(framing.eye.x, framing.eye.y, framing.eye.z);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
  }

  function uploadSurface() {
    if (disk.material.map === liveFoamTexture) {
      liveFoamContext.drawImage(foam.canvas, 0, 0, liveFoam.width, liveFoam.height);
      liveFoamTexture.needsUpdate = true;
    } else {
      foamTexture.needsUpdate = true;
    }
  }

  function paintPendingArtwork() {
    const drawing = mode === 'draw';
    if (!artworkDirty && !(drawing && backdropDirty)) return;
    const { strokes, active } = artwork;
    if (drawing) {
      if (artworkDirty) foam.paintInkPreview(ink, strokes, active, foamClips);
      if (backdropDirty) foam.paintBlank();
    } else {
      foam.paint(strokes, active);
    }
    artworkDirty = false;
    if (drawing && !backdropDirty) return;
    uploadSurface();
  }

  function drawPouring() {
    if (backdropDirty) {
      foam.paintBlank();
      uploadSurface();
      renderer.render(scene, camera);
      stillCanvas.width = mainCanvas.width;
      stillCanvas.height = mainCanvas.height;
      still.drawImage(mainCanvas, 0, 0);
      if (renderer.getPixelRatio() > LIVE_TOOL_PIXEL_RATIO) {
        const size = renderer.getSize(bufferSize);
        renderer.setDrawingBufferSize(size.x, size.y, LIVE_TOOL_PIXEL_RATIO);
      }
    }
    if (artworkDirty || backdropDirty) foam.paintPourPreview(liquid, pourClips);
    renderer.render(pourScene, camera);
    artworkDirty = false;
    backdropDirty = false;
    stillCanvas.hidden = pourCanvas.hidden = false;
    inkCanvas.hidden = true;
  }

  function discardPourLayers() {
    if (stillCanvas.hidden) return;
    stillCanvas.hidden = pourCanvas.hidden = true;
    stillCanvas.width = stillCanvas.height = pourCanvas.width = pourCanvas.height = 0;
  }

  function drawFrame() {
    if (contextUnavailable) return;
    if (mode === 'pour') {
      drawPouring();
    } else {
      paintPendingArtwork();
      if (mode === 'draw' && !backdropDirty) return;
      renderer.render(scene, camera);
      backdropDirty = false;
      discardPourLayers();
      inkCanvas.hidden = mode !== 'draw';
    }
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
    const compact = Math.min(width, height) * ratio <= 740;
    const texture = compact ? liveFoamTexture : foamTexture;
    if (disk.material.map !== texture) {
      disk.material.map = texture;
      artworkDirty = true;
    }
    renderer.getSize(bufferSize);
    if (bufferSize.x !== width || bufferSize.y !== height || renderer.getPixelRatio() !== ratio) {
      renderer.setDrawingBufferSize(width, height, ratio);
    }
    placeCamera(camera, mode, width / height);
    foamClips = drawingFoamClips(width / height);
    if (mode === 'pour' || mode === 'draw') {
      artworkDirty = true;
      projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      const layer = mode === 'pour' ? pourCanvas : inkCanvas;
      const size = mode === 'pour' && compact ? liveFoam.width : foam.canvas.width;
      if (layer.width !== size || layer.height !== size) layer.width = layer.height = size;
      const matrix = projectInkPlane(projection.elements, { width, height }, FOAM_PLANE, layer.width);
      layer.style.transform = `matrix3d(${matrix.join(',')})`;
    }
    if (mode === 'pour') pourClips = visibleFoamClips('pour', width / height);
    invalidate();
  }
  new ResizeObserver(resize).observe(mainCanvas);

  function activateFallback() {
    contextUnavailable = true;
    animating = false;
    inkCanvas.hidden = true;
    discardPourLayers();
    substitute ??= createCanvasFallback(mainCanvas, fallbackCanvas, foam, {
      overlay: true, tableImage: wood.map.image,
    });
    fallbackCanvas.hidden = false;
    substitute.resize();
    substitute.setMode(mode);
    substitute.setPour(pourView);
    substitute.setArtwork(artwork.strokes, artwork.active);
    revealControls();
    return substitute;
  }

  mainCanvas.addEventListener('webglcontextlost', activateFallback);
  mainCanvas.addEventListener('webglcontextrestored', () => {
    contextUnavailable = false;
    artworkDirty = true;
    setMode(mode);
    if (mode === 'pour') setPour(pourView);
  });

  function setMode(next, animate = false) {
    mode = next;
    if (contextUnavailable) {
      substitute.setMode(next);
      return;
    }
    chocolatePen.visible = next === 'draw';
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
    foam.paintPhoto(artwork.strokes);
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
    const changedPose = angle !== 0 || !hadSpoon;
    try {
      renderer.setDrawingBufferSize(PHOTO_SIZE, PHOTO_SIZE, 1);
      renderer.toneMappingExposure = .74;
      handle.rotation.y = 0;
      spoon.visible = true;
      disk.material.map = foamTexture;
      if (changedPose) renderer.shadowMap.needsUpdate = true;
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
      if (changedPose) renderer.shadowMap.needsUpdate = true;
      backdropDirty = true;
      invalidate();
    }
    if (gl.isContextLost()) return activateFallback().photo();
    return picture;
  }

  function setPour(view) {
    pourView = view;
    if (contextUnavailable) {
      substitute.setPour(view);
      return;
    }
    if (mode !== 'pour') return;
    const { position, flow, resting, amount } = view;
    const used = amount / MILK_CAPACITY;
    const tilt = THREE.MathUtils.lerp(.25 + .40 * used + .27 * flow, .08, resting);
    pitcher.rotation.z = tilt;
    pitcher.position.set(0, 0, 0);
    streamEnd.set(position.x * FOAM_RADIUS, FOAM_HEIGHT, position.y * FOAM_RADIUS);
    spout.getWorldPosition(streamStart);
    pitcher.position.set(streamEnd.x + .11 - streamStart.x,
      streamEnd.y + 1.23 - streamStart.y, streamEnd.z - .31 - streamStart.z).lerp(idlePitcher, resting);
    pitcherMilk.update(pitcher, tilt, used, resting);
    stream.visible = flow > .016;
    if (stream.visible) {
      spout.getWorldPosition(streamStart);
      updateMilkStream(stream.geometry, streamStart, streamEnd, flow);
    }
    invalidate();
  }

  resize();
  return {
    input: mainCanvas,
    get drawingClips() { return contextUnavailable ? substitute.drawingClips : foamClips; },
    sample, setMode, resize, photo,
    setArtwork(strokes, active) {
      artwork = { strokes, active };
      artworkDirty = true;
      if (contextUnavailable) substitute.setArtwork(strokes, active);
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
  pitcher.castShadow = false;
  shapePitcherSpout(pitcher.geometry);
  pivot.add(pitcher);
  const pitcherMilk = createPitcherLiquid();
  const handle = new THREE.Mesh(new THREE.TorusGeometry(.35, .052, 10, 30), steel);
  handle.position.set(.58, .55, 0);
  handle.scale.y = 1.22;
  pivot.add(handle);
  const spout = new THREE.Object3D();
  spout.position.set(PITCHER_LIP.x, PITCHER_LIP.y, PITCHER_LIP.z);
  pivot.add(spout);
  scene.add(pivot, pitcherMilk.mesh);
  return { pitcher: pivot, spout, pitcherMilk };
}
