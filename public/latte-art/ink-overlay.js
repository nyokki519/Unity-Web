// Map the pixels of the transparent drawing canvas onto the world-space foam plane.
// Clip-space X and Y become CSS pixels after applying the same perspective divide.
export function projectInkPlane(matrix, viewport, plane, size) {
  const { width, height } = viewport;
  const radius = plane.radius;
  const level = plane.height;
  const step = 2 * radius / size;
  const origin = row => matrix[12 + row] + matrix[4 + row] * level - (matrix[row] + matrix[8 + row]) * radius;
  const originW = origin(3);
  const column = (x, y, w) => [
    (x + w) * width / (2 * originW),
    (w - y) * height / (2 * originW),
    0,
    w / originW,
  ];
  return [
    ...column(matrix[0] * step, matrix[1] * step, matrix[3] * step),
    ...column(matrix[8] * step, matrix[9] * step, matrix[11] * step),
    0, 0, 1, 0,
    ...column(origin(0), origin(1), originW),
  ];
}
