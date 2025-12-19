import { Vec3, vec3 } from "./core/common-types/vec3";
import { Scene3D } from "./core/scene3d";
import "./index.css";

const scene = new Scene3D();

// Atom set up
const p1atom = scene.atom(vec3(1, 2, 3));
const p2atom = scene.atom((get) => Vec3.scaled(get(p1atom), 2));

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
