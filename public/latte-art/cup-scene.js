import { POURING_PITCHER_SCALE } from './pour-jet.js';
import * as THREE from '../vendor/three/three.module.js';
import {
  createChocolatePen, createHandleGeometry, createMilkStreamGeometry, createSpoonBowlGeometry, createSpoonStemGeometry,
  PITCHER_LIP, pourJetPose, shapePitcherSpout, updateMilkStream,
} from './cup-model.js';
import { createCanvasFallback } from './fallback-cup.js';
import { CUP_OUTER_WALL, CUP_PROFILE, drawingFoamClips, FOAM_PLANE, tableCameraFraming, visibleFoamClips } from './foam-geometry.js';
import { projectInkPlane } from './ink-overlay.js';
import { createPitcherLiquid } from './pitcher-liquid.js';
import { MILK_CAPACITY } from './milk-pour.js';
import { canvasOf, PHOTO_SIZE } from './surface.js';
import { createWalnutImages } from './walnut.js';
import { HANDLE_ANGLE, SAUCER_PROFILE, SPOON_REST, saucerHeightAt } from './tableware-profile.js';
import { ceramicGlaze, paintCafeMark } from './cafe-ware.js';

const { radius: FOAM_RADIUS, height: FOAM_HEIGHT } = FOAM_PLANE;
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

function windowLightMask() {
  const canvas = canvasOf(128);
  const context = canvas.getContext('2d');
  context.fillStyle = '#9e9e9e';
  context.fillRect(0, 0, 128, 128);
  context.translate(64, 64);
  context.rotate(-.15);
  context.filter = 'blur(4px)';
  context.fillStyle = '#fff';
  for (const x of [-43, 2]) {
    context.fillRect(x, -53, 40, 44);
    context.fillRect(x, -4, 40, 54);
  }
  const map = new THREE.CanvasTexture(canvas);
  return map;
}

function lathe(rows, material, rimY = Infinity, rimRadius = 0, interiorStart = rows.length) {
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(rows.map(([r, y]) => new THREE.Vector2(r, y)), 144), material);
  if (material.vertexColors) {
    const glaze = new THREE.Color('#ffffff');
    const toasted = new THREE.Color('#d7cdbb');
    const shadedGlaze = new THREE.Color('#968a7d');
    const color = new THREE.Color();
    const positions = mesh.geometry.attributes.position;
    const values = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i++) {
      const row = i % rows.length;
      const [radius, height] = rows[row];
      const warmth = THREE.MathUtils.smoothstep(height, rimY - .045, rimY + .005)
        * THREE.MathUtils.smoothstep(radius, rimRadius - .045, rimRadius + .010);
      color.copy(glaze).lerp(toasted, warmth * (interiorStart === rows.length ? .60 : .36));
      if (row >= interiorStart) {
        const depth = 1 - THREE.MathUtils.smoothstep(height, FOAM_HEIGHT - .03, 1.26);
        color.lerp(shadedGlaze, depth * .48);
      }
      color.toArray(values, i * 3);
    }
    mesh.geometry.setAttribute('color', new THREE.BufferAttribute(values, 3));
  }
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

function stampedMaterial(withWord = false) {
  const stamp = canvasOf(256);
  const context = stamp.getContext('2d');
  paintCafeMark(context, withWord ? 57 : 8, 7, withWord ? 142 : 240, '#5f3824');
  if (withWord) {
    context.textAlign = 'center';
    context.font = '63px Georgia, serif';
    context.fillStyle = '#5f3824';
    context.fillText('Unity', 128, 212);
  }
  const map = new THREE.CanvasTexture(stamp);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return new THREE.MeshPhysicalMaterial({
    map, transparent: true, depthWrite: false, roughness: .50, clearcoat: .24,
  });
}

