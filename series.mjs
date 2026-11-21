/** Analytic descriptors only for a single unbranched loop; never apply series formulas to a general network. */
export function seriesModel(parts, wires) {
  const links = new Map();
  for (const [a, b] of wires) {
    if (links.has(a) || links.has(b)) return null;
    links.set(a, b);
    links.set(b, a);
  }
  const source = parts.find((p) => p.k === "V");
  if (!source) return null;
  const visited = new Set();
  let pin = source.id + ":0";
  do {
    const next = links.get(pin);
    if (!next || visited.has(next)) return null;
    visited.add(next);
    pin = next.slice(0, -1) + (next.endsWith("0") ? "1" : "0");
  } while (pin !== source.id + ":0");
  if (visited.size !== parts.length) return null;
  const sum = (kind, value) =>
    parts.filter((p) => p.k === kind).reduce((s, p) => s + value(p), 0);
  const R = sum("R", (p) => p.val),
    L = sum("L", (p) => p.val / 1000),
    inverseC = sum("C", (p) => 1 / (p.val * 1e-6)),
    C = inverseC ? 1 / inverseC : 0;
  if (R && C && !L) return { type: "RC", tau: R * C };
  if (R && L && !C) return { type: "RL", tau: L / R };
  if (!L || !C) return null;
  const omega = 1 / Math.sqrt(L * C),
    alpha = R / (2 * L),
    zeta = alpha / omega,
    critical = Math.abs(zeta - 1) < 1e-9;
  return {
    type: "RLC",
    alpha,
    zeta,
    f0: omega / (2 * Math.PI),
    fd:
      zeta < 1 && !critical
        ? Math.sqrt(omega ** 2 - alpha ** 2) / (2 * Math.PI)
        : null,
    regime: critical
      ? "crítico"
      : zeta < 1
        ? "subamortiguado"
        : "sobreamortiguado",
  };
}
export function describe(model) {
  if (!model) return "";
  const f = (n) =>
    Number(n.toPrecision(4)).toLocaleString("es-CO", {
      maximumSignificantDigits: 4,
    });
  if (model.tau)
    return `Circuito ${model.type} serie: τ = ${f(1000 * model.tau)} ms (tiempo para recorrer el 63,2 % del cambio ante un escalón).`;
  return (
    `RLC serie ${model.regime}: ζ = ${f(model.zeta)}, frecuencia natural f₀ = ${f(model.f0)} Hz. ` +
    (model.fd !== null
      ? `Frecuencia amortiguada = ${f(model.fd)} Hz.`
      : "Sin oscilación.")
  );
}
