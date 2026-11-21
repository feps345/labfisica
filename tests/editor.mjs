import assert from "node:assert/strict";
import { simulate } from "../solver.mjs";
const parts = [
    { id: "V1", k: "V", val: 5 },
    { id: "R1", k: "R", val: 100 },
    { id: "C1", k: "C", val: 100 },
  ],
  w = [
    ["V1:0", "R1:0"],
    ["R1:1", "C1:0"],
    ["C1:1", "V1:1"],
  ];
assert.ok(
  Math.abs(simulate(parts, w, "C1", 10).at(-1)[0] - 5 * (1 - Math.exp(-1))) <
    0.01,
);
assert.throws(() => simulate(parts, w.slice(1), "V1", 10), /sin conectar/);
assert.throws(
  () => simulate(parts, [...w, ["V1:0", "V1:1"]], "V1", 10),
  /Cortocircuito/,
);
const parallel = [
  ["V1:0", "R1:0"],
  ["V1:0", "R2:0"],
  ["V1:1", "R1:1"],
  ["V1:1", "R2:1"],
];
assert.equal(
  simulate(
    [...parts.slice(0, 2), { id: "R2", k: "R", val: 100 }],
    parallel,
    "V1",
    10,
  )[0][1],
  0.1,
);
const rr = [...parts.slice(0, 2), { id: "R2", k: "R", val: 100 }];
let final;
simulate(
  rr,
  [parallel[0], parallel[1].slice().reverse(), ...parallel.slice(2)],
  "V1",
  10,
  (row) => (final = row),
);
assert.deepEqual(final, [0.05, -0.05, -0.05, -0.05]);
import { terminalPoint, trace } from "../routes.mjs";
for (let ta = 0; ta < 4; ta++)
  for (let tb = 0; tb < 4; tb++) {
    const p = {
        a: { x: 100, y: 100, turn: ta },
        b: { x: 260, y: 210, turn: tb },
      },
      term = (id) => terminalPoint(p[id[0]], Number(id.at(-1)));
    const path = trace("a:1", "b:0", term);
    assert.deepEqual(path[0], term("a:1"));
    assert.deepEqual(path.at(-1), term("b:0"));
    assert(
      path.slice(1).every(([x, y], i) => x === path[i][0] || y === path[i][1]),
    );
  }
assert.deepEqual(terminalPoint({ x: 100, y: 90, turn: 1 }, 0), [100, 42]);
