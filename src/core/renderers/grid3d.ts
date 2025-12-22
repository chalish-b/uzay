import * as THREE from "three";
import type { ItemSnapshot } from "../common-types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./index";

export const grid3dRenderer: ItemRenderer<"grid3d"> = {
  create(item: ItemSnapshot<"grid3d">, threeScene: THREE.Scene): ThreeSceneTypes["grid3d"] {
    // TODO: Implement grid3d
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({ color: item.color });
    const mesh = new THREE.LineSegments(geometry, material);
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
    threeScene.remove(obj.mesh);
    obj.geometry.dispose();
    obj.material.dispose();
  },
};

