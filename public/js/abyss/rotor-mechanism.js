import { vec, fromY } from "./si-geometry.js";
// Independent motor geometry: five rounded carrying studs, no attractive forces.
export function defineRotors(board) {
  board.rotors = [
    { x: 0.138, y: 0.612, z: 0.007, radius: 0.039, omega: 5.1 },
    { x: 0.346, y: 0.583, z: 0.007, radius: 0.039, omega: -4.7 },
  ];
}
export function buildRotors(board) {
  board.rotors.forEach((r, rotorId) => {
    const part = (id, x, y, radius, halfHeight, z = 0.007) =>
      board.parts.push({
        id: `rotor-${rotorId}-${id}`,
        tag: "rotor",
        rotorId,
        kind: "cylinder",
        position: vec(x, y, z),
        rotation: fromY(vec(0, 0, 1)),
        radius,
        halfHeight,
        friction: 0.3,
        restitution: 0.22,
      });
    part("face", r.x, r.y, r.radius, 0.0007, -0.0001);
    part("hub", r.x, r.y, 0.004, 0.008);
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      part(
        i,
        r.x + 0.03 * Math.cos(a),
        r.y + 0.03 * Math.sin(a),
        0.0028,
        0.008,
      );
    }
  });
}
export function rotorPoses(board, time) {
  return board.rotors.map((r) => ({ ...r, angle: r.omega * time }));
}
