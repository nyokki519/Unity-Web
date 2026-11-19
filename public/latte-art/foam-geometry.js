const lerp = (start, end, fraction) => (1 - fraction) * start + fraction * end;

const innerWall = [
  [1.367, 1.36], [1.353, 1.324], [1.347, 1.22], [1.30, 1.03], [1.25, .87],
  [1.15, .69], [1.02, .51], [.85, .38], [.68, .33], [0, .33],
];

export const CUP_PROFILE = [
  [0, .15], [.58, .15], [.64, .15], [.69, .17], [.71, .20], [.8, .25], [.93, .32],
  [1.05, .44], [1.16, .57], [1.26, .73], [1.35, .92], [1.41, 1.12], [1.43, 1.28],
  [1.43, 1.34], [1.415, 1.37], [1.39, 1.38], ...innerWall,
];

const foamHeight = 1.06;
const lowerWall = innerWall.findIndex(([, height]) => height <= foamHeight);
const [upperRadius, upperHeight] = innerWall[lowerWall - 1];
const [lowerRadius, lowerHeight] = innerWall[lowerWall];
const radiusAtFoam = lerp(lowerRadius, upperRadius, (foamHeight - lowerHeight) / (upperHeight - lowerHeight));
export const FOAM_PLANE = Object.freeze({ height: foamHeight, radius: radiusAtFoam - .003 });

export function tableCameraFraming(view, aspect) {
  const relative = Math.max(0, Math.min(1, (aspect - .57) / (.80 - .57)));
  const portrait = 1 - relative ** 2 * (3 - 2 * relative);
  const photo = view === 'photo';
  const served = view === 'serve' || photo;
  const blend = (wide, tall) => lerp(wide, tall, portrait);
  const distance = photo ? 10.15 : served
    ? blend(10.6, 12.2 * Math.max(.9, .462 / aspect))
    : blend(11.25, Math.max(11.25, 17.4 * .462 / aspect));
  const elevation = photo ? 61 : served ? 64 : blend(57, 60);
  const angle = elevation * Math.PI / 180;
  const targetY = served ? .67 : .69;
  const targetZ = photo ? .16 : served ? .08 : blend(.08, .22);
  return {
    distance, elevation, targetY, targetZ,
    targetX: photo ? -.18 : blend(.18, .02),
    eye: { x: 0, y: targetY + distance * Math.sin(angle), z: targetZ + distance * Math.cos(angle) },
    shiftX: served ? 0 : -.111 * portrait,
    shiftY: served ? 0 : .109 * portrait,
  };
}

// A ray from the foam to the camera stays visible only while it fits through
// each wider cross section of the cup's inner wall.
function innerWallClips(eye) {
  const clips = [];
  for (const [radius, height] of innerWall) {
    if (height <= foamHeight || height >= eye.y) continue;
    const perspective = (height - foamHeight) / (eye.y - height);
    const x = -perspective * eye.x / FOAM_PLANE.radius;
    const y = -perspective * eye.z / FOAM_PLANE.radius;
    const r = radius * (1 + perspective) / FOAM_PLANE.radius;
    if (r < 1 + Math.hypot(x, y)) clips.push({ x, y, radius: r });
  }
  return clips;
}

export const PHOTO_FOAM_CLIPS = innerWallClips(tableCameraFraming('photo', 1).eye);

export function drawingFoamClips(aspect) {
  return [...PHOTO_FOAM_CLIPS, ...innerWallClips(tableCameraFraming('draw', aspect).eye)];
}