function buildCupMark() {
  const geometry = new THREE.PlaneGeometry(1, 1, 24, 16);
  const vertices = geometry.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const height = .92 + (vertices.getY(i) + .5) * .28;
    const start = CUP_PROFILE.findIndex(([, y]) => y >= height);
    const [previousRadius, previousHeight] = CUP_PROFILE[start - 1];
    const [nextRadius, nextHeight] = CUP_PROFILE[start];
    const radius = THREE.MathUtils.lerp(previousRadius, nextRadius,
      (height - previousHeight) / (nextHeight - previousHeight)) + .004;
    const angle = .47 + vertices.getX(i) * .30;
    vertices.setXYZ(i, Math.sin(angle) * radius, height, Math.cos(angle) * radius);
  }
  geometry.computeVertexNormals();
  const logo = new THREE.Mesh(geometry, stampedMaterial());
  logo.receiveShadow = true;
  return logo;
}

function buildSaucerMark() {
  const geometry = new THREE.PlaneGeometry(.64, .64, 12, 12);
  geometry.rotateX(-Math.PI / 2);
  const vertices = geometry.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i) - 1.20;
    const z = vertices.getZ(i) + 1.10;
    vertices.setXYZ(i, x, saucerHeightAt(Math.hypot(x, z)) + .003, z);
  }
  geometry.computeVertexNormals();
  const logo = new THREE.Mesh(geometry, stampedMaterial(true));
  logo.receiveShadow = true;
  return logo;
}

function buildTableware(scene, foam) {
  const map = new THREE.CanvasTexture(ceramicGlaze());
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const porcelain = new THREE.MeshPhysicalMaterial({
    color: '#f5f2e9', map, roughness: .28, clearcoat: .65, clearcoatRoughness: .17,
  });
  const rimmedGlaze = porcelain.clone();
  rimmedGlaze.vertexColors = true;
  const saucer = lathe(SAUCER_PROFILE, rimmedGlaze, .267, 2.08);
  // Diffuse contact shading around the recessed seat softens the cup's
  // connection to the saucer, including the side away from the key light.
  const colors = saucer.geometry.getAttribute('color');
  const vertices = saucer.geometry.getAttribute('position');
  for (let i = 0; i < vertices.count; i++) {
    const radius = Math.hypot(vertices.getX(i), vertices.getZ(i));
    const light = .72 + .28 * THREE.MathUtils.smoothstep(radius, .65, 1.62);
    colors.setXYZ(i, colors.getX(i) * light, colors.getY(i) * light, colors.getZ(i) * light);
  }
  saucer.add(buildSaucerMark());
  scene.add(saucer);

  const cup = new THREE.Group();
  const bowl = lathe(CUP_PROFILE, rimmedGlaze, 1.25, 1.35, CUP_OUTER_WALL.length);
  cup.add(bowl, buildCupMark());
  const handleRing = new THREE.Mesh(createHandleGeometry(), rimmedGlaze);
  handleRing.castShadow = handleRing.receiveShadow = true;
  handleRing.rotation.y = HANDLE_ANGLE;
  cup.add(handleRing);
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
  return { disk, foamTexture };
}

