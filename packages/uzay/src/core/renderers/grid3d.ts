import * as THREE from "three";
import type { ItemSnapshot } from "../common-types/item-registry";
import { type ItemRenderer, type ThreeSceneTypes } from "./index";
import { vec3, type Vec3 } from "../common-types/vec3";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";

export const grid3dRenderer: ItemRenderer<"grid3d"> = {
  create(
    item: ItemSnapshot<"grid3d">,
    threeScene: THREE.Scene
  ): ThreeSceneTypes["grid3d"] {
    // Create position vectors for both axes
    const range1 =
      typeof item.range1 !== "boolean" ? item.range1 : ([-100, 100] as const);
    const range2 =
      typeof item.range2 !== "boolean" ? item.range2 : ([-100, 100] as const);
    const positions: [Vec3, Vec3][] = [];
    for (let i = range1[0]; i <= range1[1]; i += item.gap) {
      if (item.plane === "xz") {
        positions.push([
          vec3(i, item.offset, range2[0]),
          vec3(i, item.offset, range2[1]),
        ]);
      } else if (item.plane === "xy") {
        positions.push([
          vec3(i, range2[0], item.offset),
          vec3(i, range2[1], item.offset),
        ]);
      } else if (item.plane === "yz") {
        positions.push([
          vec3(item.offset, i, range2[0]),
          vec3(item.offset, i, range2[1]),
        ]);
      }
    }
    for (let i = range2[0]; i <= range2[1]; i += item.gap) {
      if (item.plane === "xz") {
        positions.push([
          vec3(range1[0], item.offset, i),
          vec3(range1[1], item.offset, i),
        ]);
      } else if (item.plane === "xy") {
        positions.push([
          vec3(range1[0], i, item.offset),
          vec3(range1[1], i, item.offset),
        ]);
      } else if (item.plane === "yz") {
        positions.push([
          vec3(item.offset, range1[0], i),
          vec3(item.offset, range1[1], i),
        ]);
      }
    }

    // Line2 Experiment
    const geometry = new LineGeometry();
    const flatPos = positions.flatMap((elem) => [
      elem[0].x,
      elem[0].y,
      elem[0].z,
      elem[1].x,
      elem[1].y,
      elem[1].z,

      // Hack to make each line separate
      // We should probably use LineSegments2 for this purpose, but this works for now.
      NaN,
      NaN,
      NaN,
    ]);
    geometry.setPositions(flatPos);
    const material = new LineMaterial({
      color: item.color,
      linewidth: item.thickness,
      fog: true,
    });

    // TODO: Make sure you call this based on the container element's size,
    // and on each update / viewport change.
    // Currently the create and update functions can't access those values
    // so idk how this can be done.
    // lineMaterial.resolution.set()

    const mesh = new Line2(geometry, material);
    mesh.visible = item.visible;
    mesh.userData.itemId = item.id;
    threeScene.add(mesh);

    return {
      kind: "grid3d",
      geometry,
      material,
      mesh,
    };
  },

  update(item: ItemSnapshot<"grid3d">, obj: ThreeSceneTypes["grid3d"]): void {
    // Update material properties
    obj.material.color.set(item.color);
    obj.material.linewidth = item.thickness;

    // Recalculate positions
    const range1 =
      typeof item.range1 !== "boolean" ? item.range1 : ([-100, 100] as const);
    const range2 =
      typeof item.range2 !== "boolean" ? item.range2 : ([-100, 100] as const);
    const positions: [Vec3, Vec3][] = [];
    for (let i = range1[0]; i <= range1[1]; i += item.gap) {
      if (item.plane === "xz") {
        positions.push([
          vec3(i, item.offset, range2[0]),
          vec3(i, item.offset, range2[1]),
        ]);
      } else if (item.plane === "xy") {
        positions.push([
          vec3(i, range2[0], item.offset),
          vec3(i, range2[1], item.offset),
        ]);
      } else if (item.plane === "yz") {
        positions.push([
          vec3(item.offset, i, range2[0]),
          vec3(item.offset, i, range2[1]),
        ]);
      }
    }
    for (let i = range2[0]; i <= range2[1]; i += item.gap) {
      if (item.plane === "xz") {
        positions.push([
          vec3(range1[0], item.offset, i),
          vec3(range1[1], item.offset, i),
        ]);
      } else if (item.plane === "xy") {
        positions.push([
          vec3(range1[0], i, item.offset),
          vec3(range1[1], i, item.offset),
        ]);
      } else if (item.plane === "yz") {
        positions.push([
          vec3(item.offset, range1[0], i),
          vec3(item.offset, range1[1], i),
        ]);
      }
    }

    // Update geometry
    const oldGeometry = obj.geometry;
    const geometry = new LineGeometry();
    const flatPos = positions.flatMap((elem) => [
      elem[0].x,
      elem[0].y,
      elem[0].z,
      elem[1].x,
      elem[1].y,
      elem[1].z,
      NaN,
      NaN,
      NaN,
    ]);
    geometry.setPositions(flatPos);
    obj.geometry = geometry;
    obj.mesh.geometry = geometry;
    oldGeometry.dispose();
    obj.mesh.visible = item.visible;
  },

  dispose(obj: ThreeSceneTypes["grid3d"], threeScene: THREE.Scene): void {
    threeScene.remove(obj.mesh);
    obj.geometry.dispose();
    obj.material.dispose();
  },
};
