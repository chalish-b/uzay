import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import type { ItemKind } from "../../../types/item-registry";
import type { ItemRenderer2D } from "../../../backend";
import type { FunctionSamplingPlan } from "../../../math/function-sampling";
import type { ParametricSamplingPlan } from "../../../math/parametric-sampling";
import { getWorldPerPixel } from "../screen-space";

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
    group: THREE.Group;
    geometry: LineGeometry;
    material: LineMaterial;
    mesh: Line2;
    headGeometry: THREE.BufferGeometry;
    headMaterial: THREE.MeshBasicMaterial;
    headStartMesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
    headEndMesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
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
  circle2d: {
    kind: "circle2d";
    geometry: THREE.CircleGeometry;
    material: THREE.MeshBasicMaterial;
    mesh: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
    stroke: Circle2DStrokeObject | null;
  };
  parametricfunction2d: {
    kind: "parametricfunction2d";
    geometry: LineSegmentsGeometry;
    material: LineMaterial;
    mesh: LineSegments2;
    plan: ParametricSamplingPlan | null;
    hasSegments: boolean;
  };
  function2d: {
    kind: "function2d";
    geometry: LineSegmentsGeometry;
    material: LineMaterial;
    mesh: LineSegments2;
    plan: FunctionSamplingPlan | null;
    hasSegments: boolean;
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

// The çember outline ring, when the circle's stroke is shown.
export type Circle2DStrokeObject = {
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

// Unit arrowhead pointing along +x: tip at the origin, base at (-1, ±0.5),
// lifted slightly above the shaft plane so the filled triangle hides the
// shaft passing under its base. onHeadBeforeRender scales it to its pixel
// size each frame, so the head stays screen-constant at any zoom. Shared by
// vector2d's head and line2d's end arrows.
export function buildUnitHeadGeometry(): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [0, 0, 0.001, -1, 0.5, 0.001, -1, -0.5, 0.001],
      3
    )
  );
  geom.setIndex([0, 1, 2]);
  return geom;
}

// The per-frame scaling hook for a unit head mesh: reads headLength and
// headWidth (CSS pixels) from the mesh's userData and scales against the
// camera's current zoom. Chain it with chainOnBeforeRender.
export function onHeadBeforeRender(
  this: THREE.Object3D,
  renderer: THREE.WebGLRenderer,
  camera: THREE.Camera
) {
  if (!(camera as THREE.OrthographicCamera).isOrthographicCamera) return;
  const wpp = getWorldPerPixel(renderer, camera as THREE.OrthographicCamera);
  const sx = (this.userData.headLength as number) * wpp;
  const sy = (this.userData.headWidth as number) * wpp;
  this.scale.set(sx, sy, 1);
}

// The three.js instantiation of the shared renderer contract: objects are
// three meshes/materials, the container is a THREE.Object3D group.
export type ItemRenderer<K extends ItemKind> = ItemRenderer2D<
  K,
  ThreeSceneTypes,
  THREE.Object3D
>;
