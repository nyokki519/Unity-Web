import { pourJetPose } from './pour-jet.js';
import { ceramicGlaze, paintCafeMark } from './cafe-ware.js';
import { canvasOf, PHOTO_SIZE } from './surface.js';
import { createWalnutImages } from './walnut.js';
import { CUP_OUTER_WALL, CUP_PROFILE, FOAM_PLANE, drawingFoamClips, projectedLiquidEllipse, tableCameraFraming, visibleFoamClips } from './foam-geometry.js';
import { HANDLE_ANGLE, SAUCER_RIM, SPOON_REST, handleCrossSection, handleProfile } from './tableware-profile.js';
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
  return [band(-1, 1), band(-.76, .94)];
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
  const well = ctx.createRadialGradient(-.71, .046, .02, -.64, 0, .3);
  well.addColorStop(0, '#f7eee2');
  well.addColorStop(.62, '#a69c8c');
  well.addColorStop(1, '#e7ddd1');
  ctx.fillStyle = well;
  ctx.beginPath();
  ctx.ellipse(-.64, 0, .28, .135, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function pitcherPose({ position, flow, resting, amount, pitcherOffset }, plane, projection) {
  const used = amount / MILK_CAPACITY;
  const jet = pourJetPose(flow, used, position, plane);
  // Down is positive on canvas: the spout at the left must dip below the handle.
  const angle = -(.10 * resting + jet.angle * (1 - resting));
  const lipX = projection.x + projection.rx * (position.x + jet.reach / plane.radius);
  const lipY = projection.y + projection.ry * (position.y + jet.depth / plane.radius) - .53 * jet.height / FOAM_PLANE.radius;
  // Translate the same spout point drawn by paintPitcher to the projected jet origin.
  return {
    left: (lipX + .12 * Math.cos(angle) + .03 * Math.sin(angle)) * (1 - resting)
      + (.48 + (pitcherOffset?.x ?? 0)) * resting,
    top: (lipY + .12 * Math.sin(angle) - .03 * Math.cos(angle)) * (1 - resting)
      + (-1.17 + .88 * (pitcherOffset?.y ?? 0)) * resting,
    angle,
    drop: .53 * jet.height / FOAM_PLANE.radius,
    used,
  };
}

function pitcherLip({ left, top, angle }) {
  return {
    x: left - .12 * Math.cos(angle) - .03 * Math.sin(angle),
    y: top - .12 * Math.sin(angle) + .03 * Math.cos(angle),
  };
}

function paintPitcher(ctx, x, y, scale, view, plane, projection) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const { position, impact = position, flow, streamCut = 0, streamHead = 1 } = view;
  const { left, top, angle, used, drop } = pitcherPose(view, plane, projection);
  if (flow > .001 && streamHead > streamCut) {
    const source = streamCut ? pitcherPose({ ...view, resting: 0 }, plane, projection) : { left, top, angle };
    const { x: tipX, y: tipY } = pitcherLip(source);
    const dx = projection.x + projection.rx * impact.x - tipX;
    const dy = projection.y + projection.ry * impact.y - tipY;
    const edge = (step, side) => {
      const t = streamCut + (streamHead - streamCut) * step / 12;
      const verticalSpeed = dy - drop + 2 * t * drop;
      const speed = Math.hypot(dx, verticalSpeed) || 1;
      const radius = side * .032 * Math.sqrt(flow / (1 + 2 * t));
      return [tipX + dx * t - radius * verticalSpeed / speed,
        tipY + (dy - drop) * t + drop * t ** 2 + radius * dx / speed];
    };
    ctx.fillStyle = '#fff6e4';
    ctx.beginPath();
    ctx.moveTo(...edge(0, 1));
    for (let i = 1; i <= 12; i++) ctx.lineTo(...edge(i, 1));
    for (let i = 12; i >= 0; i--) ctx.lineTo(...edge(i, -1));
    ctx.closePath();
    ctx.fill();
  }
  ctx.translate(left, top);
  ctx.rotate(angle);
  const steel = ctx.createLinearGradient(-.1, 0, .65, .25);
  steel.addColorStop(0, '#786b5e');
  steel.addColorStop(.22, '#eee7df');
  steel.addColorStop(.52, '#c5b9aa');
  steel.addColorStop(.82, '#9a8d7e');
  steel.addColorStop(1, '#e3d9ce');
  ctx.strokeStyle = steel;
  ctx.lineWidth = .06;
  ctx.beginPath();
  ctx.ellipse(.53, .21, .16, .19, .12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = steel;
  ctx.beginPath();
  ctx.moveTo(-.12, .03);
  ctx.quadraticCurveTo(.06, .12, .02, .25);
  ctx.quadraticCurveTo(.01, .57, .36, .56);
  ctx.quadraticCurveTo(.65, .55, .57, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#685c4c';
  ctx.beginPath();
  ctx.ellipse(.25, .025, .35, .10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = .032;
  ctx.stroke();
  ctx.save();
  ctx.clip();
  const leaned = 1 - view.resting;
  ctx.translate(.25 - .23 * leaned, .025 + .06 * used * view.resting);
  ctx.rotate(-angle);
  ctx.fillStyle = '#f7eddd';
  ctx.beginPath();
  ctx.ellipse(0, 0, .33 - .09 * used - .045 * leaned, .075 + .025 * leaned, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
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
  overlay = false, tableImage = createWalnutImages(false).colorCanvas,
} = {}) {
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
    ctx.drawImage(tableImage, 136, 56, 240, 400, 0, 0, w, h);
    const backdrop = ctx.createRadialGradient(w * .07, h * .19, 0, w * .07, h * .19, Math.hypot(w, h) * .82);
    backdrop.addColorStop(0, '#ffd8a650');
    backdrop.addColorStop(.45, '#bd754525');
    backdrop.addColorStop(1, '#3b190e60');
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
    ctx.save();
    ctx.shadowColor = '#392a235c';
    ctx.shadowBlur = r * .085;
    ctx.shadowOffsetX = r * .06;
    ctx.shadowOffsetY = r * .075;
    ellipse(plate.rx, plate.ry, '#c8c0ad', saucerY + .032 * r);
    ctx.restore();
    const saucer = ctx.createRadialGradient(x - .62 * r, y - .49 * r, .36 * r, x, y + saucerY, 1.82 * r);
    saucer.addColorStop(0, '#f5f2e8');
    saucer.addColorStop(.70, '#e9e5d6');
    saucer.addColorStop(.90, '#f1ede0');
    saucer.addColorStop(1, '#d4cdbc');
    ellipse(plate.rx, plate.ry, saucer, saucerY);
    paintCafeMark(ctx, x - r * 1.13, y + r * .89, r * .32, '#79664d');
    ctx.save();
    ctx.fillStyle = '#79664d';
    ctx.font = `${r * .095}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Unity', x - r * .97, y + r * 1.24);
    ctx.restore();
    const spoon = ware.point(SPOON_REST.x, SPOON_REST.y, SPOON_REST.z);
    const tip = ware.point(SPOON_REST.x + Math.cos(SPOON_REST.yaw), SPOON_REST.y + Math.sin(SPOON_REST.pitch),
      SPOON_REST.z - Math.sin(SPOON_REST.yaw));
    const sx = tip.x - spoon.x, sy = tip.y - spoon.y;
    paintSpoon(ctx, x + (spoon.x + .21 * sx * SPOON_REST.scale) * r, y + (spoon.y + .21 * sy * SPOON_REST.scale) * r,
      r * Math.hypot(sx, sy) * 1.35 * SPOON_REST.scale, Math.atan2(sy, sx));
    ctx.save();
    ctx.translate(x + r * .10, y + r * .42);
    ctx.scale(1, ware.sine);
    const shadow = ctx.createRadialGradient(0, 0, .49 * r, 0, 0, 1.13 * r);
    shadow.addColorStop(0, '#66574566');
    shadow.addColorStop(.75, '#796b5538');
    shadow.addColorStop(1, '#796b5500');
    ctx.fillStyle = shadow;
    ctx.fillRect(-1.14 * r, -1.14 * r, 2.28 * r, 2.28 * r);
    ctx.restore();
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(r, r);
    const grip = ctx.createLinearGradient(-1.6, -.15, -1.12, .99);
    grip.addColorStop(0, '#fffdf1');
    grip.addColorStop(.44, '#ede9dc');
    grip.addColorStop(1, '#b9b09f');
    ctx.fillStyle = '#b0a591';
    ctx.fill(ware.handleBands[0]);
    ctx.fillStyle = grip;
    ctx.fill(ware.handleBands[1]);
    ctx.restore();

    const body = ctx.createLinearGradient(x - .85 * r, y, x + .8 * r, y + 1.14 * r);
    body.addColorStop(0, '#f3efe3');
    body.addColorStop(.52, '#d9d4c6');
    body.addColorStop(.85, '#c1b9a9');
    body.addColorStop(1, '#b7ac9b');
    for (const [radius, height] of CUP_OUTER_WALL) {
      if (!radius) continue;
      const section = ware.ring(radius, height);
      ellipse(section.rx, section.ry, body, section.y * r);
    }
    const rim = ctx.createLinearGradient(x - r, y - .8 * r, x + r, y + .94 * r);
    rim.addColorStop(0, '#fffef5');
    rim.addColorStop(.49, '#f0eee0');
    rim.addColorStop(1, '#cdc4b1');
    const [rimRadius, rimHeight] = CUP_OUTER_WALL.at(-2);
    const crown = ware.ring(rimRadius, rimHeight);
    ellipse(crown.rx, crown.ry, rim, crown.y * r);
    const inner = ctx.createLinearGradient(x, y - r, x - .13 * r, y + .78 * r);
    inner.addColorStop(0, '#c3bcad');
    inner.addColorStop(.30, '#e7e4d8');
    inner.addColorStop(1, '#f5f1e4');
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
    paintCafeMark(ctx, x + r * .24, y + r * .887, r * .14, '#766648');
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
      const { left, top, angle } = pitcherPose(pourView, foam.plane, pitcherProjection(width, height));
      const dx = (event.clientX - rect.left - x) / r - left;
      const dy = (event.clientY - rect.top - y) / r - top;
      const across = dx * Math.cos(angle) + dy * Math.sin(angle);
      const down = -dx * Math.sin(angle) + dy * Math.cos(angle);
      return across > -.16 && across < .73 && down > -.10 && down < .59;
    },
    photo() {
      foam.paintPhoto(artwork.strokes);
      const picture = canvasOf(PHOTO_SIZE);
      paint(picture.getContext('2d'), PHOTO_SIZE, PHOTO_SIZE, 'photo');
      return picture;
    },
  };
}
