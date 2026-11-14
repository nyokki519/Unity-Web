export const CABINET_ENVELOPE_SPEC = Object.freeze({
  shell: Object.freeze({ width: 1.8, bottom: 0, sideTop: 3.34, crown: 3.50 }),
  opening: Object.freeze({ width: 1.58, bottom: 0.16, sideTop: 2.88, crown: 3.025 }),
});

function archedShape(THREE, width, bottom, sideTop, crown, winding = 'ccw') {
  const path = winding === 'ccw' ? new THREE.Shape() : new THREE.Path();
  const half = width / 2;
  if (winding === 'ccw') {
    path.moveTo(-half, bottom);
    path.lineTo(half, bottom);
    path.lineTo(half, sideTop);
    path.quadraticCurveTo(half, crown, 0, crown);
    path.quadraticCurveTo(-half, crown, -half, sideTop);
    path.closePath();
  } else {
    path.moveTo(-half, bottom);
    path.lineTo(-half, sideTop);
    path.quadraticCurveTo(-half, crown, 0, crown);
    path.quadraticCurveTo(half, crown, half, sideTop);
    path.lineTo(half, bottom);
    path.closePath();
  }
  return path;
}

function frameGeometry(THREE, outer, opening, options) {
  const shape = archedShape(THREE, outer.width, outer.bottom, outer.sideTop, outer.crown);
  shape.holes.push(archedShape(THREE, opening.width, opening.bottom, opening.sideTop, opening.crown, 'cw'));
  const geometry = new THREE.ExtrudeGeometry(shape, options);
  geometry.computeBoundingBox();
  return geometry;
}

