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

// Renderer contract
export type ItemRenderer<K extends ItemKind> = {
  create(item: ItemSnapshot<K>, threeScene: THREE.Scene): ThreeSceneTypes[K];
  update(item: ItemSnapshot<K>, obj: ThreeSceneTypes[K], threeScene: THREE.Scene): void;
  dispose?(obj: ThreeSceneTypes[K], threeScene: THREE.Scene): void;
};

// Import individual renderers
import { point3dRenderer } from "./point3d";
import { line3dRenderer } from "./line3d";
import { parametricFunction3dRenderer } from "./parametric-function3d";
import { axes3dRenderer } from "./axes3d";
import { grid3dRenderer } from "./grid3d";
import { camera3dRenderer } from "./camera3d";
import { sphere3dRenderer } from "./sphere3d";
import { vector3dRenderer } from "./vector3d";
import { overlay3dRenderer } from "./overlay3d";
import { plane3dRenderer } from "./plane3d";
import { surface3dRenderer } from "./surface3d";

// Registry mapping item kinds to their renderers
export const rendererRegistry: { [K in ItemKind]: ItemRenderer<K> } = {
  point3d: point3dRenderer,
  line3d: line3dRenderer,
  parametricfunction3d: parametricFunction3dRenderer,
  axes3d: axes3dRenderer,
  grid3d: grid3dRenderer,
  camera3d: camera3dRenderer,
  sphere3d: sphere3dRenderer,
  vector3d: vector3dRenderer,
  overlay3d: overlay3dRenderer,
  plane3d: plane3dRenderer,
  surface3d: surface3dRenderer,
};

// Helper function to get a typed renderer for a specific kind
export function getRenderer<K extends ItemKind>(kind: K): ItemRenderer<K> {
  return rendererRegistry[kind] as ItemRenderer<K>;
}
