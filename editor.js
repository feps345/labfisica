import { calculationSteps } from "./calculation-guide.mjs";
import { seriesModel, describe } from "./series.mjs";
import { pointAlong } from "./wire-flow.mjs";
import { trace, terminalPoint } from "./routes.mjs";
import { simulate } from "./solver.mjs";
const $ = (id) => document.getElementById(id),
  svg = $("canvas"),
  unit = { R: "Ω", L: "mH", C: "µF", V: "V" },
  names = { R: "Resistor", L: "Bobina", C: "Capacitor", V: "Fuente" };
let parts = [],
  wires = [],
  chosen = "V1",
  pending = null,
  drag = null,
  counter = {};
let showFlow = false,
  lastPositions = [];
let updateFrame = 0,
  playback = 0;
const say = (text) => ($("status").textContent = text);
function stale() {
  $("time-slider").disabled = $("transport").disabled = true;
  lastPositions = [];
  $("calculation-steps").textContent = "Completa el circuito y conecta la fuente para ver el procedimiento.";
  paintFlow([]);
  $("show-flow").disabled = true;
  cancelAnimationFrame(updateFrame);
  cancelAnimationFrame(playback);
  $("readings").replaceChildren();
  $("board-reading").textContent = $("meter").textContent = "Sin señal";
  updateFrame = requestAnimationFrame(measure);
}
const part = (id) => parts.find((p) => p.id === id),
  term = (t) => {
    const [id, s] = t.split(":"),
      p = part(id);
    return terminalPoint(p, Number(s));
  };
