import { MAX_ESPRESSO_ML } from './barista-prep-model.js';

const WIDTH = 1024;
const HEIGHT = 650;
const SHOT_X = 435;
const STEAM_X = 700;
const PI2 = Math.PI * 2;

const SHOT_BOWL = 'M339 438 C344 475 360 504 391 523 C413 536 457 537 481 523 C508 507 525 475 532 438 Z';
const SHOT_FLOOR_RADIUS = 28;
const SHOT_FULL_RADIUS = 86;
const SHOT_SPOUTS = [420, 449];
const PITCHER_BOWL = 'M601 435 C617 469 618 509 638 532 C657 554 712 564 746 538 C768 521 778 472 783 428 Z';
const PITCHER_RIM = 'M600 435 C600 425 621 426 633 411 C653 387 696 386 734 393 C768 399 784 412 783 428 C783 448 746 475 701 478 C655 479 624 453 600 435 Z';
const MACHINE = 'M213 181 Q213 155 245 149 L806 149 Q848 150 868 179 L881 227 L881 431 L205 444 L205 202 Z';
const FACE = 'M221 211 Q221 190 246 188 L811 188 Q833 189 840 211 L843 279 Q843 297 824 301 L245 301 Q221 301 221 282 Z';
const TRAY = 'M226 433 L830 433 L911 525 L896 545 L170 545 L167 526 Z';

function stops(gradient, colors) {
  for (const [at, color] of colors) gradient.addColorStop(at, color);
  return gradient;
}

function linear(ctx, x1, y1, x2, y2, colors) {
  return stops(ctx.createLinearGradient(x1, y1, x2, y2), colors);
}

function radial(ctx, x1, y1, radius1, x2, y2, radius2, colors) {
  return stops(ctx.createRadialGradient(x1, y1, radius1, x2, y2, radius2), colors);
}

const paths = new Map();
function path(d) {
  if (!paths.has(d)) paths.set(d, new Path2D(d));
  return paths.get(d);
}

function fill(ctx, d, paint) {
  ctx.fillStyle = paint;
  ctx.fill(path(d));
}

function stroke(ctx, d, paint, width = 1) {
  ctx.strokeStyle = paint;
  ctx.lineWidth = width;
  ctx.stroke(path(d));
}

function ellipse(ctx, x, y, width, height, paint, border, weight = 1) {
  ctx.beginPath();
  ctx.ellipse(x, y, width, height, 0, 0, PI2);
  ctx.fillStyle = paint;
  ctx.fill();
  if (border) {
    ctx.strokeStyle = border;
    ctx.lineWidth = weight;
    ctx.stroke();
  }
}

function rectangle(ctx, x, y, width, height, radius, paint) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = paint;
  ctx.fill();
}

function shadeEllipse(ctx, x, y, width, height, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, height / width);
  ellipse(ctx, 0, 0, width, width, radial(ctx, 0, 0, width * 0.14, 0, 0, width, [[0, color], [1, '#0000']]));
  ctx.restore();
}