function buildSpoon(scene) {
  const spoon = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: '#e2e5e5', metalness: .86, roughness: .19, envMapIntensity: 1.38,
  });
  // A rolled edge and a shallow concavity catch separate reflections.
  const bowl = new THREE.Mesh(createSpoonBowlGeometry(), material);
  bowl.castShadow = bowl.receiveShadow = true;
  spoon.add(bowl);
  const handle = new THREE.Mesh(createSpoonStemGeometry(), material);
  handle.position.set(.24, .085, 0);
  handle.castShadow = handle.receiveShadow = true;
  spoon.add(handle);
  spoon.position.set(SPOON_REST.x, SPOON_REST.y, SPOON_REST.z);
  spoon.rotation.set(0, SPOON_REST.yaw, SPOON_REST.pitch);
  spoon.scale.setScalar(SPOON_REST.scale);
  scene.add(spoon);
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

  const atmosphere = new THREE.HemisphereLight('#fff7e9', '#675548', 1.38);
  const windowLight = new THREE.DirectionalLight('#fff2e1', 2.8);
  windowLight.position.set(-5, 8, -3.4);
  windowLight.castShadow = true;
  windowLight.shadow.mapSize.set(1024, 1024);
  Object.assign(windowLight.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 16 });
  windowLight.shadow.normalBias = .012;
  windowLight.shadow.bias = -.0002;
  windowLight.shadow.intensity = .66;
  windowLight.shadow.radius = 5.5;
  scene.add(atmosphere, windowLight);
  const pouringLight = windowLight.clone();
  pouringLight.castShadow = false;
  pourScene.add(atmosphere.clone(), pouringLight);

  const wood = walnutTextures();
  const table = new THREE.Mesh(new THREE.PlaneGeometry(55, 55), new THREE.MeshStandardMaterial({
    ...wood, bumpScale: .009, color: '#e0c6b0', roughness: .63,
  }));
  table.rotation.x = -Math.PI / 2;
  table.receiveShadow = true;
  scene.add(table);
  const lamp = new THREE.SpotLight('#ffc180', 76, 16, .65, .88, 2);
  lamp.position.set(-4.6, 4.7, -1.6);
  lamp.target.position.set(-1.7, 0, 1.7);
  lamp.map = windowLightMask();
  scene.add(lamp, lamp.target);
  const { disk, foamTexture } = buildTableware(scene, foam);
  const liveFoam = canvasOf(512);
  const liveFoamContext = liveFoam.getContext('2d');
  const liveFoamTexture = new THREE.CanvasTexture(liveFoam);
  liveFoamTexture.colorSpace = THREE.SRGBColorSpace;
  liveFoamTexture.anisotropy = foamTexture.anisotropy;
  buildSpoon(scene);
  const { pitcher, spout, pitcherMilk } = buildPitcher(pourScene);
  const chocolatePen = createChocolatePen();
  chocolatePen.visible = false;
  scene.add(chocolatePen);
  const stream = new THREE.Mesh(
    createMilkStreamGeometry(),
    new THREE.MeshStandardMaterial({ color: '#f3e9d6', roughness: .36 }),
  );
  stream.visible = false;
  stream.frustumCulled = false;
  pourScene.add(stream);
  const streamStart = new THREE.Vector3();
  const streamEnd = new THREE.Vector3();
  const jetOrigin = new THREE.Vector3();
  const idlePitcher = new THREE.Vector3(.54, 1.52, -1.52);
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
  let surfacePlane = null;
  let foamClips = [];
  let pourClips = [];
  let artworkDirty = false;
  let backdropDirty = true;
  let cameraMotion = null;
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
      disk.visible = false;
      renderer.render(scene, camera);
      disk.visible = true;
      stillCanvas.width = mainCanvas.width;
      stillCanvas.height = mainCanvas.height;
      still.drawImage(mainCanvas, 0, 0);
      if (renderer.getPixelRatio() > LIVE_TOOL_PIXEL_RATIO) {
        const size = renderer.getSize(bufferSize);
        renderer.setDrawingBufferSize(size.x, size.y, LIVE_TOOL_PIXEL_RATIO);
      }
    }
    if (artworkDirty || backdropDirty) foam.paintPourPreview(liquid, pourClips, !drawingMode.matches);
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
    if (pending || cameraMotion || contextUnavailable) return;
    pending = requestAnimationFrame(() => {
      pending = 0;
      drawFrame();
    });
  }

  function updateSurfaceGeometry(width, height) {
    if (!width || !height) return;
    surfacePlane = foam.plane;
    plane.constant = -surfacePlane.height;
    disk.position.y = surfacePlane.height;
    disk.scale.setScalar(surfacePlane.radius / FOAM_RADIUS);
    foamClips = drawingFoamClips(width / height, surfacePlane);
    if (mode === 'pour' || mode === 'draw') {
      artworkDirty = true;
      projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      const layer = mode === 'pour' ? pourCanvas : inkCanvas;
      const size = mode === 'pour' && disk.material.map === liveFoamTexture ? liveFoam.width : foam.canvas.width;
      if (layer.width !== size || layer.height !== size) layer.width = layer.height = size;
      const matrix = projectInkPlane(projection.elements, { width, height }, surfacePlane, layer.width);
      layer.style.transform = `matrix3d(${matrix.join(',')})`;
    }
    if (mode === 'pour') pourClips = visibleFoamClips('pour', width / height, surfacePlane);
  }

  function resize() {
    if (contextUnavailable) return;
    const { width, height } = mainCanvas.getBoundingClientRect();
    if (!width || !height) return;
    cameraMotion = null;
    backdropDirty = true;
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
    updateSurfaceGeometry(width, height);
    invalidate();
  }
  new ResizeObserver(resize).observe(mainCanvas);

  function activateFallback() {
    contextUnavailable = true;
    cameraMotion = null;
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
    if (next !== 'pour') stream.visible = false;
    const { width, height } = mainCanvas.getBoundingClientRect();
    if (animate && !drawingMode.matches) {
      const from = camera.clone();
      const to = camera.clone();
      placeCamera(to, next, width / height);
      const start = performance.now();
      cancelAnimationFrame(pending);
      pending = 0;
      function move(now) {
        if (cameraMotion !== move || mode !== next) return;
        const t = Math.min(1, (now - start) / 680);
        const ease = t * t * (3 - 2 * t);
        camera.position.lerpVectors(from.position, to.position, ease);
        camera.quaternion.slerpQuaternions(from.quaternion, to.quaternion, ease);
        if (t < 1 && from.view?.enabled) {
          camera.setViewOffset(width, height, from.view.offsetX * (1 - ease), from.view.offsetY * (1 - ease), width, height);
        } else if (camera.view?.enabled) {
          camera.clearViewOffset();
        }
        renderer.shadowMap.needsUpdate = true;
        camera.updateMatrixWorld(true);
        drawFrame();
        if (t < 1) requestAnimationFrame(move);
        else cameraMotion = null;
      }
      cameraMotion = move;
      requestAnimationFrame(move);
    } else {
      cameraMotion = null;
      resize();
    }
  }

  function pointRay(event) {
    const rect = mainCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    coords.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    ray.setFromCamera(coords, camera);
    return true;
  }

  function sample(event) {
    if (contextUnavailable) return substitute.sample(event);
    if (!pointRay(event)) return null;
    if (!ray.ray.intersectPlane(plane, hit)) return null;
    return { x: hit.x / surfacePlane.radius, y: hit.z / surfacePlane.radius };
  }

  function hitsPitcher(event) {
    if (contextUnavailable) return substitute.hitsPitcher(event);
    pitcher.updateMatrixWorld(true);
    return pointRay(event) && ray.intersectObject(pitcher, true).length > 0;
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
    const displayTexture = disk.material.map;
    try {
      renderer.setDrawingBufferSize(PHOTO_SIZE, PHOTO_SIZE, 1);
      renderer.toneMappingExposure = .74;
      disk.material.map = foamTexture;
      renderer.render(scene, framing);
      picture.getContext('2d').drawImage(mainCanvas, 0, 0);
    } catch (error) {
      if (!gl.isContextLost()) throw error;
    } finally {
      disk.material.map = displayTexture;
      renderer.toneMappingExposure = originalExposure;
      renderer.setDrawingBufferSize(oldSize.x, oldSize.y, oldRatio);
      backdropDirty = true;
      invalidate();
    }
    if (gl.isContextLost()) return activateFallback().photo();
    return picture;
  }

  function setPour(view, paintNow = false) {
    pourView = view;
    artworkDirty = true;
    if (contextUnavailable) {
      substitute.setPour(view, paintNow);
      return;
    }
    if (mode !== 'pour') return;
    const { position, impact = position, flow, streamHead = 1, streamCut = 0, resting, amount, pitcherOffset } = view;
    const used = amount / MILK_CAPACITY;
    if (surfacePlane !== foam.plane) {
      updateSurfaceGeometry(mainCanvas.clientWidth, mainCanvas.clientHeight);
    }
    const jet = pourJetPose(flow, used, position, surfacePlane);
    const tilt = THREE.MathUtils.lerp(jet.angle, .08, resting);
    const yaw = .47 * (1 - resting);
    pitcher.rotation.set(0, yaw, tilt, 'YXZ');
    pitcher.scale.setScalar(THREE.MathUtils.lerp(POURING_PITCHER_SCALE, 1, resting));
    pitcherMilk.mesh.scale.copy(pitcher.scale);
    pitcherMilk.mesh.rotation.y = yaw;
    pitcher.position.set(0, 0, 0);
    streamEnd.set(position.x * surfacePlane.radius, surfacePlane.height, position.y * surfacePlane.radius);
    spout.getWorldPosition(streamStart);
    pitcher.position.set(streamEnd.x + jet.reach - streamStart.x,
      streamEnd.y + jet.height - streamStart.y, streamEnd.z + jet.depth - streamStart.z).lerp(idlePitcher, resting);
    if (pitcherOffset) {
      pitcher.position.x += pitcherOffset.x * FOAM_RADIUS * resting;
      pitcher.position.z += pitcherOffset.y * FOAM_RADIUS * resting;
    }
    pitcherMilk.update(pitcher, tilt, used, resting);
    stream.visible = flow > .001 && streamHead > streamCut;
    if (stream.visible) {
      if (streamCut) {
        jetOrigin.set(streamEnd.x + jet.reach, streamEnd.y + jet.height, streamEnd.z + jet.depth);
      } else spout.getWorldPosition(jetOrigin);
      streamEnd.set(impact.x * surfacePlane.radius, surfacePlane.height, impact.y * surfacePlane.radius);
      updateMilkStream(stream.geometry, jetOrigin, streamEnd, flow, streamCut, streamHead);
    }
    if (paintNow) {
      cancelAnimationFrame(pending);
      pending = 0;
      drawFrame();
    } else invalidate();
  }

  resize();
  return {
    input: mainCanvas,
    get drawingClips() { return contextUnavailable ? substitute.drawingClips : foamClips; },
    get pouringClips() { return contextUnavailable ? substitute.pouringClips : pourClips; },
    sample, hitsPitcher, setMode, resize, photo,
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
  const steel = new THREE.MeshPhysicalMaterial({
    color: '#c9c2b7', metalness: .84, roughness: .26,
    anisotropy: .49, anisotropyRotation: Math.PI / 2, envMapIntensity: 1.46,
  });
  const pitcher = lathe([
    [0, 0], [.51, 0], [.58, .07], [.60, .22], [.54, .72], [.47, 1.13],
    [.45, 1.18], [.43, 1.16], [.47, .65], [.52, .2], [0, .10],
  ], steel);
  pitcher.castShadow = false;
  shapePitcherSpout(pitcher.geometry);
  pivot.add(pitcher);
  const pitcherMilk = createPitcherLiquid();
  const strap = new THREE.Shape();
  strap.moveTo(.43, .91);
  strap.quadraticCurveTo(.95, 1.05, .98, .79);
  strap.quadraticCurveTo(1.01, .33, .67, .26);
  strap.lineTo(.54, .23);
  strap.lineTo(.53, .32);
  strap.quadraticCurveTo(.86, .37, .87, .74);
  strap.quadraticCurveTo(.87, .88, .45, .82);
  strap.closePath();
  const handleGeometry = new THREE.ExtrudeGeometry(strap, {
    depth: .066, bevelEnabled: true, bevelThickness: .018, bevelSize: .012, bevelSegments: 2, curveSegments: 12,
  });
  handleGeometry.translate(0, 0, -.033);
  const handle = new THREE.Mesh(handleGeometry, steel);
  pivot.add(handle);
  const spout = new THREE.Object3D();
  spout.position.set(PITCHER_LIP.x, PITCHER_LIP.y, PITCHER_LIP.z);
  pivot.add(spout);
  scene.add(pivot, pitcherMilk.mesh);
  return { pitcher: pivot, spout, pitcherMilk };
}
