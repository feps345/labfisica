// Interpolate by distance along each orthogonal wire, not directly between its ends.
export function pointAlong(path, f) {
  const lens = path
    .slice(1)
    .map(([x, y], i) => Math.hypot(x - path[i][0], y - path[i][1]));
  let d = (((f % 1) + 1) % 1) * lens.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lens.length; i++) {
    if (lens[i] && d <= lens[i])
      return path[i].map((n, j) => n + ((path[i + 1][j] - n) * d) / lens[i]);
    d -= lens[i];
  }
  return path.at(-1);
}