function randomSequence(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function brushing(ctx, d, x, y, w, h, count, seed) {
  const random = randomSequence(seed);
  ctx.save();
  ctx.clip(path(d));
  for (let i = 0; i < count; i++) {
    const offset = random();
    const span = random() * 85 + 5;
    ctx.fillStyle = i % 2 ? '#030908' : '#f6d6a5';
    ctx.globalAlpha = 0.018 + random() * 0.055;
    ctx.fillRect(x + random() * w, y + offset * h, span, 0.55);
  }
  ctx.restore();
}

function paintCafe(ctx) {
  ctx.fillStyle = linear(ctx, 0, 0, 650, 460, [[0, '#756e58'], [0.35, '#34483f'], [0.74, '#172c29'], [1, '#111a18']]);
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  for (let y = 5; y < 476; y += 82) {
    ctx.fillStyle = '#141d1980';
    ctx.fillRect(0, y, WIDTH, 4);
    ctx.fillStyle = '#cfc6a724';
    ctx.fillRect(0, y + 4, WIDTH, 1);
    for (let x = (y % 164 ? -40 : 38); x < WIDTH; x += 152) {
      ctx.fillStyle = '#14201ba0';
      ctx.fillRect(x, y, 4, 82);
      ctx.fillStyle = '#b1bba124';
      ctx.fillRect(x + 4, y, 1, 82);
    }
  }
  ctx.fillStyle = radial(ctx, 80, 65, 0, 90, 97, 660, [[0, '#e2c18858'], [0.5, '#d3b26b14'], [1, '#c5a26600']]);
  ctx.fillRect(0, 0, WIDTH, 485);
  ctx.fillStyle = linear(ctx, 0, 470, 0, 650, [[0, '#5c3b26'], [0.39, '#886042'], [0.65, '#68452d'], [0.9, '#573721'], [1, '#331f17']]);
  ctx.fillRect(0, 475, WIDTH, 175);
  const wood = randomSequence(11);
  ctx.save();
  for (let i = 0; i < 1050; i++) {
    const y = 477 + wood() * 173;
    const x = wood() * WIDTH - 120;
    const width = 12 + wood() * 480;
    ctx.strokeStyle = i % 4 ? '#2a150d' : '#f3c18b';
    ctx.globalAlpha = 0.015 + wood() * 0.08;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + width * 0.24, y - 3, x + width * 0.78, y + 1.4, x + width, y - 1.5);
    ctx.stroke();
  }
  ctx.restore();
  shadeEllipse(ctx, 564, 553, 441, 73, '#120e0be0');
  shadeEllipse(ctx, 614, 390, 486, 166, '#080e0dc9');
}

