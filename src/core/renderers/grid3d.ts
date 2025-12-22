import * as THREE from "three";
import type { ItemSnapshot } from "../common-types/item-registry";
import { lineThicknessScaleDown, type ItemRenderer, type ThreeSceneTypes } from "./index";
import { vec3, type Vec3 } from "../common-types/vec3";

export const grid3dRenderer: ItemRenderer<"grid3d"> = {
  create(item: ItemSnapshot<"grid3d">, threeScene: THREE.Scene): ThreeSceneTypes["grid3d"] {
    // Create position vectors for both axes
    const range1 = typeof item.range1 !== "boolean" ? item.range1 : ([-100, 100] as const);
    const range2 = typeof item.range2 !== "boolean" ? item.range2 : ([-100, 100] as const);
    const positions: [Vec3, Vec3][] = [];
    for (let i = range1[0]; i <= range1[1]; i += item.gap) {
      if (item.plane === "xz") {
        positions.push([
          vec3(i, 0, range2[0]),
          vec3(i, 0, range2[1]),
        ]);
      } else if (item.plane === "xy") {
        positions.push([
          vec3(i, range2[0], 0),
          vec3(i, range2[1], 0),
        ]);
      } else if (item.plane === "yz") {
        positions.push([
          vec3(0, i, range2[0]),
          vec3(0, i, range2[1]),
        ]);
      }
    }
    for (let i = range2[0]; i <= range2[1]; i += item.gap) {
      if (item.plane === "xz") {
        positions.push([
          vec3(range1[0], 0, i),
          vec3(range1[1], 0, i),
        ]);
      } else if (item.plane === "xy") {
        positions.push([
          vec3(range1[0], i, 0),
          vec3(range1[1], i, 0),
        ]);
      } else if (item.plane === "yz") {
        positions.push([
          vec3(0, range1[0], i),
          vec3(0, range1[1], i),
        ]);
      }
    }

    // Material
    const material = new THREE.MeshBasicMaterial({ color: item.color });
    const geometries: ThreeSceneTypes["grid3d"]["geometries"] = []
    const meshes: ThreeSceneTypes["grid3d"]["meshes"] = []

    // Create the lines from the positions
    for (const line of positions) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(line[0].x, line[0].y, line[0].z),
        new THREE.Vector3(line[1].x, line[1].y, line[1].z),
      ]);
      const geometry = new THREE.TubeGeometry(curve, 16, item.thickness / lineThicknessScaleDown);
      const mesh = new THREE.Mesh(geometry, material);
      geometries.push(geometry);
      meshes.push(mesh);
      threeScene.add(mesh);
    }

    return {
      kind: "grid3d",
      geometries,
      material,
      meshes,
    };
  },

  update(item: ItemSnapshot<"grid3d">, obj: ThreeSceneTypes["grid3d"]): void {
    // TODO: Implement grid3d update
    obj.material.color.set(item.color);
  },

  dispose(obj: ThreeSceneTypes["grid3d"], threeScene: THREE.Scene): void {
    for (const mesh of obj.meshes) {
      threeScene.remove(mesh);
    }
    for (const geometry of obj.geometries) {
      geometry.dispose();
    }
    obj.material.dispose();
  },
};

