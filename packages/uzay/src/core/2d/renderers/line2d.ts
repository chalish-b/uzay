import * as THREE from "three";
import type { ItemSnapshot } from "../types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./shared";
import { Z_DEFAULT } from "./shared";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { checkedColor } from "../../shared/types/colors";

function buildLineGeometry(
  start: { x: number; y: number },
  end: { x: number; y: number }
): LineGeometry {
  const geom = new LineGeometry();
  geom.setPositions([start.x, start.y, Z_DEFAULT, end.x, end.y, Z_DEFAULT]);
  return geom;
}

export const line2dRenderer: ItemRenderer<"line2d"> = {
  create(
    item: ItemSnapshot<"line2d">,
    threeScene: THREE.Object3D
  ): ThreeSceneTypes["line2d"] {
    const geometry = buildLineGeometry(item.start, item.end);
    const material = new LineMaterial({
      color: checkedColor(item.color, "Line2D.color"),
      linewidth: item.thickness,
      transparent: item.opacity < 1,
      opacity: item.opacity,
    });
    const mesh = new Line2(geometry, material);
    mesh.visible = item.visible;
    mesh.userData.itemId = item.id;
    threeScene.add(mesh);
    return { kind: "line2d", geometry, material, mesh };
  },

  update(item: ItemSnapshot<"line2d">, obj: ThreeSceneTypes["line2d"]): void {
    obj.material.color.set(checkedColor(item.color, "Line2D.color"));
    obj.material.linewidth = item.thickness;
    obj.material.opacity = item.opacity;
    obj.material.transparent = item.opacity < 1;
    obj.material.needsUpdate = true;
    obj.mesh.visible = item.visible;

    obj.geometry.dispose();
    const next = buildLineGeometry(item.start, item.end);
    obj.mesh.geometry = next;
    (obj as { geometry: LineGeometry }).geometry = next;
  },

  dispose(obj: ThreeSceneTypes["line2d"], threeScene: THREE.Object3D): void {
    threeScene.remove(obj.mesh);
    obj.geometry.dispose();
    obj.material.dispose();
  },
};