function paintMachine(ctx) {
  fill(ctx, MACHINE, linear(ctx, 244, 151, 682, 411, [[0, '#71776c'], [0.16, '#44514c'], [0.47, '#1f2d2c'], [1, '#111a1b']]));
  fill(ctx, 'M214 180 L244 143 L779 131 L843 150 L868 179 L801 187 L240 187 Z',
    linear(ctx, 400, 130, 412, 192, [[0, '#242b28'], [0.54, '#77817a'], [0.72, '#b4ae91'], [0.78, '#5e635a'], [1, '#272e2c']]));
  for (let y = 146; y < 174; y += 5) {
    ctx.beginPath();
    ctx.moveTo(246 + (174 - y) * 0.45, y);
    ctx.lineTo(807 + (y - 144), y - 3);
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = '#10171485';
    ctx.stroke();
  }
  fill(ctx, 'M836 193 L866 184 L879 236 L877 459 L837 484 Z',
    linear(ctx, 836, 190, 885, 246, [[0, '#515c55'], [0.3, '#243433'], [0.87, '#0f1919'], [1, '#333d35']]));
  fill(ctx, 'M220 266 L840 264 L833 438 L228 446 Z',
    linear(ctx, 220, 281, 800, 453, [[0, '#69706a'], [0.14, '#3d4a46'], [0.44, '#323e3b'], [0.64, '#50615a'], [0.87, '#1e2c29'], [1, '#161f1d']]));
  fill(ctx, 'M223 277 L840 269 L834 306 L224 319 Z',
    linear(ctx, 487, 272, 491, 317, [[0, '#131d1b'], [0.65, '#171c1bb0'], [1, '#17201d00']]));
  brushing(ctx, 'M220 302 L839 291 L832 444 L220 444 Z', 220, 286, 625, 171, 1200, 80);
  fill(ctx, 'M232 411 L834 413 L841 441 L227 449 Z',
    linear(ctx, 456, 411, 456, 450, [[0, '#35423a'], [0.22, '#b2b09b'], [0.27, '#535a51'], [0.43, '#66736b'], [0.76, '#242e27'], [1, '#121918']]));

  fill(ctx, TRAY, linear(ctx, 364, 434, 415, 547, [[0, '#5f6c62'], [0.27, '#8b9388'], [0.55, '#b1a38b'], [0.74, '#797363'], [1, '#292c25']]));
  brushing(ctx, TRAY, 167, 430, 743, 117, 1500, 319);
  for (let row = 0; row <= 8; row++) {
    const y = 443 + row * 10.2;
    for (let column = 0; column < 4; column++) {
      const x = 237 - (y - 443) * 0.62 + column * (143 + row * 3);
      rectangle(ctx, x, y, 126 + row * 3.2, 3.9, 2, '#d7ccb37f');
      rectangle(ctx, x, y - 1, 126 + row * 3.2, 3.7, 2, '#262a24');
      rectangle(ctx, x + 1, y - 1, 124 + row * 3.2, 1.8, 1, '#131815');
    }
  }
  fill(ctx, 'M166 525 L912 525 L904 544 L893 554 L187 554 L172 543 Z',
    linear(ctx, 443, 525, 443, 557, [[0, '#f0d4a6'], [0.06, '#b7a98b'], [0.16, '#6f7564'], [0.42, '#9e9985'], [0.67, '#5a5b4c'], [0.82, '#313b33'], [1, '#181f1b']]));
  stroke(ctx, 'M187 549 L892 549', '#b0a38460');
  rectangle(ctx, 207, 551, 80, 18, [0, 0, 6, 6], '#151818');
  rectangle(ctx, 804, 551, 78, 16, [0, 0, 6, 6], '#171b17');

  fill(ctx, FACE, linear(ctx, 240, 191, 775, 324, [[0, '#b7b8a2'], [0.11, '#727e72'], [0.43, '#acb09e'], [0.65, '#7c8c81'], [1, '#344742']]));
  fill(ctx, FACE, linear(ctx, 532, 187, 532, 302, [[0, '#e1d9b950'], [0.07, '#ffffff1b'], [0.49, '#ffffff00'], [0.83, '#253b3259'], [0.97, '#15211b74'], [1, '#07110ce0']]));
  brushing(ctx, FACE, 213, 186, 633, 117, 2400, 607);
  stroke(ctx, 'M228 213 Q228 197 248 196 L813 196 Q829 197 834 214', '#d9dcc388', 1.75);
  stroke(ctx, 'M240 294 L824 294', '#ece1bf78', 1.5);
  stroke(ctx, 'M241 298 L821 298', '#131812b0', 2.3);

  const brass = linear(ctx, 374, 301, 472, 345, [[0, '#444139'], [0.16, '#c8ac79'], [0.3, '#ece1ba'], [0.46, '#777160'], [0.61, '#b9a783'], [0.78, '#5b5140'], [1, '#262822']]);
  rectangle(ctx, 344, 296, 181, 26, [4, 4, 17, 17], brass);
  ellipse(ctx, SHOT_X, 320, 83, 24, brass, '#494437', 1.5);
  ellipse(ctx, SHOT_X, 326, 76, 20, linear(ctx, 438, 311, 434, 344, [[0, '#534838'], [0.52, '#26261f'], [0.77, '#746044'], [1, '#bfaa7e']]));
  ellipse(ctx, SHOT_X, 330, 69, 15, '#2b2a22', '#b7a27c', 2);
  fill(ctx, 'M396 326 L397 343 Q396 355 414 358 L456 358 Q473 356 473 344 L473 325 Z',
    linear(ctx, 396, 337, 474, 347, [[0, '#64625a'], [0.18, '#ddd2b9'], [0.36, '#b9aa8d'], [0.68, '#605d50'], [0.82, '#a39c87'], [1, '#474b44']]));
  fill(ctx, 'M413 350 L415 365 Q419 371 424 366 L430 354 L440 354 L446 366 Q451 371 455 365 L457 350 Z',
    linear(ctx, 413, 360, 457, 360, [[0, '#827665'], [0.15, '#eae0be'], [0.3, '#8d8372'], [0.48, '#444638'], [0.65, '#d9caaa'], [0.85, '#a08762'], [1, '#514836']]));
  ctx.save();
  ctx.translate(496, 325);
  ctx.rotate(0.245);
  rectangle(ctx, -16, -11, 62, 22, 5, linear(ctx, 0, -12, 0, 13, [[0, '#574e40'], [0.19, '#e9ddbd'], [0.46, '#aa9f86'], [0.62, '#746b59'], [0.86, '#c0b192'], [1, '#2b3126']]));
  rectangle(ctx, 30, -14, 135, 30, [13, 13, 17, 17], linear(ctx, 0, -14, 0, 17, [[0, '#697064'], [0.2, '#343d37'], [0.58, '#242e29'], [0.82, '#171d1c'], [1, '#333936']]));
  rectangle(ctx, 43, -12, 105, 1, 1, '#b5bca34c');
  ctx.restore();

  paintGauge(ctx, 276, 241);
  rectangle(ctx, 368, 222, 131, 39, 5, '#35473e');
  rectangle(ctx, 371, 225, 125, 33, 4, '#172521');
  stroke(ctx, 'M372 256 L494 256', '#b6b9a259', 1);
  paintKnob(ctx, 775, 243);
  ellipse(ctx, 800, 315, 27, 19, brass, '#29372f', 2);
  ellipse(ctx, 800, 320, 16, 14, '#878e7c', '#c0c0a6', 2);
}

