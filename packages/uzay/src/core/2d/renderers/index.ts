import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import type { ItemKind, ItemSnapshot } from "../types/item-registry";

// Stacking offsets so 2D items don't z-fight on the z=0 plane.
// Higher z draws on top.
export const Z_GRID = -0.01;
export const Z_DEFAULT = 0;
export const Z_POINT = 0.01;

// Per-item Three.js scene object types.
export type ThreeSceneTypes = {
  camera2d: {
    kind: "camera2d";
  };
  point2d: {
    kind: "point2d";
    geometry: THREE.CircleGeometry;
    material: THREE.MeshBasicMaterial;
    mesh: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  };
  grid2d: {
    kind: "grid2d";
    geometry: LineSegmentsGeometry;
    material: LineMaterial;
    mesh: LineSegments2;
  };
  axes2d: {
    kind: "axes2d";
    x: Axes2DAxisObject;
    y: Axes2DAxisObject;
  };
  line2d: {
    kind: "line2d";
    geometry: LineGeometry;
    material: LineMaterial;
    mesh: Line2;
  };
  vector2d: {
    kind: "vector2d";
    group: THREE.Group;
    shaftGeometry: LineGeometry;
    shaftMaterial: LineMaterial;
    shaftMesh: Line2;
    headGeometry: THREE.BufferGeometry;
    headMaterial: THREE.MeshBasicMaterial;
    headMesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  };
};

// Per-axis bundle for axes2d: a line plus optional tick and arrow meshes.
export type Axes2DAxisObject = {
  line: {
    geometry: LineGeometry;
    material: LineMaterial;
    mesh: Line2;
  };
  ticks: {
    geometry: LineSegmentsGeometry;
    material: LineMaterial;
    mesh: LineSegments2;
  } | null;
  arrow: {
    geometry: THREE.BufferGeometry;
    material: THREE.MeshBasicMaterial;
    mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  } | null;
};

export type ThreeSceneObject<K extends ItemKind = ItemKind> = ThreeSceneTypes[K];

export type ItemRenderer<K extends ItemKind> = {
  create(item: ItemSnapshot<K>, threeScene: THREE.Scene): ThreeSceneTypes[K];
  update(item: ItemSnapshot<K>, obj: ThreeSceneTypes[K], threeScene: THREE.Scene): void;
  dispose?(obj: ThreeSceneTypes[K], threeScene: THREE.Scene): void;
};

import { camera2dRenderer } from "./camera2d";
import { point2dRenderer } from "./point2d";
import { grid2dRenderer } from "./grid2d";
import { axes2dRenderer } from "./axes2d";
import { line2dRenderer } from "./line2d";
import { vector2dRenderer } from "./vector2d";

export const rendererRegistry: { [K in ItemKind]: ItemRenderer<K> } = {
  camera2d: camera2dRenderer,
  point2d: point2dRenderer,
  grid2d: grid2dRenderer,
  axes2d: axes2dRenderer,
  line2d: line2dRenderer,
  vector2d: vector2dRenderer,
};

export function getRenderer<K extends ItemKind>(kind: K): ItemRenderer<K> {
  return rendererRegistry[kind] as ItemRenderer<K>;
}
