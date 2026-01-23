import * as THREE from "three";
import type { ItemSnapshot } from "../common-types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./index";
import { pointScaleDown } from "./index";

export const point3dRenderer: ItemRenderer<"point3d"> = {
  create(
    item: ItemSnapshot<"point3d">,
    threeScene: THREE.Scene
  ): ThreeSceneTypes["point3d"] {
    const geometry = new THREE.SphereGeometry(1);
    const material = new THREE.MeshBasicMaterial({ color: item.color });
    const mesh = new THREE.Mesh(geometry, material);
    const size = item.radius / pointScaleDown;
    mesh.scale.set(size, size, size);
    mesh.position.set(item.coords.x, item.coords.y, item.coords.z);
    mesh.userData.itemId = item.id;
    threeScene.add(mesh);
    return {
      kind: "point3d",
      geometry,
      material,
      mesh,
    };
  },

  update(item: ItemSnapshot<"point3d">, obj: ThreeSceneTypes["point3d"]): void {
    obj.material.color.set(item.color);
    const size = item.radius / pointScaleDown;
    obj.mesh.scale.set(size, size, size);
    obj.mesh.position.set(item.coords.x, item.coords.y, item.coords.z);
  },

  dispose(obj: ThreeSceneTypes["point3d"], threeScene: THREE.Scene): void {
    threeScene.remove(obj.mesh);
    obj.geometry.dispose();
    obj.material.dispose();
  },
};
