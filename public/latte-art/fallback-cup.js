import { milkJetRadius, pitcherFill, pourJetPose, sampleFallingMilk } from './pour-jet.js';
import { ceramicGlaze } from './cafe-ware.js';
import { canvasOf, PHOTO_SIZE } from './surface.js';
import { createWalnutImages } from './walnut.js';
import { CUP_OUTER_WALL, CUP_PROFILE, FOAM_PLANE, drawingFoamClips, projectedLiquidEllipse, tableCameraFraming, visibleFoamClips } from './foam-geometry.js';
import { CUP_SEAT_HEIGHT, HANDLE_ANGLE, SAUCER_FOOT_RADIUS, SAUCER_RIM, SPOON_REST, handleCrossSection, handleProfile } from './tableware-profile.js';
import { MILK_CAPACITY } from './milk-pour.js';

// Express the porcelain in liquid-plane radii so it follows the same
// framing as the touch surface. Lower sections recede towards the table.
function tablewareView(view, aspect) {
  const { eye } = tableCameraFraming(view, aspect);
  const distance = Math.hypot(eye.y - FOAM_PLANE.height, eye.z);
  const sine = (eye.y - FOAM_PLANE.height) / distance;
  const cosine = eye.z / distance;
  const foamRadius = FOAM_PLANE.radius;
  function project({ x, y, z }) {
    const belowFoam = FOAM_PLANE.height - y;
    const scale = distance / (distance + belowFoam * sine - z * cosine);
    return { x: x * scale / foamRadius, y: (belowFoam * cosine + z * sine) * scale / foamRadius };
  }
  // The projected center of a circle lies slightly in front of its world center.
  const front = project({ x: 0, y: FOAM_PLANE.height, z: foamRadius });
  const back = project({ x: 0, y: FOAM_PLANE.height, z: -foamRadius });
  const foamCenter = (front.y + back.y) / 2;
  function point(x, y, z) {
    const p = project({ x, y, z });
    return { x: p.x, y: p.y - foamCenter };
  }
  function ring(radius, height) {
    const front = point(0, height, radius), back = point(0, height, -radius);
    const depth = distance + (FOAM_PLANE.height - height) * sine;
    const rx = distance / Math.sqrt(depth ** 2 - (radius * cosine) ** 2) * radius / foamRadius;
    return { rx, ry: (front.y - back.y) / 2, y: (front.y + back.y) / 2 };
  }
  function projectHandle(p) {
    const x = p.x * Math.cos(HANDLE_ANGLE) + p.z * Math.sin(HANDLE_ANGLE);
    const z = -p.x * Math.sin(HANDLE_ANGLE) + p.z * Math.cos(HANDLE_ANGLE);
    return point(x, p.y, z);
  }
  return { ring, point, sine, handleBands: buildHandleBands(projectHandle) };
}

function buildHandleBands(projectHandle) {
  const rings = Array.from({ length: 49 }, (_, i) => {
    const profile = handleProfile(i / 48);
    return { center: projectHandle(profile), depth: projectHandle(handleCrossSection(profile, 0)),
      width: projectHandle(handleCrossSection(profile, Math.PI / 2)) };
  });
  const outlines = rings.map(({ center, depth, width }, i) => {
    const previous = rings[Math.max(0, i - 1)].center;
    const next = rings[Math.min(rings.length - 1, i + 1)].center;
    const dx = next.x - previous.x, dy = next.y - previous.y;
    const length = Math.hypot(dx, dy);
    const nx = -dy / length, ny = dx / length;
    // Project both axes of the oval strap onto the screen-space normal.
    const radius = Math.hypot(nx * (depth.x - center.x) + ny * (depth.y - center.y),
      nx * (width.x - center.x) + ny * (width.y - center.y));
    return { center, dx: nx * radius, dy: ny * radius };
  });
  function band(low, high) {
    const path = new Path2D();
    const point = (ring, side) => [ring.center.x + side * ring.dx, ring.center.y + side * ring.dy];
    path.moveTo(...point(outlines[0], low));
    for (const ring of outlines) path.lineTo(...point(ring, low));
    for (let i = outlines.length - 1; i >= 0; i--) path.lineTo(...point(outlines[i], high));
    path.closePath();
    return path;
  }
  return [band(-1, 1), band(-.78, .91), band(-.72, -.42)];
}