function paintGauge(ctx, x, y) {
  ellipse(ctx, x, y, 30, 30, linear(ctx, x - 24, y - 28, x + 25, y + 24, [[0, '#ebdfb5'], [0.35, '#9d8d71'], [0.62, '#605e50'], [1, '#a99d7e']]), '#495649', 1.4);
  ellipse(ctx, x, y, 24, 24, '#d8ceb3', '#443f31', 1.7);
  for (let i = 0; i < 15; i++) {
    const angle = 0.77 * Math.PI + i * (1.46 * Math.PI) / 14;
    const length = i % 3 ? 18 : 15.5;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    ctx.lineTo(x + Math.cos(angle) * 21, y + Math.sin(angle) * 21);
    ctx.strokeStyle = '#555748';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  stroke(ctx, 'M275 242 L266 225', '#813d2b', 1.9);
  ellipse(ctx, x, y, 3, 3, '#675c49');
}

function paintKnob(ctx, x, y) {
  ellipse(ctx, x + 3, y + 5, 28, 30, '#111e18a8');
  ellipse(ctx, x, y, 28, 26, linear(ctx, x - 21, y - 28, x + 22, y + 23, [[0, '#b5b8a1'], [0.37, '#424d41'], [0.82, '#75796a'], [1, '#26342b']]));
  ellipse(ctx, x, y, 23, 22, radial(ctx, x - 9, y - 11, 1, x, y, 28, [[0, '#69756c'], [0.44, '#33443c'], [0.76, '#1b2724'], [1, '#49594d']]), '#29392d', 1.25);
  for (let i = 0; i < 32; i++) {
    const angle = i * PI2 / 32;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * 21, y + Math.sin(angle) * 20);
    ctx.lineTo(x + Math.cos(angle) * 24, y + Math.sin(angle) * 23);
    ctx.strokeStyle = i > 15 ? '#a3aa923b' : '#17241dcb';
    ctx.stroke();
  }
  rectangle(ctx, x - 1, y - 18, 2, 7, 1, '#e2dfbb');
}

const ceramic = [
  [0, '#92795d'], [0.1, '#c5ac88'], [0.29, '#f8e9cc'], [0.51, '#e4cda9'], [0.78, '#ad9072'], [1, '#765f48'],
];
const cupSpeckles = makeParticles(128, 208);
const cremaParticles = makeParticles(130, 116);
const milkParticles = makeParticles(215, 53);

function makeParticles(count, seed) {
  const random = randomSequence(seed);
  return Array.from({ length: count }, () => ({
    angle: random() * PI2, radial: Math.sqrt(random()), size: random(), tone: random(),
  }));
}

export function espressoSurface(volume) {
  const fill = Math.max(0, Math.min(1, volume / MAX_ESPRESSO_ML));
  // For a widening bowl, the volume below a level is proportional to the
  // difference of the cubed radii of the bottom and the surface.
  const radius = Math.cbrt(SHOT_FLOOR_RADIUS ** 3 + (SHOT_FULL_RADIUS ** 3 - SHOT_FLOOR_RADIUS ** 3) * fill);
  const depth = (radius - SHOT_FLOOR_RADIUS) / (SHOT_FULL_RADIUS - SHOT_FLOOR_RADIUS);
  const y = 464 - 32 * depth;
  const width = radius * Math.sqrt(Math.max(0, Math.min(1, volume / .75)));
  return { y, width, height: width * .445, landingY: y + radius * .054 };
}

