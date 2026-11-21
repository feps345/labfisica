const pages = {
  introduccion: "intro",
  fundamentos: "theory",
  laboratorio: "lab",
};
let laboratory;
function chapter() {
  const key = Object.hasOwn(pages, location.hash.slice(1))
    ? location.hash.slice(1)
    : "laboratorio";
  for (const [name, id] of Object.entries(pages))
    document.getElementById(id).hidden = name !== key;
  document.querySelectorAll("nav a").forEach((a) => {
    if (a.hash === "#" + key) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  document.title = `LabFisica | ${document.querySelector("nav [aria-current]").textContent}`;
  if (key === "laboratorio") laboratory ??= import("./editor.js");
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", chapter);
chapter();
// Engraved phase study: a decaying helical bundle in oblique projection.
const engravings = [];
for (let strand = 0; strand < 26; strand++) {
  const points = [];
  for (let i = 0; i <= 620; i++) {
    const u = i / 620,
      angle = u * Math.PI * 15 + strand * 0.032,
      radius = 88 * Math.exp(-2.05 * u);
    const x = 48 + 424 * u + 0.29 * radius * Math.cos(angle),
      y = 172 - 28 * u + radius * Math.sin(angle) + strand * 0.24;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  engravings.push(
    `<polyline points="${points.join(" ")}" stroke="hsl(${219 - strand * 0.45} 100% ${75 + strand * 0.82}%)"/>`,
  );
}
document.querySelector("#windings").innerHTML = engravings.join("");
// Route each annotation from its projected component to its HTML definition.
const plate = document.querySelector(".atlas-body");
function connectAnnotations() {
  const bounds = plate.getBoundingClientRect();
  if (!bounds.width) return;
  const overlay = plate.querySelector(".wires");
  overlay.replaceChildren();
  for (const label of plate.querySelectorAll("[data-pin]")) {
    const pin = document
        .getElementById("pin-" + label.dataset.pin)
        .getBoundingClientRect(),
      end = label.querySelector("b").getBoundingClientRect();
    const x = pin.left + pin.width / 2 - bounds.left,
      y = pin.top + pin.height / 2 - bounds.top,
      X = end.left - bounds.left,
      Y = end.top + end.height / 2 - bounds.top;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
    line.setAttribute(
      "d",
      `M${x},${y} L${x + (X - x) * 0.36},${y} L${X - 18},${Y} H${X}`,
    );
    line.dataset.lead = label.dataset.pin;
    overlay.append(line);
  }
}
new ResizeObserver(connectAnnotations).observe(plate);
document.fonts.ready.then(connectAnnotations);

import "./atlas.js";
