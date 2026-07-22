import * as THREE from "three";
import type { ItemSnapshot } from "../types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./shared";
import {
  createLineStyleObjects,
  updateLineStyleObjects,
  disposeLineStyleObjects,
} from "./line-style";

const TUBULAR_SEGMENTS = 64;

function endpoints(item: ItemSnapshot<"line3d">): THREE.Vector3[] {
  return [
    new THREE.Vector3(item.start.x, item.start.y, item.start.z),
    new THREE.Vector3(item.end.x, item.end.y, item.end.z),
  ];
}

export const line3dRenderer: ItemRenderer<"line3d"> = {
  create(item: ItemSnapshot<"line3d">, threeScene: THREE.Object3D): ThreeSceneTypes["line3d"] {
    return {
      kind: "line3d",
      impl: createLineStyleObjects(
        endpoints(item),
        TUBULAR_SEGMENTS,
        item,
        "Line3D.color",
        threeScene
      ),
    };
  },

  update(
    item: ItemSnapshot<"line3d">,
    obj: ThreeSceneTypes["line3d"],
    threeScene: THREE.Object3D
  ): void {
    updateLineStyleObjects(
      obj,
      endpoints(item),
      TUBULAR_SEGMENTS,
      item,
      "Line3D.color",
      threeScene
    );
  },

  dispose(obj: ThreeSceneTypes["line3d"], threeScene: THREE.Object3D): void {
    disposeLineStyleObjects(obj.impl, threeScene);
  },
};