function paintSpoon(ctx, x, y, scale, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.rotate(angle);
  const steel = ctx.createLinearGradient(0, -.15, 0, .15);
  steel.addColorStop(0, '#f4ede4');
  steel.addColorStop(.43, '#d6cfc5');
  steel.addColorStop(.74, '#9b9184');
  steel.addColorStop(1, '#eee5d9');
  ctx.save();
  ctx.shadowColor = '#47302375';
  ctx.shadowBlur = scale * .036;
  ctx.shadowOffsetX = scale * .019;
  ctx.shadowOffsetY = scale * .028;
  ctx.fillStyle = steel;
  ctx.beginPath();
  ctx.moveTo(-.45, -.035);
  ctx.bezierCurveTo(-.08, -.024, .43, -.062, .72, -.065);
  ctx.quadraticCurveTo(.83, 0, .72, .065);
  ctx.bezierCurveTo(.42, .061, -.08, .025, -.45, .035);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-.64, 0, .32, .17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const well = ctx.createLinearGradient(-.76, -.16, -.51, .16);
  well.addColorStop(0, '#555a58');
  well.addColorStop(.39, '#a2a39e');
  well.addColorStop(.61, '#e3e4db');
  well.addColorStop(.77, '#acad9f');
  well.addColorStop(1, '#78746a');
  ctx.fillStyle = well;
  ctx.beginPath();
  ctx.ellipse(-.64, 0, .28, .135, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.clip();
  const gleam = ctx.createRadialGradient(-.72, .055, .012, -.72, .055, .16);
  gleam.addColorStop(0, '#fffdf1a0');
  gleam.addColorStop(.42, '#fffdf150');
  gleam.addColorStop(1, '#fffdf100');
  ctx.fillStyle = gleam;
  ctx.fillRect(-.98, -.17, .68, .34);
  ctx.restore();
}

function pitcherPose({ position, flow, resting, amount, pitcherOffset, heightCm,
  stockMl = MILK_CAPACITY, remainingMl = Math.max(0, stockMl - amount) }, plane, projection) {
  const used = stockMl > 0 ? 1 - remainingMl / stockMl : 1;
  const jet = pourJetPose(flow, used, position, plane, heightCm);
  // Down is positive on canvas: the spout at the left must dip below the handle.
  const angle = -(.10 * resting + jet.angle * (1 - resting));
  const scale = 1.12 + .33 * resting;
  const drop = .55 * jet.height / FOAM_PLANE.radius;
  const lipX = projection.x + projection.rx * (position.x + jet.reach / plane.radius);
  const lipY = projection.y + projection.ry * (position.y + jet.depth / plane.radius) - drop;
  // Translate the same spout point drawn by paintPitcher to the projected jet origin.
  return {
    left: (lipX + scale * (.12 * Math.cos(angle) + .03 * Math.sin(angle))) * (1 - resting)
      + (.11 + (pitcherOffset?.x ?? 0)) * resting,
    top: (lipY + scale * (.12 * Math.sin(angle) - .03 * Math.cos(angle))) * (1 - resting)
      + (-1.74 + .88 * (pitcherOffset?.y ?? 0)) * resting,
    angle,
    scale,
    drop,
    height: jet.height,
    fill: pitcherFill(remainingMl),
  };
}

function pitcherLip({ left, top, angle, scale }) {
  return {
    x: left - scale * (.12 * Math.cos(angle) + .03 * Math.sin(angle)),
    y: top - scale * (.12 * Math.sin(angle) - .03 * Math.cos(angle)),
  };
}

function paintPitcher(ctx, x, y, scale, view, plane, projection) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const { position, impact = position, flow, streamCut = 0, streamHead = 1 } = view;
  const pose = pitcherPose(view, plane, projection);
  const { left, top, angle, fill } = pose;
  if (flow > .001 && streamHead > streamCut) {
    const source = streamCut ? pitcherPose({ ...view, resting: 0 }, plane, projection) : pose;
    const tip = { ...pitcherLip(source), z: 0 };
    // Project the vertical fall and the forward drift onto the screen separately.
    const landing = {
      x: projection.x + projection.rx * impact.x,
      y: tip.y + source.drop,
      z: projection.y + projection.ry * impact.y - tip.y - source.drop,
    };
    const dx = landing.x - tip.x;
    const edge = (step, side) => {
      const t = streamCut + (streamHead - streamCut) * step / 18;
      const point = sampleFallingMilk(tip, landing, t);
      const verticalSpeed = landing.z + 2 * t * source.drop;
      const speed = Math.hypot(dx, verticalSpeed) || 1;
      const radius = side * milkJetRadius(flow, t, streamCut, streamHead, source.height) / FOAM_PLANE.radius;
      return [point.x - radius * verticalSpeed / speed, point.y + point.z + radius * dx / speed];
    };
    ctx.fillStyle = '#fff2dd';
    ctx.beginPath();
    ctx.moveTo(...edge(0, 1));
    for (let i = 1; i <= 18; i++) ctx.lineTo(...edge(i, 1));
    for (let i = 18; i >= 0; i--) ctx.lineTo(...edge(i, -1));
    ctx.closePath();
    ctx.lineJoin = 'round';
    ctx.lineWidth = .008;
    ctx.strokeStyle = '#9e887e70';
    ctx.stroke();
    ctx.fill();
  }
  ctx.translate(left, top);
  ctx.rotate(angle);
  ctx.scale(pose.scale, pose.scale);
  const steel = ctx.createLinearGradient(-.1, .06, .69, .32);
  steel.addColorStop(0, '#636361');
  steel.addColorStop(.17, '#a4a5a4');
  steel.addColorStop(.29, '#ebeae5');
  steel.addColorStop(.38, '#bfc5c5');
  steel.addColorStop(.57, '#879093');
  steel.addColorStop(.80, '#555e61');
  steel.addColorStop(1, '#a4a8a7');
  ctx.strokeStyle = steel;
  ctx.lineWidth = .075;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(.55, .06);
  ctx.bezierCurveTo(.75, .02, .81, .06, .76, .22);
  ctx.quadraticCurveTo(.72, .35, .58, .37);
  ctx.stroke();
  const handleGlint = ctx.createLinearGradient(.52, 0, .70, .37);
  handleGlint.addColorStop(0, '#f7f8f3a0');
  handleGlint.addColorStop(.67, '#f7f8f339');
  handleGlint.addColorStop(1, '#f7f8f300');
  ctx.strokeStyle = handleGlint;
  ctx.lineWidth = .018;
  ctx.stroke();
  ctx.strokeStyle = steel;
  ctx.fillStyle = steel;
  ctx.beginPath();
  ctx.moveTo(-.12, .03);
  ctx.quadraticCurveTo(.06, .12, .02, .25);
  ctx.quadraticCurveTo(.01, .57, .36, .56);
  ctx.quadraticCurveTo(.66, .55, .60, .025);
  ctx.closePath();
  ctx.fill();
  const inside = ctx.createLinearGradient(.09, -.08, .40, .14);
  inside.addColorStop(0, '#3e4547');
  inside.addColorStop(.54, '#616665');
  inside.addColorStop(1, '#93999a');
  ctx.fillStyle = inside;
  ctx.beginPath();
  ctx.moveTo(-.12, .03);
  ctx.bezierCurveTo(-.045, -.01, .014, -.112, .29, -.113);
  ctx.bezierCurveTo(.69, -.119, .71, .125, .31, .133);
  ctx.bezierCurveTo(.115, .14, -.073, .099, -.12, .03);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = .026;
  ctx.stroke();
  if (fill > 0) {
    ctx.save();
    ctx.clip();
    const leaned = 1 - view.resting;
    ctx.translate(.27 - .17 * leaned, .025 + .135 * (1 - fill) * view.resting);
    ctx.rotate(-angle);
    const milk = ctx.createLinearGradient(0, -.08, 0, .10);
    milk.addColorStop(0, '#dcd4c8');
    milk.addColorStop(.57, '#fff7e9');
    milk.addColorStop(1, '#e9dfd0');
    ctx.fillStyle = milk;
    ctx.beginPath();
    ctx.ellipse(0, 0, .23 + .105 * fill - .045 * leaned, .060 + .025 * fill + .025 * leaned, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function paintChocolatePen(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.rotate(.4);
  ctx.shadowColor = '#20140d67';
  ctx.shadowBlur = scale * .08;
  ctx.shadowOffsetY = scale * .04;
  const wrapper = ctx.createLinearGradient(0, -.13, 0, .13);
  wrapper.addColorStop(0, '#9c725d');
  wrapper.addColorStop(.43, '#c49370');
  wrapper.addColorStop(1, '#62402d');
  ctx.fillStyle = wrapper;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(.39, -.09, .72, -.12);
  ctx.quadraticCurveTo(.78, 0, .71, .12);
  ctx.quadraticCurveTo(.32, .08, 0, 0);
  ctx.fill();
  ctx.restore();
}

export function createCanvasFallback(mainCanvas, canvas, foam, {
  overlay = false, materials,
} = {}) {
  const tableImage = materials?.timber.colorCanvas ?? createWalnutImages(false).colorCanvas;
  const stampImage = materials?.stamp;
  if (overlay) canvas.classList.add('paint-overlay');
  else {
    mainCanvas.hidden = true;
    canvas.removeAttribute('aria-hidden');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', mainCanvas.getAttribute('aria-label'));
  }
  canvas.hidden = false;
  const context = canvas.getContext('2d');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let mode = 'pour';
  let pourView = { position: { x: 0, y: 0 }, flow: 0, resting: 1, amount: 0 };
  let artwork = { strokes: [], active: null };
  let width = 1;
  let height = 1;
  let ratio = 1;
  let pending = 0;
  const glazeGrain = ceramicGlaze();
  let ware, wareView, wareAspect;
  function getTableware(view, aspect) {
    if (view !== wareView || aspect !== wareAspect) {
      ware = tablewareView(view, aspect);
      wareView = view;
      wareAspect = aspect;
    }
    return ware;
  }
  const tableBackdrop = canvasOf(0);
  const pourSurface = canvasOf(512);
  const pourLayer = pourSurface.getContext('2d');
  const ceramicViews = new Map();
  const surfaceViews = new Map();
  function layout(w, h, view, plane = FOAM_PLANE) {
    const cache = plane === FOAM_PLANE ? ceramicViews : surfaceViews;
    let entry = cache.get(view);
    if (!entry || entry.w !== w || entry.h !== h || entry.plane !== plane) {
      entry = { w, h, plane, ellipse: projectedLiquidEllipse(w, h, view, plane) };
      cache.set(view, entry);
    }
    return entry.ellipse;
  }

  function pitcherProjection(w, h) {
    const base = layout(w, h, 'pour');
    const liquid = layout(w, h, 'pour', foam.plane);
    return {
      x: (liquid.x - base.x) / base.r, y: (liquid.y - base.y) / base.r,
      rx: liquid.r / base.r, ry: liquid.ry / base.r,
    };
  }
  function paintBackdrop(ctx, w, h, view) {
    const { x, y, r } = layout(w, h, view);
    const sample = tableImage.width * .74;
    const cropWidth = sample * Math.min(1, w / h);
    const cropHeight = sample * Math.min(1, h / w);
    ctx.drawImage(tableImage, (tableImage.width - cropWidth) * .57,
      (tableImage.height - cropHeight) * .44, cropWidth, cropHeight, 0, 0, w, h);
    const backdrop = ctx.createRadialGradient(w * .07, h * .19, 0, w * .07, h * .19, Math.hypot(w, h) * .82);
    backdrop.addColorStop(0, '#ffe9cc43');
    backdrop.addColorStop(.49, '#a06b3614');
    backdrop.addColorStop(1, '#22181154');
    ctx.fillStyle = backdrop;
    ctx.fillRect(0, 0, w, h);
    function ellipse(rx, ry, color, offsetY = 0, offsetX = 0) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x + offsetX, y + offsetY, r * rx, r * ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const ware = getTableware(view, w / h);
    const plate = ware.ring(...SAUCER_RIM);
    const saucerY = plate.y * r;
    const foot = ware.ring(SAUCER_FOOT_RADIUS, 0);
    ctx.save();
    ctx.translate(x + .025 * r, y + foot.y * r);
    ctx.scale(1, foot.ry / foot.rx);
    const footShade = ctx.createRadialGradient(0, 0, .73 * foot.rx * r, 0, 0, 1.64 * foot.rx * r);
    footShade.addColorStop(0, '#35281d8a');
    footShade.addColorStop(.45, '#35281d61');
    footShade.addColorStop(1, '#35281d00');
    const span = 1.64 * foot.rx * r;
    ctx.fillStyle = footShade;
    ctx.fillRect(-span, -span, 2 * span, 2 * span);
    ctx.restore();
    ctx.save();
    ctx.shadowColor = '#392a2355';
    ctx.shadowBlur = r * .13;
    ctx.shadowOffsetX = r * .055;
    ctx.shadowOffsetY = r * .09;
    const baseGlaze = ctx.createLinearGradient(x - r, y, x + r, y + 1.4 * r);
    baseGlaze.addColorStop(0, '#eee3d0');
    baseGlaze.addColorStop(.44, '#bfb4a1');
    baseGlaze.addColorStop(1, '#9c8e7d');
    ellipse(plate.rx, plate.ry, baseGlaze, saucerY + .029 * r);
    ctx.restore();
    const saucer = ctx.createRadialGradient(x - .82 * r, y - .52 * r, .34 * r, x + .27 * r, y + .64 * r, 2.14 * r);
    saucer.addColorStop(0, '#faf8ef');
    saucer.addColorStop(.46, '#eeeae1');
    saucer.addColorStop(.72, '#d8d4c9');
    saucer.addColorStop(.93, '#e6e2d9');
    saucer.addColorStop(1, '#c8c1b5');
    ellipse(plate.rx, plate.ry, saucer, saucerY);
    // Reflections along the curved glaze fall away before the near edge.
    ctx.save();
    ctx.translate(x, y + saucerY);
    ctx.scale(1, plate.ry / plate.rx);
    ctx.beginPath();
    ctx.arc(0, 0, plate.rx * r, 0, Math.PI * 2);
    ctx.clip();
    const lipCurve = ctx.createRadialGradient(0, 0, plate.rx * r * .77, 0, 0, plate.rx * r);
    lipCurve.addColorStop(0, '#5a504600');
    lipCurve.addColorStop(.78, '#6d615326');
    lipCurve.addColorStop(.95, '#fffdf194');
    lipCurve.addColorStop(1, '#beb1a36c');
    ctx.fillStyle = lipCurve;
    ctx.fill();
    ctx.save();
    ctx.translate(-1.16 * r, .18 * r);
    ctx.rotate(-.53);
    ctx.scale(.24 * r, .43 * r);
    const windowSheen = ctx.createRadialGradient(0, 0, .08, 0, 0, 1);
    windowSheen.addColorStop(0, '#fffffc9d');
    windowSheen.addColorStop(.43, '#fffffc46');
    windowSheen.addColorStop(1, '#fffffc00');
    ctx.fillStyle = windowSheen;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
    const reflection = ctx.createLinearGradient(-r, -r, r, r * .56);
    reflection.addColorStop(0, '#ffffffef');
    reflection.addColorStop(.56, '#fffaf151');
    reflection.addColorStop(1, '#fffaf100');
    ctx.strokeStyle = reflection;
    ctx.lineWidth = .012 * r;
    ctx.beginPath();
    ctx.arc(0, 0, .986 * plate.rx * r, Math.PI * .87, Math.PI * 1.79);
    ctx.stroke();
    ctx.restore();
    if (stampImage) {
      const stamp = ware.point(-1.05, .223, 1.38);
      const height = .40 * r;
      const width = height * stampImage.width / stampImage.height;
      ctx.save();
      ctx.translate(x + stamp.x * r, y + stamp.y * r);
      ctx.scale(1, ware.sine);
      ctx.drawImage(stampImage, -width / 2, -height / 2, width, height);
      ctx.restore();
    }
    const spoon = ware.point(SPOON_REST.x, SPOON_REST.y, SPOON_REST.z);
    const tip = ware.point(SPOON_REST.x + Math.cos(SPOON_REST.yaw), SPOON_REST.y + Math.sin(SPOON_REST.pitch),
      SPOON_REST.z - Math.sin(SPOON_REST.yaw));
    const sx = tip.x - spoon.x, sy = tip.y - spoon.y;
    paintSpoon(ctx, x + (spoon.x + .21 * sx * SPOON_REST.scale) * r, y + (spoon.y + .21 * sy * SPOON_REST.scale) * r,
      r * Math.hypot(sx, sy) * 1.35 * SPOON_REST.scale, Math.atan2(sy, sx));
    ctx.save();
    const seat = ware.ring(.67, CUP_SEAT_HEIGHT);
    ctx.translate(x + r * .085, y + seat.y * r);
    ctx.scale(1, ware.sine);
    const shadow = ctx.createRadialGradient(0, 0, .43 * r, .06 * r, .08 * r, 1.16 * r);
    shadow.addColorStop(0, '#4d3b2a8f');
    shadow.addColorStop(.30, '#5b4a396b');
    shadow.addColorStop(.65, '#796b5534');
    shadow.addColorStop(1, '#796b5500');
    ctx.fillStyle = shadow;
    ctx.fillRect(-1.22 * r, -1.22 * r, 2.48 * r, 2.48 * r);
    ctx.restore();
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(r, r);
    const grip = ctx.createLinearGradient(-1.6, -.15, -1.12, .99);
    grip.addColorStop(0, '#fff9ec');
    grip.addColorStop(.35, '#f5eddf');
    grip.addColorStop(.66, '#ddd2bf');
    grip.addColorStop(1, '#b4a58e');
    const returnSide = ctx.createLinearGradient(-1.54, .13, -1.04, .96);
    returnSide.addColorStop(0, '#e1d5c4');
    returnSide.addColorStop(1, '#a79986');
    ctx.fillStyle = returnSide;
    ctx.fill(ware.handleBands[0]);
    ctx.fillStyle = grip;
    ctx.fill(ware.handleBands[1]);
    const gloss = ctx.createLinearGradient(-1.54, .14, -1.05, .83);
    gloss.addColorStop(0, '#fff9ec00');
    gloss.addColorStop(.37, '#fff9ecac');
    gloss.addColorStop(1, '#fff9ec00');
    ctx.fillStyle = gloss;
    ctx.fill(ware.handleBands[2]);
    ctx.restore();

    const body = ctx.createLinearGradient(x - .85 * r, y - .24 * r, x + .8 * r, y + 1.13 * r);
    body.addColorStop(0, '#fff8e9');
    body.addColorStop(.40, '#eee3d2');
    body.addColorStop(.71, '#cfc0ac');
    body.addColorStop(.93, '#b5a695');
    body.addColorStop(1, '#bbae9e');
    for (const [radius, height] of CUP_OUTER_WALL) {
      if (!radius) continue;
      const section = ware.ring(radius, height);
      ellipse(section.rx, section.ry, body, section.y * r);
    }
    const rim = ctx.createLinearGradient(x - r, y - .8 * r, x + r, y + .94 * r);
    rim.addColorStop(0, '#fffbed');
    rim.addColorStop(.35, '#fff7e9');
    rim.addColorStop(.76, '#e2d6c1');
    rim.addColorStop(1, '#f0e4d1');
    const [rimRadius, rimHeight] = CUP_OUTER_WALL.at(-2);
    const crown = ware.ring(rimRadius, rimHeight);
    ellipse(crown.rx, crown.ry, rim, crown.y * r);
    ctx.save();
    ctx.translate(x, y + crown.y * r);
    ctx.scale(1, crown.ry / crown.rx);
    const lipLight = ctx.createLinearGradient(-r, -.65 * r, r, r);
    lipLight.addColorStop(0, '#fffefa');
    lipLight.addColorStop(.56, '#fffdf757');
    lipLight.addColorStop(1, '#fffdf700');
    ctx.strokeStyle = lipLight;
    ctx.lineWidth = .015 * r;
    ctx.beginPath();
    ctx.arc(0, 0, .994 * crown.rx * r, Math.PI * .78, Math.PI * 1.89);
    ctx.stroke();
    ctx.restore();
    const inner = ctx.createRadialGradient(x - .32 * r, y - .40 * r, .11 * r,
      x + .40 * r, y + .24 * r, 1.58 * r);
    inner.addColorStop(0, '#b5ab99');
    inner.addColorStop(.36, '#c9c0b0');
    inner.addColorStop(.72, '#ded7ca');
    inner.addColorStop(1, '#f5f0e7');
    const [innerRadius, innerHeight] = CUP_PROFILE[CUP_OUTER_WALL.length];
    const lip = ware.ring(innerRadius, innerHeight);
    ellipse(lip.rx, lip.ry, inner, lip.y * r);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y + crown.y * r, r * crown.rx, r * crown.ry, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = .4;
    ctx.drawImage(glazeGrain, x - 1.08 * r, y - r, 2.16 * r, 2.16 * r);
    ctx.restore();
  }

  function paintLiquid(ctx, w, h, view, texture = foam.canvas) {
    const { x, y, r, ry } = layout(w, h, view, foam.plane);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, r, ry, 0, 0, Math.PI * 2);
    ctx.clip();
    let clips = [];
    if (view === 'photo') clips = visibleFoamClips('photo', 1, foam.plane);
    if (view === 'draw') clips = drawingFoamClips(w / h, foam.plane);
    if (view === 'pour') clips = visibleFoamClips('pour', w / h, foam.plane);
    for (const circle of clips) {
      ctx.beginPath();
      ctx.ellipse(x + r * circle.x, y + ry * circle.y, r * circle.radius, ry * circle.radius, 0, 0, Math.PI * 2);
      ctx.clip();
    }
    ctx.drawImage(texture, x - r, y - ry, r * 2, ry * 2);
    ctx.restore();
  }

  function paintTools(ctx, w, h, view) {
    const { x, y, r } = layout(w, h, view);
    if (view === 'pour') paintPitcher(ctx, x, y, r, pourView, foam.plane, pitcherProjection(w, h));
    if (view === 'draw') paintChocolatePen(ctx, x + r * .14, y + r * 2, r);
  }

  function paint(ctx, w, h, view) {
    paintBackdrop(ctx, w, h, view);
    paintLiquid(ctx, w, h, view);
    paintTools(ctx, w, h, view);
  }

  function draw() {
    if (canvas.hidden) return;
    const { strokes, active } = artwork;
    if (mode === 'pour') foam.paintPourPreview(pourLayer, [], !reducedMotion.matches);
    else foam.paint(strokes, active);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (tableBackdrop.width !== canvas.width || tableBackdrop.height !== canvas.height) {
      tableBackdrop.width = canvas.width;
      tableBackdrop.height = canvas.height;
      const backdrop = tableBackdrop.getContext('2d');
      backdrop.setTransform(ratio, 0, 0, ratio, 0, 0);
      paintBackdrop(backdrop, width, height, mode);
    }
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.drawImage(tableBackdrop, 0, 0);
    context.restore();
    paintLiquid(context, width, height, mode, mode === 'pour' ? pourSurface : foam.canvas);
    paintTools(context, width, height, mode);
  }
  function invalidate() {
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = 0;
      draw();
    });
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      tableBackdrop.width = tableBackdrop.height = 0;
      return;
    }
    const nextRatio = Math.min(devicePixelRatio || 1, 1.75);
    if (width === rect.width && height === rect.height && ratio === nextRatio) return;
    ({ width, height } = rect);
    ratio = nextRatio;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    if (tableBackdrop.width) tableBackdrop.width = tableBackdrop.height = 0;
    draw();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();
  return {
    input: canvas,
    get drawingClips() { return drawingFoamClips(width / height, foam.plane); },
    get pouringClips() { return visibleFoamClips('pour', width / height, foam.plane); },
    setArtwork(strokes, active) {
      artwork = { strokes, active };
      invalidate();
    },
    resize,
    setMode(next) {
      if (mode !== next && tableBackdrop.width) tableBackdrop.width = tableBackdrop.height = 0;
      mode = next;
      invalidate();
    },
    setPour(view, paintNow = false) {
      pourView = view;
      if (mode !== 'pour') return;
      if (paintNow) {
        cancelAnimationFrame(pending);
        pending = 0;
        draw();
      } else invalidate();
    },
    sample(event) {
      const rect = canvas.getBoundingClientRect();
      const { x, y, r, ry } = layout(width, height, mode, foam.plane);
      return { x: (event.clientX - rect.left - x) / r, y: (event.clientY - rect.top - y) / ry };
    },
    hitsPitcher(event) {
      const rect = canvas.getBoundingClientRect();
      const { x, y, r } = layout(width, height, 'pour');
      const { left, top, angle, scale } = pitcherPose(pourView, foam.plane, pitcherProjection(width, height));
      const dx = (event.clientX - rect.left - x) / r - left;
      const dy = (event.clientY - rect.top - y) / r - top;
      const across = (dx * Math.cos(angle) + dy * Math.sin(angle)) / scale;
      const down = (-dx * Math.sin(angle) + dy * Math.cos(angle)) / scale;
      return across > -.16 && across < .83 && down > -.14 && down < .59;
    },
    photo() {
      foam.paintPhoto(artwork.strokes);
      const picture = canvasOf(PHOTO_SIZE);
      paint(picture.getContext('2d'), PHOTO_SIZE, PHOTO_SIZE, 'photo');
      return picture;
    },
  };
}