/** Presentation-only arched housing. The opening intentionally clears the complete existing board and sign. */
export function createCabinetEnvelope(THREE) {
  const group = new THREE.Group();
  group.name = 'cabinetEnvelope';

  const shell = new THREE.Mesh(
    frameGeometry(THREE, CABINET_ENVELOPE_SPEC.shell, CABINET_ENVELOPE_SPEC.opening, {
      depth: 0.055, bevelEnabled: true, bevelSegments: 2, steps: 1,
      bevelSize: 0.008, bevelThickness: 0.009, curveSegments: 12,
    }),
    new THREE.MeshStandardMaterial({ color: 0x346b4c, emissive: 0x0b2818, emissiveIntensity: 0.28, roughness: 0.2, metalness: 0.62, envMapIntensity: 1.35 })
  );
  shell.name = 'cabinetOuterBezel';
  shell.position.z = 0.105;
  shell.castShadow = true;
  shell.receiveShadow = true;
  shell.userData.presentationOnly = true;
  group.add(shell);

  const trimOuter = { width: 1.75, bottom: 0.018, sideTop: 2.91, crown: 3.035 };
  const trimOpening = { width: 1.62, bottom: 0.13, sideTop: 2.89, crown: 3.025 };
  const trim = new THREE.Mesh(
    frameGeometry(THREE, trimOuter, trimOpening, {
      depth: 0.009, bevelEnabled: false, steps: 1, curveSegments: 12,
    }),
    new THREE.MeshStandardMaterial({ color: 0xc39a53, emissive: 0x3b260a, emissiveIntensity: 0.26, roughness: 0.22, metalness: 0.82, envMapIntensity: 1.25 })
  );
  trim.name = 'cabinetInnerBezel';
  trim.position.z = 0.169;
  trim.castShadow = false;
  trim.userData.presentationOnly = true;
  group.add(trim);

  const headerShape = new THREE.Shape();
  const hw = 0.69, hy = -0.15, hh = 0.30, corner = 0.07;
  headerShape.moveTo(-hw + corner, hy);
  headerShape.lineTo(hw - corner, hy);
  headerShape.quadraticCurveTo(hw, hy, hw, hy + corner);
  headerShape.lineTo(hw, hy + hh - corner);
  headerShape.quadraticCurveTo(hw, hy + hh, hw - corner, hy + hh);
  headerShape.lineTo(-hw + corner, hy + hh);
  headerShape.quadraticCurveTo(-hw, hy + hh, -hw, hy + hh - corner);
  headerShape.lineTo(-hw, hy + corner);
  headerShape.quadraticCurveTo(-hw, hy, -hw + corner, hy);
  headerShape.closePath();
  const header = new THREE.Mesh(
    new THREE.ExtrudeGeometry(headerShape, { depth: 0.044, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.006, bevelThickness: 0.006, curveSegments: 8 }),
    new THREE.MeshStandardMaterial({ color: 0x17392b, roughness: 0.27, metalness: 0.73, envMapIntensity: 1.2 })
  );
  header.name = 'cabinetTopCrest';
  header.position.set(0, 3.28, 0.16);
  header.castShadow = true;
  header.userData.presentationOnly = true;
  group.add(header);

  const crestBorder = new THREE.Mesh(
    new THREE.ExtrudeGeometry(headerShape, { depth: 0.012, bevelEnabled: false, steps: 1, curveSegments: 8 }),
    new THREE.MeshStandardMaterial({ color: 0xb18b4d, roughness: 0.27, metalness: 0.92, envMapIntensity: 1.2 })
  );
  crestBorder.name = 'cabinetCrestBorder';
  crestBorder.position.set(0, 3.28, 0.213);
  crestBorder.scale.set(1.02, 1.08, 1);
  crestBorder.userData.presentationOnly = true;
  group.add(crestBorder);

  const crestFaceShape = new THREE.Shape();
  const fw = 0.64, fh = 0.115, fr = 0.04;
  crestFaceShape.moveTo(-fw + fr, -fh);
  crestFaceShape.lineTo(fw - fr, -fh);
  crestFaceShape.quadraticCurveTo(fw, -fh, fw, -fh + fr);
  crestFaceShape.lineTo(fw, fh - fr);
  crestFaceShape.quadraticCurveTo(fw, fh, fw - fr, fh);
  crestFaceShape.lineTo(-fw + fr, fh);
  crestFaceShape.quadraticCurveTo(-fw, fh, -fw, fh - fr);
  crestFaceShape.lineTo(-fw, -fh + fr);
  crestFaceShape.quadraticCurveTo(-fw, -fh, -fw + fr, -fh);
  crestFaceShape.closePath();
  const crestFace = new THREE.Mesh(
    new THREE.ExtrudeGeometry(crestFaceShape, { depth: 0.014, bevelEnabled: false, steps: 1, curveSegments: 8 }),
    new THREE.MeshStandardMaterial({ color: 0x123326, roughness: 0.24, metalness: 0.62, envMapIntensity: 1.25 })
  );
  crestFace.name = 'cabinetCrestFace';
  crestFace.position.set(0, 3.28, 0.228);
  crestFace.userData.presentationOnly = true;
  group.add(crestFace);

  const fastenerN = 8;
  const fasteners = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.014, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xe2c280, metalness: 0.94, roughness: 0.2, envMapIntensity: 1.3 }),
    fastenerN
  );
  fasteners.name = 'cabinetFasteners';
  const fastenerMatrix = new THREE.Matrix4();
  let fastenerIndex = 0;
  for (const x of [-0.855, 0.855]) {
    for (const y of [0.10, 0.78, 2.52, 3.31]) {
      fastenerMatrix.makeTranslation(x, y, 0.22);
      fasteners.setMatrixAt(fastenerIndex++, fastenerMatrix);
    }
  }
  fasteners.instanceMatrix.needsUpdate = true;
  fasteners.userData.presentationOnly = true;
  group.add(fasteners);

  const fluteGeometry = new THREE.BoxGeometry(0.006, 0.34, 0.004);
  const fluteMaterial = new THREE.MeshStandardMaterial({ color: 0x85683b, roughness: 0.34, metalness: 0.86 });
  const flutes = new THREE.InstancedMesh(fluteGeometry, fluteMaterial, 12);
  flutes.name = 'cabinetPillarFlutes';
  const matrix = new THREE.Matrix4();
  let instance = 0;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      matrix.makeTranslation(side * (0.818 + i * 0.012), 0.86 + (i % 3) * 0.52, 0.202);
      flutes.setMatrixAt(instance++, matrix);
    }
  }
  flutes.instanceMatrix.needsUpdate = true;
  flutes.userData.presentationOnly = true;
  group.add(flutes);

  return group;
}
