import type { Scene } from "three";
import type { ItemSnapshot } from "../types/item-registry";
import { type ItemRenderer, type ThreeSceneTypes } from "./index";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { applyOpacityMaterialState } from "./material-transparency";

function buildGridGeometry(item: ItemSnapshot<"grid3d">): LineSegmentsGeometry {
  const range1 =
    typeof item.range1 !== "boolean" ? item.range1 : ([-100, 100] as const);
  const range2 =
    typeof item.range2 !== "boolean" ? item.range2 : ([-100, 100] as const);
  const positions: number[] = [];

  for (let i = range1[0]; i <= range1[1]; i += item.gap) {
    if (item.plane === "xz") {
      positions.push(i, item.offset, range2[0], i, item.offset, range2[1]);
    } else if (item.plane === "xy") {
      positions.push(i, range2[0], item.offset, i, range2[1], item.offset);
    } else if (item.plane === "yz") {
      positions.push(item.offset, i, range2[0], item.offset, i, range2[1]);
    }
  }

  for (let i = range2[0]; i <= range2[1]; i += item.gap) {
    if (item.plane === "xz") {
      positions.push(range1[0], item.offset, i, range1[1], item.offset, i);
    } else if (item.plane === "xy") {
      positions.push(range1[0], i, item.offset, range1[1], i, item.offset);
    } else if (item.plane === "yz") {
      positions.push(item.offset, range1[0], i, item.offset, range1[1], i);
    }
  }

  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(positions);
  return geometry;
}

export const grid3dRenderer: ItemRenderer<"grid3d"> = {
  create(
    item: ItemSnapshot<"grid3d">,
    threeScene: Scene
  ): ThreeSceneTypes["grid3d"] {
    const geometry = buildGridGeometry(item);
    const material = new LineMaterial({
      color: item.color,
      linewidth: item.thickness,
      fog: true,
    });
    applyOpacityMaterialState(material, item.opacity);

    const mesh = new LineSegments2(geometry, material);
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
    obj.material.color.set(item.color);
    obj.material.linewidth = item.thickness;
    applyOpacityMaterialState(obj.material, item.opacity);

    const oldGeometry = obj.geometry;
    const geometry = buildGridGeometry(item);
    obj.geometry = geometry;
    obj.mesh.geometry = geometry;
    oldGeometry.dispose();
    obj.mesh.visible = item.visible;
  },

  dispose(obj: ThreeSceneTypes["grid3d"], threeScene: Scene): void {
    threeScene.remove(obj.mesh);
    obj.geometry.dispose();
    obj.material.dispose();
  },
};
