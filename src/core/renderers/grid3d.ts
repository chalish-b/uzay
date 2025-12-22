import * as THREE from "three";
import type { ItemSnapshot } from "../common-types/item-registry";
import { type ItemRenderer, type ThreeSceneTypes } from "./index";
import { vec3, type Vec3 } from "../common-types/vec3";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";

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

    // Line2 Experiment
    const geometry = new LineGeometry();
    const flatPos = positions.flatMap((elem) => ([
      elem[0].x, elem[0].y, elem[0].z,
      elem[1].x, elem[1].y, elem[1].z,

      // Hack to make each line separate
      // We should probably use LineSegments2 for this purpose, but this works for now.
      NaN, NaN, NaN,
    ]));
    geometry.setPositions(flatPos);
    const material = new LineMaterial({
      color: item.color,
      linewidth: item.thickness
    });

    // TODO: Make sure you call this based on the container element's size,
    // and on each update / viewport change.
    // Currently the create and update functions can't access those values
    // so idk how this can be done.
    // lineMaterial.resolution.set()

    const mesh = new Line2(geometry, material);
    threeScene.add(mesh);

    return {
      kind: "grid3d",
      geometry,
      material,
      mesh,
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