function paintCup(ctx, shot, clock, extracting, reduced) {
  shadeEllipse(ctx, SHOT_X + 6, 531, 144, 27, '#14180fe8');
  const handle = 'M516 454 C570 427 587 447 578 473 C571 497 535 508 510 500 L512 485 C545 488 560 466 559 458 C552 453 542 456 524 467 Z';
  fill(ctx, handle, linear(ctx, 545, 441, 560, 500, [[0, '#fff3d7'], [0.2, '#d9bd93'], [0.56, '#a58461'], [0.69, '#f2d8a9'], [1, '#896b4d']]));
  stroke(ctx, 'M524 454 C560 440 575 443 575 457', '#fff8d48e', 2);
  ellipse(ctx, SHOT_X, 526, 50, 10, '#997e5d', '#d2b891', 1.4);
  fill(ctx, SHOT_BOWL, linear(ctx, 334, 460, 534, 510, ceramic));
  fill(ctx, SHOT_BOWL, linear(ctx, 437, 442, 437, 531, [[0, '#f9e8c85c'], [0.54, '#ffffff00'], [0.85, '#744d2f32'], [1, '#623b2373']]));
  ctx.save();
  ctx.clip(path(SHOT_BOWL));
  for (const p of cupSpeckles) {
    const x = SHOT_X + Math.sin(p.angle) * p.radial * 99;
    const y = 479 + Math.cos(p.angle) * p.radial * 63;
    ellipse(ctx, x, y, 0.3 + p.size * 1.3, 0.25 + p.size * 0.7, p.tone < 0.48 ? '#a579425e' : '#9d734439');
  }
  ctx.restore();
  ellipse(ctx, SHOT_X, 437, 97, 49, linear(ctx, 349, 409, 532, 459, [[0, '#c5a277'], [0.23, '#fff2ce'], [0.58, '#f3dfba'], [0.77, '#d2b087'], [1, '#a28363']]), '#866c51', 1.4);
  ellipse(ctx, SHOT_X, 434, 91, 43, linear(ctx, 424, 394, 449, 476, [
    [0, '#bda37c'], [.23, '#e5cea8'], [.53, '#bb9b75'], [.81, '#846446'], [1, '#d9bf93'],
  ]), '#fff2ce', 1.35);
  ctx.save();
  ctx.clip();
  shadeEllipse(ctx, 444, 459, 69, 23, '#4e321d6f');
  shadeEllipse(ctx, SHOT_X - 3, 464, 31, 12, '#dcc194b5');
  const surface = espressoSurface(shot.volume);
  if (surface.width > .15) paintCrema(ctx, shot, surface, clock, extracting, reduced);
  ctx.restore();
  stroke(ctx, 'M342 440 C348 466 388 484 433 485 C473 486 515 467 528 444', '#fff0c9c0', 2.2);
  stroke(ctx, 'M352 437 C355 411 396 394 438 394 C468 394 492 402 509 415', '#fff6d895', 1.4);
  if (extracting && (shot.phase === 'flow' || shot.phase === 'drops')) paintStreams(ctx, shot, clock, surface, reduced);
}

function paintCrema(ctx, shot, { y, width, height, landingY }, clock, extracting, reduced) {
  const golden = Math.round(shot.blonding * 36);
  ellipse(ctx, SHOT_X, y, width, height, linear(ctx, SHOT_X - width * .30, y - height, SHOT_X + width * .25, y + height, [
    [0, `rgb(${95 + golden * .6} ${48 + golden * .6} 24)`],
    [.27, `rgb(${152 + golden} ${76 + golden} ${36 + golden * .48})`],
    [.60, `rgb(${155 + golden} ${83 + golden} ${43 + golden * .44})`],
    [1, `rgb(${108 + golden} ${53 + golden * .72} ${28 + golden * .43})`],
  ]));
  ctx.save();
  ctx.clip();
  ctx.fillStyle = radial(ctx, SHOT_X - width * .31, y - height * .4, 0, SHOT_X - width * .2, y - height * .2, width * .65,
    [[0, '#ffe1b14d'], [.47, '#f8ba6828'], [1, '#f8ba6800']]);
  ctx.fillRect(SHOT_X - width, y - height, width * 2, height * 2);
  const spin = reduced ? 0 : shot.time * .38;
  for (const p of cremaParticles) {
    const angle = p.angle + spin * (1 - p.radial);
    const x = SHOT_X + Math.cos(angle) * p.radial * width;
    const py = y + Math.sin(angle) * p.radial * height;
    ellipse(ctx, x, py, .22 + p.size * 1.3, .14 + p.size * .49, p.tone < .7 ? '#f7bd7452' : '#581f1452');
  }
  // The dark contact line and the lit front crescent follow the same level as the coffee.
  ctx.beginPath();
  ctx.ellipse(SHOT_X, y, width, height, 0, 0, PI2);
  ctx.lineWidth = Math.min(3, width * .18);
  ctx.strokeStyle = '#522d1ca2';
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(SHOT_X, y, width * .98, height * .96, 0, .18, 2.74);
  ctx.lineWidth = Math.min(1.5, width * .12);
  ctx.strokeStyle = '#f3bd797a';
  ctx.stroke();
  if (extracting && shot.phase === 'flow') {
    for (const [index, x] of SHOT_SPOUTS.entries()) {
      const pulse = reduced ? .4 : (clock * 3.05 + index * .32) % 1;
      ellipse(ctx, x, landingY, 3 + pulse * 12, 1 + pulse * 4.5, '#542d1b40', '#f5c38c54', .8);
      ellipse(ctx, x, landingY, 2.3, 1.05, '#633218be');
    }
  }
  ctx.restore();
}

