import { trace } from "./routes.mjs";
import * as T from "./vendor/three.module.min.js";
import { OrbitControls } from "./vendor/OrbitControls.js";
// Project the editable schematic's coordinates; there is no separate 3D circuit state.
export function mountFree(el) {
  const renderer = new T.WebGLRenderer({ antialias: true }),
    scene = new T.Scene(),
    camera = new T.OrthographicCamera(-8, 8, 5, -5, 0.1, 100);
  el.append(renderer.domElement);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  scene.background = new T.Color(0x12161c);
  camera.position.set(2, 12, 8);
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.maxPolarAngle = 1.35;
  orbit.minZoom = 0.5;
  orbit.maxZoom = 4;
  orbit.update();
  const paint = () => renderer.render(scene, camera);
  orbit.addEventListener("change", paint);
  scene.add(new T.HemisphereLight(0xffffff, 0x788a9e, 2));
  const lamp = new T.DirectionalLight(0xffffff, 2);
  lamp.position.set(2, 6, 4);
  scene.add(lamp);
  const grid = new T.GridHelper(32, 64, 0x374559, 0x232e3c);
  grid.position.y = -0.52;
  scene.add(grid);
  let group;
  // Permanent substrate; electrical parts and routing can be rebuilt independently.
  function hardware(geometry, color, x, y, z) {
    const obj = new T.Mesh(
      geometry,
      new T.MeshStandardMaterial({ color, roughness: 0.63 }),
    );
    obj.position.set(x, y, z);
    scene.add(obj);
    return obj;
  }
  hardware(new T.BoxGeometry(14.6, 0.24, 9.4), 0x245449, 0, -0.13, 0);
  hardware(new T.BoxGeometry(14.59, 0.045, 9.39), 0xb79c61, 0, -0.24, 0);
  for (const x of [-7, 7])
    for (const z of [-4.4, 4.4]) {
      hardware(
        new T.CylinderGeometry(0.16, 0.16, 0.48, 20),
        0x9f8c59,
        x,
        -0.24,
        z,
      );
      hardware(
        new T.CylinderGeometry(0.084, 0.084, 0.025, 6),
        0x374842,
        x,
        0.013,
        z,
      );
    }
  const silk = document.createElement("canvas");
  silk.width = 1460;
  silk.height = 940;
  const pen = silk.getContext("2d");
  pen.strokeStyle = "#b2daca";
  pen.lineWidth = 2;
  pen.strokeRect(48, 44, 1364, 852);
  pen.fillStyle = "#d2e9da";
  pen.font = "19px monospace";
  pen.fillText("LabFisica   /   BANCO RLC", 68, 82);
  pen.fillText("PLACA 01", 1280, 875);
  for (let x = 80; x < 1410; x += 40)
    pen.fillRect(x, 45, 2, x % 80 === 0 ? 12 : 6);
  const sheet = new T.Mesh(
    new T.PlaneGeometry(14.6, 9.4),
    new T.MeshBasicMaterial({
      map: new T.CanvasTexture(silk),
      transparent: true,
      depthWrite: false,
    }),
  );
  sheet.rotation.x = -Math.PI / 2;
  sheet.position.y = 0.002;
  scene.add(sheet);
  function fit() {
    let w = el.clientWidth,
      h = el.clientHeight;
    if (!w || !h) return;
    let k = Math.max(5.5, (8.6 * h) / w);
    Object.assign(camera, {
      left: (-k * w) / h,
      right: (k * w) / h,
      top: k,
      bottom: -k,
    });
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    paint();
  }
  new ResizeObserver(fit).observe(el);
  const vec = ([x, y]) => new T.Vector3((x - 340) / 50, 0.24, (y - 210) / 50);
  let dots = [];
  const build = (parts, wires, term) => {
    if (group) {
      scene.remove(group);
      group.traverse((o) => {
        o.geometry?.dispose();
        o.material?.map?.dispose();
        o.material?.dispose();
      });
    }
    group = new T.Group();
    scene.add(group);
    dots = [];
    function mesh(g, c, p) {
      let m = new T.Mesh(g, new T.MeshStandardMaterial({ color: c }));
      m.position.copy(p);
      group.add(m);
      return m;
    }
    function tube(a, b, r, c) {
      const v = b.clone().sub(a);
      if (!v.length()) return;
      const m = mesh(
        new T.CylinderGeometry(r, r, v.length(), 16),
        c,
        a.clone().lerp(b, 0.5),
      );
      m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v.normalize());
    }
    for (const [a, b] of wires) {
      dots.push(
        Array.from({ length: 3 }, () => {
          const m = mesh(
            new T.SphereGeometry(0.085, 8, 6),
            0xffcc37,
            new T.Vector3(),
          );
          m.visible = false;
          return m;
        }),
      );
      const points = trace(a, b, term).map((q) => vec(q).setY(0.035));
      for (let i = 1; i < points.length; i++)
        tube(points[i - 1], points[i], 0.04, 0xdac088);
    }
    for (const p of parts) {
      const first = group.children.length;
      let at = (x) => vec([p.x + x, p.y]);
      tube(at(-48), at(-19), 0.035, 0x748597);
      tube(at(19), at(48), 0.035, 0x748597);
      if (p.k === "V")
        mesh(new T.BoxGeometry(0.85, 0.42, 0.5), 0x305481, at(0));
      if (p.k === "R") {
        tube(at(-20), at(20), 0.16, 0xdca567);
        for (let x of [-12, -5, 6, 14]) tube(at(x), at(x + 2), 0.165, 0x624132);
      }
      if (p.k === "C") {
        for (const x of [-8, 8]) tube(at(x - 2), at(x + 2), 0.3, 0x4888be);
        tube(at(-20), at(-8), 0.035, 0x748597);
        tube(at(8), at(20), 0.035, 0x748597);
      }
      if (p.k === "L") {
        const pts = [];
        for (let i = 0; i <= 96; i++) {
          let a = (i * Math.PI) / 8,
            q = at(-20 + (40 * i) / 96);
          q.y += 0.16 * Math.sin(a);
          q.z += 0.16 * (Math.cos(a) - 1);
          pts.push(q);
        }
        mesh(
          new T.TubeGeometry(new T.CatmullRomCurve3(pts), 100, 0.04, 8, false),
          0xbf713f,
          new T.Vector3(),
        );
      }
      for (let x of [-48, 48]) {
        mesh(
          new T.CylinderGeometry(0.14, 0.14, 0.045, 20),
          0xe9c97d,
          at(x).setY(0.04),
        );
        tube(at(x).setY(0.04), at(x), 0.055, 0xb9c3c6);
      }
      if (p.turn) {
        const pivot = vec([p.x, p.y]),
          axis = new T.Vector3(0, 1, 0),
          angle = (-p.turn * Math.PI) / 2;
        for (const obj of group.children.slice(first)) {
          obj.position.sub(pivot).applyAxisAngle(axis, angle).add(pivot);
          obj.rotateOnWorldAxis(axis, angle);
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 48;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#f3fff6";
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(p.id, 64, 37);
      let tag = new T.Sprite(
        new T.SpriteMaterial({
          map: new T.CanvasTexture(canvas),
          depthTest: false,
        }),
      );
      tag.position.copy(at(0));
      tag.position.y += 0.72;
      tag.scale.set(1.6, 0.6, 1);
      group.add(tag);
    }
    fit();
  };
  build.flow = (positions) => {
    dots.forEach((row, i) =>
      row.forEach((m, k) => {
        const p = positions[i]?.[k];
        m.visible = !!p;
        if (p) m.position.copy(vec(p).setY(0.125));
      }),
    );
    paint();
  };
  return build;
}
