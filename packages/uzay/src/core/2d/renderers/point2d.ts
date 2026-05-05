import * as THREE from "three";
import type { ItemSnapshot } from "../types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./index";
import { Z_POINT } from "./index";

// Match Point3D's pointScaleDown convention so a default radius of 2 reads as
// a small dot rather than a giant circle in world units.
const pointScaleDown = 25;

export const point2dRenderer: ItemRenderer<"point2d"> = {
  create(
    item: ItemSnapshot<"point2d">,
    threeScene: THREE.Scene
  ): ThreeSceneTypes["point2d"] {
    const radius = item.radius / pointScaleDown;
    const geometry = new THREE.CircleGeometry(radius, 32);
    const material = new THREE.MeshBasicMaterial({ color: item.color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(item.coords.x, item.coords.y, Z_POINT);
    mesh.visible = item.visible;
    mesh.userData.itemId = item.id;
    threeScene.add(mesh);
    return { kind: "point2d", geometry, material, mesh };
  },

  update(item: ItemSnapshot<"point2d">, obj: ThreeSceneTypes["point2d"]): void {
    obj.material.color.set(item.color);
    obj.mesh.position.set(item.coords.x, item.coords.y, Z_POINT);
    obj.mesh.visible = item.visible;

    // CircleGeometry size is set at construction. Rebuild it when radius changes
    // since rebuilding a small buffer geometry is cheap and avoids per-frame scale math.
    const targetRadius = item.radius / pointScaleDown;
    const currentRadius = (obj.geometry.parameters as { radius: number } | undefined)?.radius;
    if (currentRadius !== targetRadius) {
      obj.geometry.dispose();
      const next = new THREE.CircleGeometry(targetRadius, 32);
      obj.mesh.geometry = next;
      (obj as { geometry: THREE.CircleGeometry }).geometry = next;
    }
  },

  dispose(obj: ThreeSceneTypes["point2d"], threeScene: THREE.Scene): void {
    threeScene.remove(obj.mesh);
    obj.geometry.dispose();
    obj.material.dispose();
  },
};