function paintStreams(ctx, shot, clock, { landingY }, reduced) {
  const pale = shot.blonding;
  const tea = `rgb(${132 + pale * 62} ${56 + pale * 56} ${21 + pale * 27})`;
  const amber = `rgb(${193 + pale * 47} ${101 + pale * 52} ${44 + pale * 30})`;
  ctx.lineCap = 'round';
  for (const [index, x] of SHOT_SPOUTS.entries()) {
    const shimmer = reduced ? 0 : Math.sin(clock * 23 + index) * 1.6;
    if (shot.phase === 'drops') {
      const fraction = reduced ? 0.48 : (clock * 3.1 + index * 0.27) % 1;
      const y = 365 + (landingY - 365) * fraction ** 1.7;
      ellipse(ctx, x, y, 2.7, 4.4 + fraction * 4, tea, amber, 0.6);
      ellipse(ctx, x - 0.6, y - 1.5, 0.7, 3.1, '#f9d99a7c');
      continue;
    }
    const width = 3.3 + Math.sin(clock * 19 + index) * 0.44 - pale * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 364);
    ctx.bezierCurveTo(x + shimmer, 394, x - shimmer, landingY - 15, x, landingY);
    ctx.strokeStyle = '#32190d7e';
    ctx.lineWidth = width + 2;
    ctx.stroke();
    ctx.strokeStyle = linear(ctx, x - 2, 365, x + 4, 365, [[0, amber], [0.58, tea], [1, '#5f2b17']]);
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.lineCap = 'butt';
  }
}

const nozzleDepth = { surface: -11, air: -5, roll: 6, deep: 17 };

