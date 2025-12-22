import * as THREE from "three";
import type { ItemKind, ItemSnapshot } from "../common-types/item-registry";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";

// Shared constants for renderers
export const pointScaleDown = 25;
export const lineThicknessScaleDown = 25;

// Type definitions for Three.js scene objects per item kind
export type ThreeSceneTypes = {
  point3d: {
    kind: "point3d";
    geometry: THREE.SphereGeometry;
    material: THREE.MeshBasicMaterial;
    mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  };
  line3d: {
    kind: "line3d";
    curve: THREE.CatmullRomCurve3;
    geometry: THREE.TubeGeometry;
    material: THREE.MeshBasicMaterial;
    mesh: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>;
  };
  camera3d: {
    kind: "camera3d";
  };
  parametricfunction3d: {
    kind: "parametricfunction3d";
    curve: THREE.CatmullRomCurve3;
    geometry: THREE.TubeGeometry;
    material: THREE.MeshBasicMaterial;
    mesh: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>;
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
  };
  grid3d: {
    kind: "grid3d";
    geometry: LineGeometry
    material: LineMaterial
    mesh: Line2,
  };
};

export type ThreeSceneObject<K extends ItemKind = ItemKind> =
  ThreeSceneTypes[K];

// Renderer contract
export type ItemRenderer<K extends ItemKind> = {
  create(item: ItemSnapshot<K>, threeScene: THREE.Scene): ThreeSceneTypes[K];
  update(item: ItemSnapshot<K>, obj: ThreeSceneTypes[K]): void;
  dispose?(obj: ThreeSceneTypes[K], threeScene: THREE.Scene): void;
};

// Import individual renderers
import { point3dRenderer } from "./point3d";
import { line3dRenderer } from "./line3d";
import { parametricFunction3dRenderer } from "./parametric-function3d";
import { axes3dRenderer } from "./axes3d";
import { grid3dRenderer } from "./grid3d";
import { camera3dRenderer } from "./camera3d";

// Registry mapping item kinds to their renderers
export const rendererRegistry: { [K in ItemKind]: ItemRenderer<K> } = {
  point3d: point3dRenderer,
  line3d: line3dRenderer,
  parametricfunction3d: parametricFunction3dRenderer,
  axes3d: axes3dRenderer,
  grid3d: grid3dRenderer,
  camera3d: camera3dRenderer,
};

// Helper function to get a typed renderer for a specific kind
export function getRenderer<K extends ItemKind>(kind: K): ItemRenderer<K> {
  return rendererRegistry[kind] as ItemRenderer<K>;
}
