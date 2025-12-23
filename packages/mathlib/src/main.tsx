import { Vec3, vec3 } from "./core/common-types/vec3";
import { Scene3D } from "./core/scene3d";
import { View3D } from "./core/view3d";
import "./index.css";

const scene = new Scene3D();

// Atom set up
// const p1atom = scene.atom(vec3(1, 1, 1));
// const p2atom = scene.atom((get) => Vec3.scaled(get(p1atom), 2));

// Connect it to the range input
const rangeInput = document.querySelector("#slider-input") as HTMLInputElement;
const xAtom = scene.atom(0);
rangeInput.addEventListener("input", (e) => {
  const value = +(e.target as HTMLInputElement).value;
  xAtom.set(value);
});
xAtom.sub(() => {
  rangeInput.value = xAtom.get().toFixed(2);
});

// // Scene objects set up
// // Passing a primitive atom
// const p1 = scene.create("point3d", {
//   coords: p1atom,
//   color: "red",
// });

// // Passing a dead only atom
// const p2 = scene.create("point3d", {
//   coords: p2atom,
//   color: "blue",
// });

// // Passing a plain value (should be converted to PrimitiveAtom)
// const p3 = scene.create("point3d", {
//   coords: vec3(0, 0, 0),
//   color: "green",
// });

// const line = scene.create("line3d", {
//   start: p1atom,
//   end: p2atom,
//   color: "pink",
//   thickness: 1,
// });

// const maxTAtom = scene.atom(10);
// rangeInput.addEventListener("input", (e) => {
//   const value = +(e.target as HTMLInputElement).value;
//   maxTAtom.set(value);
// });
// maxTAtom.sub(() => {
//   rangeInput.value = maxTAtom.get().toFixed(2);
// });

const helix = scene.create("parametricfunction3d", {
  f: (t) => vec3(t, Math.sin(t), Math.cos(t)),
  tStart: 0,
  tEnd: xAtom,
  color: "dodgerblue",
  thickness: 1,
  samples: scene.atom((get) => get(xAtom) * 16),
});

const point = scene.create("point3d", {
  coords: scene.atom((get) => {
    const x = get(xAtom);
    return vec3(x, Math.sin(x), Math.cos(x));
  }),
  color: "gold",
  radius: 2,
});

const circleAtom = scene.atom((get) => {
  const x = get(xAtom);
  return (t: number) => vec3(x, Math.cos(t), Math.sin(t));
});
const circle = scene.create("parametricfunction3d", {
  f: circleAtom,
  tStart: 0,
  tEnd: Math.PI * 2 + 0.01,
  color: "crimson",
  thickness: 1,
  samples: 32,
});
// const sine = scene.create("parametricfunction3d", {
//   f: (t) => vec3(t, Math.sin(t), -1),
//   tStart: 0,
//   tEnd: xAtom,
//   color: "yellow",
//   thickness: 0.5,
//   samples: scene.atom((get) => get(xAtom) * 16),
// });

const line = scene.create("line3d", {
  start: scene.atom((get) => vec3(get(xAtom), 0, 0)),
  end: scene.atom((get) =>
    vec3(get(xAtom), Math.sin(get(xAtom)), Math.cos(get(xAtom)))
  ),
  color: "gold",
  thickness: 1,
});

// const funcAtom = scene.atom((get) => {
//   const a = get(maxTAtom);
//   return (t: number) => vec3(t, Math.sin(t * a), 0);
// });
// const func2 = scene.create("parametricfunction3d", {
//   f: funcAtom,
//   tStart: -20,
//   tEnd: 20,
//   color: "white",
//   thickness: 0.5,
//   samples: scene.atom((get) => get(maxTAtom) * 256),
// });

// // Connect the button to randomize the colors of the points
// const btnElem = document.querySelector("#button-input") as HTMLButtonElement;
// btnElem.addEventListener("click", () => {
//   const randomValue = () => Math.floor(Math.random() * 256);
//   const randomColor = () =>
//     `rgb(${randomValue()}, ${randomValue()}, ${randomValue()})`;
//   p1.color.set(randomColor());
//   p2.color.set(randomColor());
//   p3.color.set(randomColor());
//   line.color.set(randomColor());
//   line.thickness.set(randomValue() / 150);
//   func.thickness.set(randomValue() / 150);
// });

const axes = scene.create("axes3d", {
  x: [-10, 10],
  y: scene.atom((get) => [-get(xAtom), get(xAtom)]),
  z: [0, 10],
  thickness: 0.5,
});

// const grid = scene.create("grid3d", {
//   plane: "xy",
//   range1: [-10, 10],
//   range2: [0, 10],
//   color: "#555",
// })
const grid2 = scene.create("grid3d", {
  plane: "xz",
  range1: scene.atom((get) => [-get(xAtom), get(xAtom)]),
  range2: scene.atom((get) => [-get(xAtom), get(xAtom)]),
  color: "#555",
});

const cam1 = scene.create("camera3d", {
  position: vec3(10, 10, 10),
  lookAt: vec3(0, 0, 0),
  zoom: 2,
});

// View set up
const container = document.querySelector("#canvas-container") as HTMLElement;
const view = new View3D(scene, cam1.id, container);
