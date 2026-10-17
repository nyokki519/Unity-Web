import * as THREE from "../../../vendor/three/three.module.js";
// Entirely procedural original cabinet. Decorations never affect simulation.
export function createCabinet(scene, board) {
  const root = new THREE.Group(),
    geometries = [],
    textures = [];
  const materials = {
    enamel: new THREE.MeshPhysicalMaterial({
      color: 0x174b3d,
      roughness: 0.27,
      metalness: 0.35,
      clearcoat: 0.85,
    }),
    brass: new THREE.MeshStandardMaterial({
      color: 0xd7b873,
      metalness: 0.8,
      roughness: 0.23,
    }),
    ivory: new THREE.MeshStandardMaterial({ color: 0xe9dfc4, roughness: 0.55 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x081e18, roughness: 0.6 }),
    light: new THREE.MeshBasicMaterial({ color: 0xf1d38d }),
  };
  const mesh = (geo, mat, x, y, z) => {
    geometries.push(geo);
    const m = new THREE.Mesh(geo, materials[mat]);
    m.position.set(x, y, z);
    root.add(m);
    return m;
  };
  mesh(new THREE.BoxGeometry(0.54, 0.87, 0.045), "enamel", 0.25, 0.405, -0.032);
  mesh(
    new THREE.BoxGeometry(0.492, 0.735, 0.008),
    "dark",
    0.25,
    0.402,
    -0.0045,
  );
  for (const x of [-0.009, 0.509]) {
    mesh(new THREE.BoxGeometry(0.019, 0.79, 0.022), "brass", x, 0.41, -0.002);
    mesh(new THREE.BoxGeometry(0.008, 0.75, 0.025), "ivory", x, 0.41, 0.001);
  }
  for (const y of [-0.008, 0.818])
    mesh(new THREE.BoxGeometry(0.534, 0.015, 0.027), "brass", 0.25, y, -0.009);
  mesh(new THREE.BoxGeometry(0.5, 0.055, 0.08), "enamel", 0.25, -0.002, 0.018);
  for (let i = 0; i < 29; i++)
    mesh(
      new THREE.SphereGeometry(0.0017, 6, 4),
      "light",
      0.025 + i * 0.016,
      0.805,
      0.012,
    );
  function plate(text, x, y, z, w, h, color) {
    const c = document.createElement("canvas");
    c.width = 768;
    c.height = 128;
    const ctx = c.getContext("2d");
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 768, 128);
    ctx.strokeStyle = "#d7b873";
    ctx.lineWidth = 5;
    ctx.strokeRect(7, 7, 754, 114);
    ctx.fillStyle = "#f3e5b9";
    ctx.font = "500 57px Georgia,serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 384, 65);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.push(texture);
    const mat = new THREE.MeshBasicMaterial({ map: texture });
    materials[`plate-${textures.length}`] = mat;
    const g = new THREE.PlaneGeometry(w, h);
    geometries.push(g);
    const m = new THREE.Mesh(g, mat);
    m.position.set(x, y, z);
    root.add(m);
    return m;
  }
  const art = document.createElement("canvas");
  art.width = art.height = 1024;
  const ctx = art.getContext("2d"),
    gradient = ctx.createRadialGradient(512, 380, 30, 512, 512, 700);
  gradient.addColorStop(0, "#235342");
  gradient.addColorStop(1, "#061b15");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 1024);
  ctx.strokeStyle = "#ad9c5d";
  ctx.lineWidth = 4;
  for (const r of [488, 501]) {
    ctx.beginPath();
    ctx.arc(512, 512, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.12;
  ctx.lineWidth = 1;
  for (let i = 0; i < 40; i++) {
    const a = (i * Math.PI * 2) / 40;
    ctx.beginPath();
    ctx.moveTo(512 + 440 * Math.cos(a), 512 + 440 * Math.sin(a));
    ctx.lineTo(
      512 + 480 * Math.cos(a + 0.045),
      512 + 480 * Math.sin(a + 0.045),
    );
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#a8b59a";
  ctx.textAlign = "center";
  ctx.font = "20px Georgia";
  ctx.fillText("THE SILVER GARDEN", 512, 250);
  ctx.font = "11px sans-serif";
  ctx.fillStyle = "#879c7c";
  ctx.fillText("SCATTER  ·  DRIFT  ·  RETURN", 512, 277);
  for (const route of board.routes || []) {
    const x = (v) => ((v - 0.03) / 0.44) * 1024,
      y = (v) => ((0.77 - v) / 0.44) * 1024;
    ctx.strokeStyle = "#557458";
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(x(route.a[0]), y(route.a[1]) + 15);
    ctx.lineTo(x(route.b[0]), y(route.b[1]) + 15);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(art);
  texture.colorSpace = THREE.SRGBColorSpace;
  textures.push(texture);
  materials.boardArt = new THREE.MeshBasicMaterial({ map: texture });
  const boardGeo = new THREE.CircleGeometry(0.219, 96);
  geometries.push(boardGeo);
  const boardPlate = new THREE.Mesh(boardGeo, materials.boardArt);
  boardPlate.position.set(0.25, 0.55, 0.0003);
  root.add(boardPlate);
  plate("CAFÉ ABYSS", 0.25, 0.772, 0.02, 0.255, 0.044, "#123f32");
  plate("FOLLOW THE SILVER", 0.25, 0.693, 0.013, 0.19, 0.027, "#123f32");
  for (const t of board.trays)
    plate(
      `0${t.stage}  /  CRADLE`,
      t.cx + t.radius + 0.035,
      t.cy - 0.008,
      t.cz - 0.025,
      0.071,
      0.012,
      "#123f32",
    );
  // Pinfield accents sit behind the actual contact plane, never over the balls.
  for (const route of board.routes || []) {
    const [a, b] = [route.a, route.b],
      g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(a[0], a[1] - 0.009, -0.0005),
        new THREE.Vector3(b[0], b[1] - 0.009, -0.0005),
      ]);
    geometries.push(g);
    const mat = new THREE.LineBasicMaterial({ color: 0x566d55 });
    materials[`line-${route.id}`] = mat;
    root.add(new THREE.Line(g, mat));
  }
  scene.add(root);
  return {
    materials: Object.values(materials),
    dispose() {
      scene.remove(root);
      geometries.forEach((g) => g.dispose());
      textures.forEach((t) => t.dispose());
      Object.values(materials).forEach((m) => m.dispose());
    },
  };
}
