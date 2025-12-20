import { Vec3, vec3 } from "./core/common-types/vec3";
import { Scene3D } from "./core/scene3d";
import { View3D } from "./core/view3d";
import "./index.css";

const scene = new Scene3D();

// Atom set up
const p1atom = scene.atom(vec3(1, 2, 3));
const p2atom = scene.atom((get) => Vec3.scaled(get(p1atom), 2));

// Connect it to the range input
const rangeInput = document.querySelector("#slider-input") as HTMLInputElement;
rangeInput.addEventListener("change", (e) => {
  const value = +(e.target as HTMLInputElement).value;
  p1atom.set((prev) => vec3(prev.x, value, prev.z))
})
p1atom.sub(() => {
  rangeInput.value = p1atom.get().y.toFixed(2);
})

// Scene objects set up
// Passing a primitive atom
const p1 = scene.create("point3d", {
  coords: p1atom,
  color: "red",
});

// Passing a dead only atom
const p2 = scene.create("point3d", {
  coords: p2atom,
  color: "blue",
});

// Passing a plain value (should be converted to PrimitiveAtom)
const p3 = scene.create("point3d", {
  coords: vec3(0, 1, 0),
  color: "green",
});

const line = scene.create("line3d", {
  start: p1atom,
  end: p2atom,
  color: "yellow",
  thickness: 2,
});

const cam1 = scene.camera({
  position: vec3(3, 5, 3),
  lookAt: vec3(0, 0, 1),
});

// View set up
const container = document.querySelector("#board-container") as HTMLElement;
const view = new View3D(scene, cam1, container);
