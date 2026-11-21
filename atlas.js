const atlas = document.querySelector(".atlas"),
  time = document.querySelector("#atlas-time");
const play = document.querySelector("#atlas-play"),
  flow = document.querySelector("#atlas-flow");
const names = {
  r: "Potencia disipada",
  l: "Energía magnética",
  c: "Tensión del capacitor",
  v: "Corriente entregada",
};
let part = "r",
  ms = 0,
  frame = null,
  start = 0,
  applied = false;
function sample() {
  const t = ms / 1000,
    e = Math.exp(-100 * t),
    i = applied ? (50 / 300) * e * Math.sin(300 * t) : 0;
  const vc = applied
    ? 5 * (1 - e * (Math.cos(300 * t) + Math.sin(300 * t) / 3))
    : 0;
  const readings = {
    r: [20000 * i * i, "mW"],
    l: [50000 * i * i, "µJ"],
    c: [vc, "V"],
    v: [1000 * i, "mA"],
  };
  const [value, unit] = readings[part];
  document.querySelector("#probe-value").textContent =
    value.toLocaleString("es-CO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) +
    " " +
    unit;
  document.querySelector("#atlas-ms").textContent = ms.toFixed(1) + " ms";
  time.value = ms;
  flow.setAttribute("stroke-dashoffset", -vc * 12);
  flow.setAttribute("opacity", Math.min(1, Math.abs(i) * 20));
  atlas.querySelector('[data-part="c"] ellipse').style.fill =
    `hsl(210 85% ${75 - 4 * vc}%)`;
}
function choose(k) {
  part = k;
  atlas.dataset.selected = k;
  document.querySelector("#probe-name").textContent = names[k];
  for (const el of atlas.querySelectorAll("[data-part], [data-pin] button"))
    el.setAttribute(
      "aria-pressed",
      String(
        (el.dataset.part || el.closest("[data-pin]").dataset.pin) === part,
      ),
    );
  sample();
}
for (const el of atlas.querySelectorAll("[data-part]")) {
  el.onclick = () => choose(el.dataset.part);
  el.onkeydown = (e) => {
    if (["Enter", " "].includes(e.key)) {
      e.preventDefault();
      el.onclick();
    }
  };
}
for (const el of atlas.querySelectorAll("[data-pin]"))
  el.querySelector("button").onclick = () => choose(el.dataset.pin);
function stop() {
  cancelAnimationFrame(frame);
  frame = null;
  play.textContent =
    ms >= 60
      ? "Repetir escalón　↺"
      : applied
        ? "Continuar　▷"
        : "Aplicar 5 V　▷";
}
function tick(now) {
  ms = Math.min(60, (now - start) / 110);
  sample();
  if (ms >= 60) stop();
  else frame = requestAnimationFrame(tick);
}
play.onclick = () => {
  if (frame !== null) {
    stop();
    return;
  }
  if (ms >= 60) ms = 0;
  applied = true;
  start = performance.now() - ms * 110;
  play.textContent = "Pausar　Ⅱ";
  frame = requestAnimationFrame(tick);
};
time.oninput = () => {
  ms = Number(time.value);
  applied = true;
  stop();
  sample();
};
window.addEventListener("hashchange", () => {
  if (location.hash !== "#fundamentos") stop();
});
choose(part);
