export function simulate(
  parts,
  wires,
  probe,
  ms,
  onCurrents,
  excitation = "step",
) {
  const parent = new Map();
  function root(x) {
    if (!parent.has(x)) parent.set(x, x);
    if (parent.get(x) !== x) parent.set(x, root(parent.get(x)));
    return parent.get(x);
  }
  for (const [x, y] of wires) parent.set(root(x), root(y));
  const src = parts.find((p) => p.k === "V"),
    hi = root(src.id + ":0"),
    lo = root(src.id + ":1");
  if (hi === lo)
    throw Error(
      "Cortocircuito: los polos de la fuente están unidos por cable.",
    );
  const seen = new Set(wires.flat());
  for (const p of parts)
    for (let i = 0; i < 2; i++)
      if (!seen.has(p.id + ":" + i))
        throw Error(
          `Terminal sin conectar en ${p.id}. Termina el cableado o retira la pieza.`,
        );
  const steps = 600,
    dt = ms / 1000 / steps,
    nodes = [
      ...new Set(parts.flatMap((p) => [root(p.id + ":0"), root(p.id + ":1")])),
    ].filter((n) => n !== hi && n !== lo);
  let sourceVoltage = src.val;
  const fixed = (n) => (n === hi ? sourceVoltage : 0);
  const branches = parts
    .filter((p) => p !== src)
    .map((p) => ({
      ...p,
      a: root(p.id + ":0"),
      b: root(p.id + ":1"),
      g:
        p.k === "R"
          ? 1 / p.val
          : p.k === "C"
            ? (p.val * 1e-6) / dt
            : dt / (p.val * 0.001),
      v: 0,
      i: 0,
    }));
  const forest = [],
    adj = new Map(),
    visited = new Set();
  if (onCurrents) {
    wires.forEach(([a, b], j) => {
      for (const [u, v, s] of [
        [a, b, 1],
        [b, a, -1],
      ]) {
        if (!adj.has(u)) adj.set(u, []);
        adj.get(u).push([v, j, s]);
      }
    });
    function walk(u) {
      visited.add(u);
      for (const [v, j, s] of adj.get(u) || []) {
        if (visited.has(v)) continue;
        walk(v);
        forest.push([u, v, j, s]);
      }
    }
    for (const n of adj.keys()) if (!visited.has(n)) walk(n);
  }
  const samples = [];
  for (let step = 0; step < steps; step++) {
    sourceVoltage = excitation === "pulse" && step >= steps / 2 ? 0 : src.val;
    const N = nodes.length,
      A = nodes.map(() => Array(N + 1).fill(0));
    for (const p of branches) {
      p.h = p.k === "C" ? -p.g * p.v : p.k === "L" ? p.i : 0;
      for (const [u, v, s] of [
        [p.a, p.b, 1],
        [p.b, p.a, -1],
      ]) {
        const i = nodes.indexOf(u),
          j = nodes.indexOf(v);
        if (i < 0) continue;
        A[i][i] += p.g;
        if (j >= 0) A[i][j] -= p.g;
        else A[i][N] += p.g * fixed(v);
        A[i][N] -= s * p.h;
      }
    }
    for (let j = 0; j < N; j++) {
      let best = j;
      for (let i = j + 1; i < N; i++)
        if (Math.abs(A[i][j]) > Math.abs(A[best][j])) best = i;
      [A[j], A[best]] = [A[best], A[j]];
      const pivot = A[j][j];
      if (Math.abs(pivot) < 1e-13)
        throw Error(
          "Hay una red flotante. Conéctala al circuito de la fuente.",
        );
      for (let k = j; k <= N; k++) A[j][k] /= pivot;
      for (let i = 0; i < N; i++)
        if (i !== j) {
          const f = A[i][j];
          for (let k = j; k <= N; k++) A[i][k] -= f * A[j][k];
        }
    }
    const volts = (n) =>
      nodes.includes(n) ? A[nodes.indexOf(n)][N] : fixed(n);
    let delivered = 0;
    for (const p of branches) {
      p.v = volts(p.a) - volts(p.b);
      p.i = p.g * p.v + p.h;
      if (p.a === hi) delivered += p.i;
      if (p.b === hi) delivered -= p.i;
    }
    if (onCurrents) {
      const injections = new Map(),
        amps = wires.map(() => 0);
      for (const p of branches) {
        injections.set(p.id + ":0", -p.i);
        injections.set(p.id + ":1", p.i);
      }
      injections.set(src.id + ":0", delivered);
      injections.set(src.id + ":1", -delivered);
      for (const [u, v, j, s] of forest) {
        const q = injections.get(v) || 0;
        amps[j] = -s * q;
        injections.set(u, (injections.get(u) || 0) + q);
      }
      onCurrents(amps);
    }
    const m = branches.find((p) => p.id === probe);
    samples.push(m ? [m.v, m.i] : [sourceVoltage, delivered]);
  }
  return samples;
}
