import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import type { ItemKind, ItemSnapshot } from "../types/item-registry";
import type { ViewLayoutContext2D } from "../types/view-context";

// Stacking offsets so 2D items don't z-fight on the z=0 plane.
// Higher z draws on top.
export const Z_GRID = -0.01;
export const Z_REGION = -0.003;
export const Z_REGION_STROKE = -0.002;
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
    layoutKey: string | null;
  };
  axes2d: {
    kind: "axes2d";
    x: Axes2DAxisObject;
    y: Axes2DAxisObject;
    labels: Axes2DLabelObject[];
    layoutKey: string | null;
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
  region2d: {
    kind: "region2d";
    geometry: THREE.ShapeGeometry;
    material: THREE.MeshBasicMaterial;
    mesh: THREE.Mesh<THREE.ShapeGeometry, THREE.MeshBasicMaterial>;
    strokes: Region2DStrokeObject[];
  };
  parametricfunction2d: {
    kind: "parametricfunction2d";
    geometry: LineGeometry;
    material: LineMaterial;
    mesh: Line2;
  };
  function2d: {
    kind: "function2d";
    geometry: LineSegmentsGeometry;
    material: LineMaterial;
    mesh: LineSegments2;
    layoutKey: string | null;
  };
  overlay2d: {
    kind: "overlay2d";
    cssObject: CSS2DObject;
    element: HTMLDivElement;
  };
};

// One stroke loop per region polygon.
export type Region2DStrokeObject = {
  geometry: LineGeometry;
  material: LineMaterial;
  mesh: Line2;
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

export type Axes2DLabelObject = {
  cssObject: CSS2DObject;
  element: HTMLDivElement;
};

export type ThreeSceneObject<K extends ItemKind = ItemKind> = ThreeSceneTypes[K];

export type ItemRenderer<K extends ItemKind> = {
  create(item: ItemSnapshot<K>, threeScene: THREE.Scene): ThreeSceneTypes[K];
  update(item: ItemSnapshot<K>, obj: ThreeSceneTypes[K], threeScene: THREE.Scene): void;
  layout?(item: ItemSnapshot<K>, obj: ThreeSceneTypes[K], ctx: ViewLayoutContext2D): void;
  dispose?(obj: ThreeSceneTypes[K], threeScene: THREE.Scene): void;
};