function init(example) {
  parts = example ? [{ id: "V1", k: "V", val: 5, x: 330, y: 305 }] : [];
  wires = [];
  counter = { R: 0, L: 0, C: 0 };
  if (example) {
    parts.push(
      { id: "R1", k: "R", val: example === "RLC" ? 20 : 100, x: 155, y: 130 },
      { id: "C1", k: "C", val: 100, x: 490, y: 130 },
    );
    counter.R = counter.C = 1;
    if (example === "RL") {
      parts[2].id = "L1";
      parts[2].k = "L";
      counter.L = 1;
    }
    wires = [
      ["V1:0", "R1:0"],
      ["R1:1", "C1:0"],
      ["C1:1", "V1:1"],
    ];
    if (example === "RL")
      wires = wires.map((w) => w.map((t) => t.replace("C1", "L1")));
    if (example === "RLC") {
      parts.push({ id: "L1", k: "L", val: 100, x: 325, y: 65 });
      counter.L = 1;
      wires.splice(1, 1, ["R1:1", "L1:0"], ["L1:1", "C1:0"]);
    }
  }
  document
    .querySelectorAll("[data-preset]")
    .forEach((b) => b.classList.toggle("loaded", b.dataset.preset === example));
  pending = null;
  chosen = example ? "V1" : null;
  stale();
  refresh();
  say(
    example
      ? `Montaje ${example} cargado. Puedes recablearlo o añadir piezas.`
      : "Añade una pieza para comenzar.",
  );
}
let view3d = null;
const symbols = {
  R: "M-48 0h20l4 -8 8 16 8 -16 8 16 8 -16 8 16 8 -16 4 8h12",
  C: "M-48 0h41m0 -17v34m14 -34v34m0 -17h41",
  L: "M-48 0h16a8 13 0 0 1 16 0a8 13 0 0 1 16 0a8 13 0 0 1 16 0a8 13 0 0 1 16 0h16",
  V: "M-48 0h30m36 0h30M-10 0h8m-4 -4v8m9 -4h8",
};
function draw() {
  if (!$("free-3d").hidden) view3d?.(parts, wires, term);
  $("part-count").textContent =
    `${parts.length} ${parts.length === 1 ? "pieza" : "piezas"} · ${wires.length} ${wires.length === 1 ? "cable" : "cables"}`;
  svg.innerHTML =
    wires
      .map(([a, b], i) => {
        const d = trace(a, b, term)
          .map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`)
          .join(" ");
        return `<g data-wire="${i}" role="button" tabindex="0" aria-label="Cable ${a} a ${b}" class="wire"><path d="${d}" fill="none" stroke="transparent" stroke-width="15"/><path d="${d}" fill="none" stroke-linejoin="round" stroke="${chosen === "w" + i ? "#db662f" : "#5278a8"}" stroke-width="3"/></g>`;
      })
      .join("") +
    parts
      .map(
        (p) =>
          `<g transform="translate(${p.x} ${p.y}) rotate(${(p.turn || 0) * 90})"><g class="item" data-item="${p.id}" tabindex="0" role="button" aria-label="Editar ${p.id}"><rect x="-40" y="-36" width="80" height="72" rx="4" fill="${chosen === p.id ? "#5387b915" : "transparent"}" stroke="${chosen === p.id ? "#809fc2" : "none"}" stroke-dasharray="3 4"/><text transform="rotate(${-90 * (p.turn || 0)} 0 -24)" y="-20" text-anchor="middle" font-size="12">${p.id}</text>${p.k === "V" ? '<circle r="16" fill="none" stroke="#284c80"/>' : ""}<path d="${symbols[p.k]}" stroke="${{ R: "#a15c36", C: "#356a9b", L: "#3b7157", V: "#2d4b6a" }[p.k]}" stroke-linejoin="round" stroke-width="3" fill="none"/><text transform="rotate(${-90 * (p.turn || 0)} 0 25)" y="29" text-anchor="middle" font-size="12">${p.val} ${unit[p.k]}</text></g>${[0, 1].map((i) => `<circle class="node" role="button" tabindex="0" aria-label="${p.id}, terminal ${i + 1}" data-node="${p.id}:${i}" cx="${i ? 48 : -48}" r="6" stroke="#204b84" stroke-width="2" fill="${pending === p.id + ":" + i ? "#ffac52" : "#c6e6ff"}"/>`).join("")}</g>`,
      )
      .join("");
}
function syncSlider(p) {
  const slider = $("adjust");
  slider.disabled = !p;
  if (!p) return;
  slider.max = Math.max(p.val, { R: 200, L: 500, C: 500, V: 24 }[p.k]);
  slider.value = p.val;
  $("adjust-label").textContent = `Ajustar ${p.id} (${unit[p.k]})`;
}
function refresh() {
  draw();
  const p = part(chosen);
  $("name").textContent = p
    ? names[p.k] + " " + p.id
    : chosen
      ? "Cable"
      : "Sin selección";
  $("val-label").textContent = p
    ? "Valor (" + unit[p.k] + ")"
    : chosen
      ? "Conexión seleccionada"
      : "Selecciona una pieza";
  $("val").hidden = !p;
  $("val").disabled = !p;
  $("val").value = p?.val ?? "";
  syncSlider(p);
  $("rotate").disabled = !p;
  $("trash").disabled = $("remove").disabled = !chosen;
  document.querySelector("[data-add=V]").disabled = parts.some(
    (p) => p.k === "V",
  );
  const old = $("probe").value;
  $("probe").replaceChildren(...parts.map((p) => new Option(p.id, p.id)));
  $("probe").value = parts.some((p) => p.id === old)
    ? old
    : (parts[0]?.id ?? "");
}
function node(t) {
  if (!pending) {
    pending = t;
    say("Elige el terminal de destino. Esc cancela.");
  } else {
    if (
      pending !== t &&
      !wires.some((w) => w.includes(t) && w.includes(pending))
    ) {
      wires.push([pending, t]);
      stale();
      say("Cable conectado.");
    } else say("Sin cambios en el cableado.");
    pending = null;
  }
  draw();
}
function point(e) {
  const p = svg.createSVGPoint();
  p.x = e.clientX;
  p.y = e.clientY;
  return p.matrixTransform(svg.getScreenCTM().inverse());
}
function select(el) {
  if (el.dataset.node) {
    node(el.dataset.node);
    return;
  }
  chosen = el.dataset.item || "w" + el.dataset.wire;
  pending = null;
  refresh();
}
let gesture = null;
const trash = $("trash");
function aboveTrash(e) {
  const b = trash.getBoundingClientRect();
  return (
    b.width > 0 &&
    b.height > 0 &&
    e.clientX >= b.left &&
    e.clientX <= b.right &&
    e.clientY >= b.top &&
    e.clientY <= b.bottom
  );
}
function highlightTrash(over) {
  trash.classList.toggle("over", over);
  trash.querySelector("span").textContent = over
    ? "Soltar para eliminar"
    : "Caneca";
}
function preview(pt) {
  svg.querySelector(".draft")?.remove();
  if (!pending) return;
  const [x, y] = term(pending),
    line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  for (const [key, v] of Object.entries({
    x1: x,
    y1: y,
    x2: pt.x,
    y2: pt.y,
    class: "draft",
  }))
    line.setAttribute(key, v);
  svg.prepend(line);
}
svg.onpointerdown = (e) => {
  if (gesture || e.button !== 0) return;
  const el = e.target.closest("[data-item],[data-node],[data-wire]");
  if (!el) return;
  e.preventDefault();
  const pt = point(e);
  gesture = {
    pid: e.pointerId,
    start: el.dataset.node,
    previous: pending,
    deletable: !el.dataset.node,
  };
  svg.setPointerCapture(e.pointerId);
  if (el.dataset.node) {
    if (!pending) node(el.dataset.node);
    preview(pt);
    return;
  }
  select(el);
  if (el.dataset.item) {
    const p = part(chosen);
    drag = { id: p.id, x: pt.x - p.x, y: pt.y - p.y };
    svg.classList.add("holding");
  }
};
svg.onpointermove = (e) => {
  if (gesture && gesture.pid !== e.pointerId) return;
  if (gesture?.deletable) highlightTrash(aboveTrash(e));
  const pt = point(e);
  if (!drag) {
    if (pending) preview(pt);
    return;
  }
  const p = part(drag.id);
  p.x = Math.max(52, Math.min(628, pt.x - drag.x));
  p.y = Math.max(
    p.turn % 2 ? 56 : 40,
    Math.min(p.turn % 2 ? 364 : 380, pt.y - drag.y),
  );
  draw();
};
function finish(e, cancel = false) {
  if (gesture?.pid !== e.pointerId) return;
  const g = gesture;
  gesture = null;
  drag = null;
  svg.classList.remove("holding");
  if (svg.hasPointerCapture(e.pointerId))
    svg.releasePointerCapture(e.pointerId);
  highlightTrash(false);
  if (!cancel && g.deletable && aboveTrash(e)) {
    removeSelection();
    return;
  }
  if (g.start) {
    const dest = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest("[data-node]")?.dataset.node;
    if (cancel || !dest) {
      pending = null;
      draw();
    } else if (dest !== pending || g.previous) node(dest);
    svg.querySelector(".draft")?.remove();
  }
}
svg.onpointerup = (e) => finish(e);
svg.onpointercancel = svg.onlostpointercapture = (e) => finish(e, true);
svg.onkeydown = (e) => {
  if (e.key === "Escape") {
    pending = null;
    draw();
    say("Conexión cancelada.");
    return;
  }
  const el = e.target.closest("[data-item],[data-node],[data-wire]");
  if (el && ["Enter", " "].includes(e.key)) {
    e.preventDefault();
    const key = Object.keys(el.dataset)[0],
      v = el.dataset[key];
    select(el);
    svg.querySelector(`[data-${key}="${v}"]`)?.focus();
  }
};
document.querySelectorAll("[data-add]").forEach(
  (b) =>
    (b.onclick = () => {
      if (
        b.dataset.add !== "V" &&
        parts.filter((p) => p.k !== "V").length >= 12
      ) {
        say("Máximo: 12 componentes y una fuente.");
        return;
      }
      const k = b.dataset.add,
        id = k === "V" ? "V1" : k + ++counter[k];
      let spots = [];
      for (let y of [75, 155, 235, 315])
        for (let x of [85, 215, 345, 475, 605]) spots.push([x, y]);
      let [x, y] = spots.find(([x, y]) =>
        parts.every((p) => Math.abs(p.x - x) > 105 || Math.abs(p.y - y) > 73),
      ) || [330, 200];
      parts.push({ k, id, x, y, val: k === "V" ? 5 : k === "R" ? 20 : 100 });
      chosen = id;
      pending = null;
      stale();
      refresh();
      say("Pieza añadida. Conecta sus dos terminales.");
    }),
);
$("rotate").onclick = () => {
  const p = part(chosen);
  if (!p) return;
  p.turn = ((p.turn || 0) + 1) % 4;
  if (p.turn % 2) p.y = Math.max(56, Math.min(364, p.y));
  draw();
  say(
    `${p.id}: ${p.turn % 2 ? "vertical" : "horizontal"} (${p.turn * 90}°). Conexiones conservadas.`,
  );
};
function removeSelection() {
  if (!chosen) return;
  const label = part(chosen)?.id || "Cable";
  if (part(chosen)) {
    parts = parts.filter((p) => p.id !== chosen);
    wires = wires.filter((w) => w.every((t) => t.split(":")[0] !== chosen));
  } else wires.splice(Number(chosen.slice(1)), 1);
  chosen = parts[0]?.id ?? null;
  pending = null;
  stale();
  refresh();
  say(`${label} eliminado del montaje.`);
}
$("remove").onclick = trash.onclick = removeSelection;
$("val").onchange = (e) => {
  let p = part(chosen),
    v = e.target.valueAsNumber;
  if (!p) return;
  if (!Number.isFinite(v) || v < 0.01 || v > 10000) {
    say("Introduce un valor entre 0,01 y 10 000.");
    e.target.value = p.val;
    return;
  }
  p.val = v;
  syncSlider(p);
  stale();
  draw();
  say("Valor actualizado.");
};
$("adjust").oninput = (e) => {
  const p = part(chosen);
  if (!p) return;
  p.val = Number(Number(e.target.value).toFixed(2));
  $("val").value = p.val;
  stale();
  draw();
};
$("clear").onclick = () => init(false);
document
  .querySelectorAll("[data-preset]")
  .forEach((b) => (b.onclick = () => init(b.dataset.preset)));
