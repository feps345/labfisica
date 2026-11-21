import assert from "node:assert/strict";
import { simulate } from "../solver.mjs";
import { seriesModel } from "../series.mjs";
function loop(values) {
  const parts = Object.entries({ V: 5, ...values }).map(([k, val]) => ({
    id: k,
    k,
    val,
  }));
  const seq = parts.slice(1);
  const wires = [
    ["V:0", seq[0].id + ":0"],
    ...seq.slice(1).map((p, i) => [seq[i].id + ":1", p.id + ":0"]),
    [seq.at(-1).id + ":1", "V:1"],
  ];
  return [parts, wires];
}
function close(actual, expected, tol) {
  assert.ok(
    Math.abs(actual - expected) < tol,
    `${actual} ≠ ${expected} (±${tol})`,
  );
}
for (const [kind, values, tau, probe, field, scale] of [
  ["RC", { R: 100, C: 100 }, 0.01, "C", 0, 5],
  ["RL", { R: 100, L: 100 }, 0.001, "L", 1, 0.05],
]) {
  const network = loop(values);
  close(seriesModel(...network).tau, tau, 1e-10);
  const out = simulate(...network, probe, tau * 2000, null, "pulse");
  close(out[299][field] / scale, 1 - Math.exp(-1), 0.002);
  close(out[599][field] / scale, (1 - Math.exp(-1)) * Math.exp(-1), 0.002);
  console.log(kind, "carga/crecimiento y decaimiento: OK");
}
for (const [R, regime] of [
  [20, "subamortiguado"],
  [200, "crítico"],
  [300, "sobreamortiguado"],
]) {
  const network = loop({ R, L: 100, C: 10 });
  const m = seriesModel(...network);
  assert.equal(m.regime, regime);
  close(m.f0, 1000 / (2 * Math.PI), 1e-9);
  const alpha = R / 0.2,
    w = 1000,
    window = 0.01,
    trace = simulate(...network, "C", window * 1000);
  let maxError = 0;
  trace.forEach(([v], i) => {
    const t = ((i + 1) * window) / 600,
      b = Math.sqrt(Math.abs(w * w - alpha * alpha));
    const remainder =
      regime === "crítico"
        ? Math.exp(-alpha * t) * (1 + alpha * t)
        : regime === "subamortiguado"
          ? Math.exp(-alpha * t) *
            (Math.cos(b * t) + (alpha / b) * Math.sin(b * t))
          : Math.exp(-alpha * t) *
            (Math.cosh(b * t) + (alpha / b) * Math.sinh(b * t));
    maxError = Math.max(maxError, Math.abs(v - 5 * (1 - remainder)));
  });
  assert.ok(maxError < 0.2);
  console.log(regime, "error máximo en Vc:", maxError.toFixed(4), "V");
}
assert.equal(
  seriesModel(...loop({ R: 100, L: 400, C: 10 })).f0,
  seriesModel(...loop({ R: 100, L: 100, C: 40 })).f0,
);
