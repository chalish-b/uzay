import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import type { ItemKind, ItemSnapshot } from "../types/item-registry";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";

// Shared constants for renderers
// Since these things are in world units, a value of 1 takes up a space of 1 unit, which is huge
export const pointScaleDown = 25;
export const lineThicknessScaleDown = 25;

// Type definitions for Three.js scene objects per item kind
export type ThreeSceneTypes = {
  point3d: {
    kind: "point3d";
    geometry: THREE.SphereGeometry;
    material: THREE.MeshPhongMaterial;
    mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhongMaterial>;
  };
  line3d: {
    kind: "line3d";
    curve: THREE.CatmullRomCurve3;
    geometry: THREE.TubeGeometry;
    material: THREE.MeshPhongMaterial;
    mesh: THREE.Mesh<THREE.TubeGeometry, THREE.MeshPhongMaterial>;
  };
  camera3d: {
    kind: "camera3d";
  };
  parametricfunction3d: {
    kind: "parametricfunction3d";
    curve: THREE.CatmullRomCurve3;
    geometry: THREE.TubeGeometry;
    material: THREE.MeshPhongMaterial;
    mesh: THREE.Mesh<THREE.TubeGeometry, THREE.MeshPhongMaterial>;
  };
  axes3d: {
    kind: "axes3d";
    x: {
      curve: THREE.CatmullRomCurve3;
      geometry: THREE.TubeGeometry;
      material: THREE.MeshBasicMaterial;
      mesh: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>;
    };
    y: {
      curve: THREE.CatmullRomCurve3;
      geometry: THREE.TubeGeometry;
      material: THREE.MeshBasicMaterial;
      mesh: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>;
    };
    z: {
      curve: THREE.CatmullRomCurve3;
      geometry: THREE.TubeGeometry;
      material: THREE.MeshBasicMaterial;
      mesh: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>;
    };
    ticks: {
      geometry: THREE.CylinderGeometry;
      x: THREE.InstancedMesh | null;
      y: THREE.InstancedMesh | null;
      z: THREE.InstancedMesh | null;
    };
    arrows: {
      x: THREE.Mesh<THREE.ConeGeometry, THREE.MeshBasicMaterial> | null;
      y: THREE.Mesh<THREE.ConeGeometry, THREE.MeshBasicMaterial> | null;
      z: THREE.Mesh<THREE.ConeGeometry, THREE.MeshBasicMaterial> | null;
    };
  };
  grid3d: {
    kind: "grid3d";
    geometry: LineSegmentsGeometry;
    material: LineMaterial;
    mesh: LineSegments2;
  };
  sphere3d: {
    kind: "sphere3d";
    geometry: THREE.SphereGeometry;
    material: THREE.MeshPhongMaterial;
    mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhongMaterial>;
  };
  vector3d: {
    kind: "vector3d";
    group: THREE.Group;
    shaftGeometry: THREE.CylinderGeometry;
    headGeometry: THREE.ConeGeometry;
    material: THREE.MeshPhongMaterial;
    shaftMesh: THREE.Mesh;
    headMesh: THREE.Mesh;
  };
  overlay3d: {
    kind: "overlay3d";
    cssObject: CSS2DObject;
    element: HTMLDivElement;
  };
  plane3d: {
    kind: "plane3d";
    geometry: THREE.PlaneGeometry;
    material: THREE.MeshPhongMaterial;
    mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshPhongMaterial>;
    edgeGeometry?: THREE.EdgesGeometry;
    edgeMaterial?: THREE.LineBasicMaterial;
    edgeLines?: THREE.LineSegments;
  };
  surface3d: {
    kind: "surface3d";
    geometry: THREE.BufferGeometry;
    material: THREE.MeshPhongMaterial;
    mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhongMaterial>;
  };
};

export type ThreeSceneObject<K extends ItemKind = ItemKind> =
  ThreeSceneTypes[K];

// Renderer contract.
// `threeScene` is the item's own container in the scene graph (a per-item
// group the view owns), not the root scene. Renderers only ever add/remove
// their objects on it, which lets the view toggle camera-scoped visibility on
// the whole item without touching the item's own `visible` field.
export type ItemRenderer<K extends ItemKind> = {
  create(item: ItemSnapshot<K>, threeScene: THREE.Object3D): ThreeSceneTypes[K];
  update(item: ItemSnapshot<K>, obj: ThreeSceneTypes[K], threeScene: THREE.Object3D): void;
  dispose?(obj: ThreeSceneTypes[K], threeScene: THREE.Object3D): void;
};