function paintPitcher(ctx, milk, depth, clock, steaming, reduced) {
  shadeEllipse(ctx, STEAM_X + 24, 551, 132, 27, '#0d1b13df');
  const handle = 'M768 435 C820 413 837 429 836 447 C833 472 806 486 771 488 L773 471 C797 471 821 455 818 446 C813 439 789 445 774 453 Z';
  fill(ctx, handle, linear(ctx, 789, 426, 800, 491, [[0, '#808b85'], [0.12, '#e2d9c5'], [0.41, '#777b6e'], [0.7, '#bbb6a6'], [0.82, '#545b54'], [1, '#939285']]));
  stroke(ctx, 'M776 439 C817 420 833 426 833 444', '#f8eed08a', 1.2);
  const body = linear(ctx, 613, 455, 778, 491, [[0, '#555950'], [0.1, '#a39b89'], [0.21, '#b7ad98'], [0.31, '#e2d7c1'], [0.48, '#c0bba9'], [0.61, '#717c75'], [0.79, '#444c48'], [0.91, '#92988b'], [1, '#4e5c52']]);
  fill(ctx, PITCHER_BOWL, body);
  fill(ctx, PITCHER_BOWL, linear(ctx, 692, 434, 710, 556, [[0, '#eee1c649'], [0.51, '#e0d7b600'], [0.83, '#27382e48'], [0.96, '#c7c0a571'], [1, '#3a4438a6']]));
  stroke(ctx, 'M637 531 C657 553 710 563 746 538', '#ded7bb7f', 1.9);
  fill(ctx, PITCHER_RIM, linear(ctx, 633, 397, 712, 476, [[0, '#d1c9b5'], [0.27, '#797a6e'], [0.54, '#3d4841'], [0.83, '#b1ad96'], [1, '#626e62']]));
  const foamLevel = milk.foam / 0.4375;
  const y = 441 - foamLevel * 12;
  ctx.save();
  ctx.clip(path(PITCHER_RIM));
  ellipse(ctx, STEAM_X + 1, y, 64 + foamLevel * 10, 28 + foamLevel * 8,
    radial(ctx, 687, y - 8, 3, STEAM_X + 6, y + 3, 70, [[0, '#fff9e6'], [0.57, '#eee6d1'], [0.82, '#e2dcc7'], [1, '#c7c3a7']]), '#e2dcbd', 0.65);
  ctx.clip();
  const rough = Math.min(1, (1 - milk.fineness) * 1.2);
  const activity = steaming && !reduced ? clock : 0;
  if (depth === 'roll' && steaming && !reduced) {
    ctx.save();
    ctx.translate(STEAM_X + 9, y + 3);
    ctx.scale(1, 0.41);
    for (let arm = 0; arm < 5; arm++) {
      ctx.beginPath();
      for (let j = 0; j < 32; j++) {
        const radius = 4 + j * 2.7;
        const angle = arm * PI2 / 5 + j * 0.052 - activity * 2.7;
        ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      }
      ctx.lineWidth = 0.95 + (arm % 2) * 1.7;
      ctx.strokeStyle = arm % 2 ? '#fffdf1ad' : '#c5b79645';
      ctx.stroke();
    }
    ctx.restore();
  }
  const bubbleCount = Math.round(foamLevel * 200);
  for (let i = 0; i < bubbleCount; i++) {
    const p = milkParticles[i];
    const angle = p.angle + (depth === 'roll' ? -activity * 0.68 * (1 - p.radial) : Math.sin(activity + i) * 0.025);
    const x = STEAM_X + Math.cos(angle) * p.radial * 68;
    const py = y + Math.sin(angle) * p.radial * 32;
    const r = 0.33 + (rough ** 1.6 * 11 + 1.2) * p.size ** 2.1;
    if (r > 2.5) {
      ellipse(ctx, x + 0.5, py + 0.9, r + 0.5, r * 0.64 + 0.7, '#9c876f58');
      ellipse(ctx, x, py, r, r * 0.66, radial(ctx, x - r * 0.34, py - r * 0.32, 0, x, py, r, [[0, '#fffcf0'], [0.47, '#e7e0cd'], [0.83, '#c2b596'], [1, '#f1dec1']]), '#e1d3b3a2', 0.7);
      ellipse(ctx, x - r * 0.42, py - r * 0.3, r * 0.24, r * 0.086 + 0.3, '#fffef1cc');
    } else {
      ellipse(ctx, x, py, r, r * 0.62, p.tone > 0.37 ? '#fffaf0b2' : '#c7bd9b4e');
    }
  }
  if (milk.separation > 0.06) {
    ctx.globalAlpha = milk.separation * 0.6;
    ellipse(ctx, STEAM_X + 1, y, 65 + foamLevel * 10, 28 + foamLevel * 8, '#fff0', '#b49364', 3.8);
  }
  ctx.restore();
  stroke(ctx, PITCHER_RIM, linear(ctx, 609, 416, 775, 462, [[0, '#f0dfba'], [0.16, '#eee9d4'], [0.36, '#9a9b91'], [0.64, '#eddfb9'], [1, '#929f91']]), 2.1);
  stroke(ctx, 'M602 433 C620 439 629 446 651 460 C684 482 737 478 765 452', '#fff8e0ae', 1.55);
  paintWand(ctx, y + nozzleDepth[depth]);
  if (steaming && milk.temperature > 17 && !reduced) paintVapor(ctx, y, clock, milk.temperature);
}