$("excitation").onchange = $("duration").onchange = $("probe").onchange = stale;
function paintFlow(positions) {
  let layer = svg.querySelector(".flow-layer");
  if (!positions.length) {
    layer?.remove();
    if (!$("free-3d").hidden) view3d?.flow([]);
    return;
  }
  if (!$("free-3d").hidden) {
    view3d?.flow(positions);
    return;
  }
  if (!layer) {
    layer = document.createElementNS(svg.namespaceURI, "g");
    layer.setAttribute("class", "flow-layer");
    layer.setAttribute("pointer-events", "none");
    svg.append(layer);
  }
  layer.innerHTML = positions
    .flat()
    .map(
      ([x, y]) =>
        `<circle cx="${x}" cy="${y}" r="4" fill="#ffcb53" stroke="#744d0f"/>`,
    )
    .join("");
}
$("show-flow").onclick = () => {
  showFlow = !showFlow;
  $("show-flow").setAttribute("aria-pressed", showFlow);
  $("show-flow").textContent = showFlow ? "Ocultar flujo" : "Mostrar flujo";
  stale();
};
function measure() {
  const state = $("signal-state");
  if (!parts.some((p) => p.k === "V")) {
    state.textContent = parts.length
      ? "Falta la fuente de tensión."
      : "Lienzo vacío.";
    return;
  }
  try {
    const id = $("probe").value,
      ms = +$("duration").value,
      currents = [],
      data = simulate(
        parts,
        wires,
        id,
        ms,
        (row) => currents.push(row),
        $("excitation").value,
      );
    $("show-flow").disabled = false;
    const peak = Math.max(
        1e-15,
        ...currents.map((row) => Math.max(0, ...row.map(Math.abs))),
      ),
      offset = wires.map(() => 0),
      phases = currents.map((row) =>
        row.map((i, k) => (offset[k] += (i / peak) * 0.008)),
      );
    $("readings").innerHTML = ["Tensión (V)", "Corriente (mA)"]
      .map((title, k) => {
        const vals = data.map((row) => row[k] * (k ? 1000 : 1)),
          hi = Math.max(0, ...vals),
          lo = Math.min(0, ...vals),
          pts = vals
            .map(
              (v, i) =>
                `${55 + (325 * i) / (vals.length - 1)},${115 - ((v - lo) / (hi - lo || 1)) * 90}`,
            )
            .join(" ");
        return `<section class="readout"><strong>${id} · ${title}</strong><svg viewBox="0 0 390 145" aria-label="${title} en función del tiempo"><path d="M55 55H380 M55 85H380 M136.25 25V115 M217.5 25V115 M298.75 25V115 M380 25V115" stroke="#303b49" fill="none"/><path d="M55 20v95h325M55 25h325" fill="none" stroke="#536680"/><g font-size="10" fill="#c8d9ed"><text x="2" y="28">${hi.toPrecision(3)}</text><text x="2" y="117">${lo.toPrecision(3)}</text><text x="55" y="136">0</text><text x="217.5" y="136" text-anchor="middle">${ms / 2}</text><text x="380" y="136" text-anchor="end">${ms} ms</text></g><line class="time-cursor" x1="55" x2="55" y1="20" y2="115" stroke="#ffe08c"/><polyline points="${pts}" fill="none" stroke="#a7d2ff" stroke-width="2"/></svg></section>`;
      })
      .join("");
    const model = seriesModel(parts, wires);
    $("calculation-steps").replaceChildren(...calculationSteps(model, parts, id, ms, $("excitation").value).map(text => {
      const li = document.createElement("li"); li.textContent = text; return li;
    }));
    state.textContent =
      `Respuesta de ${id} · ${$("excitation").value === "pulse" ? "fuente a 0 V desde " + ms / 2 + " ms" : "escalón DC"} · ventana de ${ms} ms. ` +
      describe(model);
    const cursors = $("readings").querySelectorAll(".time-cursor"),
      slider = $("time-slider"),
      transport = $("transport");
    let start = performance.now(),
      playing = true;
    slider.disabled = transport.disabled = false;
    transport.textContent = "Pausar";
    function display(f) {
      const j = Math.max(0, Math.round(f * (data.length - 1))),
        [v, i] = data[j];
      slider.value = j;
      $("board-reading").textContent = $("meter").textContent =
        `${id} · ${(((j + 1) * ms) / data.length).toFixed(2)} ms · ${v.toFixed(3)} V · ${(1000 * i).toFixed(2)} mA`;
      if (showFlow) {
        lastPositions = wires.map(([a, b], k) =>
          Math.abs(currents[j][k]) / peak < 0.001
            ? []
            : [0, 1 / 3, 2 / 3].map((off) =>
                pointAlong(trace(a, b, term), off + phases[j][k]),
              ),
        );
        paintFlow(lastPositions);
      }
      for (const c of cursors) {
        c.setAttribute("x1", 55 + 325 * f);
        c.setAttribute("x2", 55 + 325 * f);
      }
    }
    function pause() {
      cancelAnimationFrame(playback);
      playing = false;
      transport.textContent = +slider.value === 599 ? "Repetir" : "Continuar";
    }
    function tick(now) {
      if ($("lab").hidden || document.hidden) return;
      const elapsed = Math.max(
          0,
          ((now - start) / 3000) * Number($("speed").value),
        ),
        f = window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 1
          : showFlow
            ? elapsed % 1
            : Math.min(1, elapsed);
      display(f);
      if (f < 1) playback = requestAnimationFrame(tick);
      else pause();
    }
    slider.oninput = () => {
      pause();
      display(+slider.value / 599);
    };
    transport.onclick = () => {
      if (playing) {
        pause();
        return;
      }
      const fraction = +slider.value === 599 ? 0 : +slider.value / 599;
      start = performance.now() - (3000 * fraction) / Number($("speed").value);
      playing = true;
      transport.textContent = "Pausar";
      playback = requestAnimationFrame(tick);
    };
    $("speed").onchange = () => {
      start =
        performance.now() -
        (3000 * (+slider.value / 599)) / Number($("speed").value);
    };
    $("rewind").onclick = () => {
      if (slider.disabled) return;
      slider.value = 0;
      slider.oninput();
    };
    display(0);
    playback = requestAnimationFrame(tick);
  } catch (e) {
    state.textContent = e.message;
  }
}
init("RLC");

$("projection").onclick = async () => {
  const pane = $("free-3d"),
    button = $("projection");
  if (!pane.hidden) {
    pane.hidden = true;
    svg.style.display = "";
    button.textContent = "Ver placa 3D";
    $("view-title").textContent = "Esquema 2D";
    paintFlow(lastPositions);
    return;
  }
  button.disabled = true;
  try {
    pane.hidden = false;
    svg.style.display = "none";
    view3d ??= (await import("./free-view.js")).mountFree(pane);
    view3d(parts, wires, term);
    view3d.flow(lastPositions);
    button.textContent = "Editar esquema 2D";
    $("view-title").textContent = "Placa 3D";
  } catch {
    pane.hidden = true;
    svg.style.display = "";
    say(
      "Este navegador no admite la vista 3D. Puedes seguir trabajando en el plano.",
    );
  } finally {
    button.disabled = false;
  }
};

function resumeLab() {
  if (!document.hidden && !$("lab").hidden) stale();
  else cancelAnimationFrame(playback);
}
window.addEventListener("hashchange", resumeLab);
document.addEventListener("visibilitychange", resumeLab);
