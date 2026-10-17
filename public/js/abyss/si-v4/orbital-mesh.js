// Polar surface with real polygonal apertures. Split triangles against each
// convex aperture; no invisible surface remains across an opening.
const meshCache=new Map();
const copyMesh=m=>({vertices:m.vertices.slice(),indices:m.indices.slice()});
export function orbitalMesh(t, heightAt) {
  const key=JSON.stringify([t.cx,t.cy,t.cz,t.radius,t.depth,t.valleyRadius,t.tilt,t.tiltZ,t.holes]);
  if(meshCache.has(key))return copyMesh(meshCache.get(key));
  const vertices = [],
    indices = [],
    lookup = new Map(),
    rings = 32,
    sectors = 128;
  const vertex = ([x, z]) => {
    const key = `${x.toFixed(9)},${z.toFixed(9)}`;
    if (lookup.has(key)) return lookup.get(key);
    const id = vertices.length / 3;
    vertices.push(t.cx + x, heightAt(t, x, z), t.cz + z);
    lookup.set(key, id);
    return id;
  };
  const holes = t.holes.map((h) => ({
    ...h,
    polygon: Array.from({ length: 32 }, (_, i) => {
      const a = (i * Math.PI * 2) / 32;
      return [h.x + h.r * Math.cos(a), h.z + h.r * Math.sin(a)];
    }),
  }));
  function clip(poly, a, b, inside) {
    const d = (p) =>
        (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]),
      out = [];
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i],
        q = poly[(i + 1) % poly.length],
        dp = d(p),
        dq = d(q),
        ip = inside ? dp >= -1e-12 : dp <= 1e-12,
        iq = inside ? dq >= -1e-12 : dq <= 1e-12;
      if (ip) out.push(p);
      if (ip !== iq) {
        const f = dp / (dp - dq);
        out.push([p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f]);
      }
    }
    return out;
  }
  function triangle(poly) {
    let pieces = [poly];
    for (const h of holes) {
      const next = [];
      for (const piece of pieces) {
        const xs = piece.map((p) => p[0]),
          zs = piece.map((p) => p[1]);
        if (
          Math.max(...xs) < h.x - h.r ||
          Math.min(...xs) > h.x + h.r ||
          Math.max(...zs) < h.z - h.r ||
          Math.min(...zs) > h.z + h.r
        ) {
          next.push(piece);
          continue;
        }
        let remainder = piece;
        for (let i = 0; i < 32 && remainder.length >= 3; i++) {
          const a = h.polygon[i],
            b = h.polygon[(i + 1) % 32],
            outside = clip(remainder, a, b, false);
          if (outside.length >= 3) next.push(outside);
          remainder = clip(remainder, a, b, true);
        }
      }
      pieces = next;
    }
    for (const piece of pieces)
      for (let i = 1; i < piece.length - 1; i++) {
        const [a, b, c] = [piece[0], piece[i], piece[i + 1]],
          area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        if (Math.abs(area) < 1e-13) continue;
        const ids = [vertex(a), vertex(b), vertex(c)];
        indices.push(...(area > 0 ? [ids[0], ids[2], ids[1]] : ids));
      }
  }
  const point = (r, j) => [
    r * Math.cos((j * 2 * Math.PI) / sectors),
    r * Math.sin((j * 2 * Math.PI) / sectors),
  ];
  for (let ring = 0; ring < rings; ring++)
    for (let j = 0; j < sectors; j++) {
      const a = point((t.radius * ring) / rings, j),
        b = point((t.radius * (ring + 1)) / rings, j),
        c = point((t.radius * (ring + 1)) / rings, j + 1),
        d = point((t.radius * ring) / rings, j + 1);
      triangle([a, b, c]);
      if (ring) triangle([a, c, d]);
    }
  const result={vertices:new Float32Array(vertices),indices:new Uint32Array(indices)};
  if(meshCache.size>=12)meshCache.delete(meshCache.keys().next().value);
  meshCache.set(key,result);
  return copyMesh(result);
}
