import { Vec3, vec3 } from "./core/common-types/vec3";
import { Scene3D } from "./core/scene3d";
import { View3D } from "./core/view3d";
import "./index.css";

const scene = new Scene3D();

// Atom set up
const p1atom = scene.atom(vec3(1, 1, 1));
const p2atom = scene.atom((get) => Vec3.scaled(get(p1atom), 2));

// Connect it to the range input
const rangeInput = document.querySelector("#slider-input") as HTMLInputElement;
rangeInput.addEventListener("input", (e) => {
  const value = +(e.target as HTMLInputElement).value;
  p1atom.set((prev) => vec3(prev.x, value, prev.z));
});
p1atom.sub(() => {
  rangeInput.value = p1atom.get().y.toFixed(2);
});

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
  coords: vec3(0, 0, 0),
  color: "green",
});

const line = scene.create("line3d", {
  start: p1atom,
  end: p2atom,
  color: "pink",
  thickness: 1,
});

const maxTAtom = scene.atom(10);
rangeInput.addEventListener("input", (e) => {
  const value = +(e.target as HTMLInputElement).value;
  maxTAtom.set(value);
});
maxTAtom.sub(() => {
  rangeInput.value = maxTAtom.get().toFixed(2);
});

const func = scene.create("parametricfunction3d", {
  f: (t) => vec3(Math.sin(t) * 2, t, Math.cos(t) * 2),
  tStart: scene.atom((get) => -get(maxTAtom)),
  tEnd: maxTAtom,
  color: scene.atom((get) => `hsl(50, ${get(maxTAtom) * 20}%, 50%)`),
  thickness: 1,
  samples: scene.atom((get) => get(maxTAtom) * 11),
});

const funcAtom = scene.atom((get) => {
  const a = get(maxTAtom);
  return (t: number) => vec3(t, Math.sin(t * a), 0);
});
const func2 = scene.create("parametricfunction3d", {
  f: funcAtom,
  tStart: -20,
  tEnd: 20,
  color: "white",
  thickness: 0.5,
  samples: scene.atom((get) => get(maxTAtom) * 256),
});

// Connect the button to randomize the colors of the points
const btnElem = document.querySelector("#button-input") as HTMLButtonElement;
btnElem.addEventListener("click", () => {
  const randomValue = () => Math.floor(Math.random() * 256);
  const randomColor = () =>
    `rgb(${randomValue()}, ${randomValue()}, ${randomValue()})`;
  p1.color.set(randomColor());
  p2.color.set(randomColor());
  p3.color.set(randomColor());
  line.color.set(randomColor());
  line.thickness.set(randomValue() / 150);
  func.thickness.set(randomValue() / 150);
});

const axes = scene.create("axes3d", {
  y: false,
});

const cam1 = scene.create("camera3d", {
  position: vec3(10, 10, 10),
  lookAt: vec3(0, 0, 0),
  zoom: 2,
});

// View set up
const container = document.querySelector("#canvas-container") as HTMLElement;
const view = new View3D(scene, cam1.id, container);