function paintWand(ctx, tipY) {
  // Keep moving paths out of the static path cache.
  const metal = new Path2D();
  metal.moveTo(800, 318);
  metal.bezierCurveTo(794, 351, 749, 357, 720, 383);
  metal.quadraticCurveTo(699, 401, 710, tipY);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#26342dae';
  ctx.lineWidth = 14;
  ctx.stroke(metal);
  ctx.strokeStyle = linear(ctx, 703, 341, 809, 420, [[0, '#c6b5a1'], [0.25, '#e7ddc8'], [0.45, '#6f7e73'], [0.57, '#d5ccaf'], [0.7, '#626b60'], [1, '#c1bcaa']]);
  ctx.lineWidth = 11;
  ctx.stroke(metal);
  ctx.strokeStyle = '#edead2ad';
  ctx.lineWidth = 2.4;
  ctx.stroke(metal);
  stroke(ctx, 'M736 372 C750 361 769 352 784 341', '#24332e', 17);
  stroke(ctx, 'M737 369 C752 357 768 349 781 342', '#6170689e', 2.9);
  ctx.lineCap = 'butt';
}

function paintVapor(ctx, y, clock, temperature) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 9; i++) {
    const progress = (clock * (0.6 + i * 0.019) + i * 0.128) % 1;
    const x = 703 + Math.sin(progress * 4 + i * 1.27) * (10 + progress * 30) - progress * 37;
    const py = y - progress * (65 + i * 4);
    const opacity = Math.sin(progress * Math.PI) * (temperature - 15) / 63 * 0.16;
    const radius = 4 + progress * 19;
    shadeEllipse(ctx, x, py, radius, radius * 0.82, `rgba(235, 227, 202, ${opacity})`);
  }
  ctx.restore();
}

function paintDisplay(ctx, stage, shot, milk, active) {
  ctx.fillStyle = active ? '#f5e2ad' : '#c2c8a7';
  ctx.textAlign = 'center';
  ctx.font = '600 15px monospace';
  const measurement = stage === 'espresso' ? `${shot.time.toFixed(1).padStart(4)} s` : `${Math.round(milk.temperature).toString().padStart(2)} °C`;
  ctx.fillText(measurement, 436, 247);
  ellipse(ctx, 384, 241, 2.4, 2.4, active ? '#f7c479' : '#77977b');
}

export function createBaristaScene(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return () => {};
  const backing = canvas.ownerDocument.createElement('canvas');
  backing.width = WIDTH;
  backing.height = HEIGHT;
  const base = backing.getContext('2d', { alpha: false });
  paintCafe(base);
  paintMachine(base);

  return ({ stage, shot, milk, depth, clock, extracting, steaming, reduced }) => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    const ratio = Math.min(canvas.ownerDocument.defaultView.devicePixelRatio || 1, 2);
    const pixelsWide = Math.round(width * ratio);
    const pixelsHigh = Math.round(height * ratio);
    if (canvas.width !== pixelsWide || canvas.height !== pixelsHigh) {
      canvas.width = pixelsWide;
      canvas.height = pixelsHigh;
    }
    const progress = stage === 'espresso' ? Math.min(1, shot.volume / 29) : Math.min(1, (milk.temperature - 5) / 42);
    const close = reduced ? 0 : progress * progress * (3 - 2 * progress);
    const focalX = stage === 'espresso' ? SHOT_X + 22 - 13 * close : STEAM_X - 28 + 10 * close;
    const focalY = 356 + (stage === 'espresso' ? 28 : 26) * close;
    const zoom = Math.max(height / 451, width / 845) * (1 + .12 * close);
    const x = Math.min(0, Math.max(width - WIDTH * zoom, width * 0.5 - focalX * zoom));
    const y = height * 0.5 - focalY * zoom;
    ctx.setTransform(zoom * ratio, 0, 0, zoom * ratio, x * ratio, y * ratio);
    ctx.fillStyle = '#23302c';
    ctx.fillRect(-WIDTH, -HEIGHT, WIDTH * 3, HEIGHT * 3);
    ctx.drawImage(backing, 0, 0);
    paintDisplay(ctx, stage, shot, milk, extracting || steaming);
    paintCup(ctx, shot, clock, extracting, reduced);
    if (stage === 'steam') paintPitcher(ctx, milk, depth, clock, steaming, reduced);
    else paintWand(ctx, 382);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = radial(ctx, pixelsWide * 0.53, pixelsHigh * 0.45, pixelsHigh * 0.25, pixelsWide * 0.53, pixelsHigh * 0.45, Math.hypot(pixelsWide, pixelsHigh) * 0.58, [[0, '#141b1500'], [1, '#0c110c45']]);
    ctx.fillRect(0, 0, pixelsWide, pixelsHigh);
  };
}
