// Reproduce the self-hosted, offline Three.js runtime from the locked dependency.
import { mkdir, copyFile } from "node:fs/promises";
const target = new URL("../public/vendor/three/", import.meta.url);
await mkdir(target, { recursive: true });
for (const file of ["three.module.js", "three.core.js"])
  await copyFile(
    new URL(`../node_modules/three/build/${file}`, import.meta.url),
    new URL(file, target),
  );
await copyFile(
  new URL("../node_modules/three/LICENSE", import.meta.url),
  new URL("LICENSE", target),
);
