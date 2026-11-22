// Directions across a narrow seam in the 80-cell liquid grid. Sampling opposing
// shoulders lets nearby pools share a coat without expanding exposed edges.
const seamSpans = [[6, 0], [6, 2], [4, 4], [2, 6], [0, 6], [-2, 6], [-4, 4], [-6, 2]];

function joinFoamCoat(density, index, size) {
  const level = density[index];
  // Leave dilute milk and already-white foam alone. Fade in where the
  // incoming pools already overlap, so a clear gap stays clear.
  const overlap = Math.min(1, (level - .55) / 1.25);
  if (overlap <= 0 || level >= 4.5) return level;
  const x = index % size;
  const y = Math.floor(index / size);
  let shoulder = level;
  for (const [dx, dy] of seamSpans) {
    if (x < Math.abs(dx) || x >= size - Math.abs(dx) || y < dy || y >= size - dy) continue;
    const offset = dx + dy * size;
    shoulder = Math.max(shoulder, Math.min(density[index - offset], density[index + offset]));
  }
  return level + overlap * (Math.min(4.5, shoulder) - level);
}

export function joinedFoamLevels(density, size, joined, visible) {
  for (let i = 0; i < density.length; i++) {
    joined[i] = joinFoamCoat(density, i, size) - density[i];
  }
  // Feather only the seam correction. The existing foam grain and the
  // outlines of areas with no overlapping shoulders retain their detail.
  visible.set(density);
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const i = y * size + x;
      if (density[i] <= .55) continue;
      const vertical = joined[i - size] + joined[i + size];
      const horizontal = joined[i - 1] + joined[i + 1];
      const diagonals = joined[i - size - 1] + joined[i - size + 1]
        + joined[i + size - 1] + joined[i + size + 1];
      visible[i] += (4 * joined[i] + 2 * (vertical + horizontal) + diagonals) / 16;
    }
  }
}
