import { Vec3, vec3 } from "./core/common-types/vec3";
import { Scene3D } from "./core/scene3d";
import { View3D } from "./core/view3d";
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

const cam1 = scene.camera({
  position: vec3(3, 5, 3),
  lookAt: vec3(0, 0, 1),
});

// View set up
const container = document.querySelector("#board-container");
const view = new View3D(scene, cam1, container);

// Idea for cameras:
// Cameras also live in the scene, but they aren't items.
// They have a special set called "cameras" just like we have "items".
// And each view can have a single camera it views through.
//
// Or, cameras are separate objects, and View takes in Scene + Camera
// This way, different views can have a shared camera but different scenes.
//
// Actually, since camera has atom fields, it also requires a store, which
// is tied to a scene.
// I guess having something like scene.camera() is the best option, just like how
// we have scene.create() for items
