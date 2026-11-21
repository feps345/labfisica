const axes = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];
export function terminalPoint(p, index) {
  const [dx, dy] = axes[p.turn || 0],
    r = index === 0 ? -48 : 48;
  return [p.x + r * dx, p.y + r * dy];
}
export function trace(a, b, terminal) {
  function end(id) {
    const p = terminal(id),
      other = terminal(id.slice(0, -1) + (id.endsWith(":0") ? "1" : "0"));
    const axis = p[0] === other[0] ? 1 : 0,
      sign = Math.sign(p[axis] - other[axis]),
      stub = p.slice();
    stub[axis] += 14 * sign;
    return { p, axis, sign, stub };
  }
  const A = end(a),
    B = end(b),
    k = A.axis,
    h = 1 - k,
    U = A.stub,
    V = B.stub;
  const pt = (along, across) => (k ? [across, along] : [along, across]);
  let mid;
  if (k !== B.axis) mid = [pt(U[k], V[h])];
  else if (A.sign === B.sign) {
    const v = A.sign < 0 ? Math.min(U[k], V[k]) : Math.max(U[k], V[k]);
    mid = [pt(v, U[h]), pt(v, V[h])];
  } else if ((B.p[k] - A.p[k]) * A.sign >= 28) {
    const v = (U[k] + V[k]) / 2;
    mid = [pt(v, U[h]), pt(v, V[h])];
  } else {
    const v =
      Math.abs(U[h] - V[h]) < 40
        ? Math.max(6, Math.min(U[h], V[h]) - 39)
        : (U[h] + V[h]) / 2;
    mid = [pt(U[k], v), pt(V[k], v)];
  }
  return [A.p, U, ...mid, V, B.p];
}
