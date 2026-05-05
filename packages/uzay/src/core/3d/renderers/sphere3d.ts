import * as THREE from "three";
import type { ItemSnapshot } from "../types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./index";
import { applyOpacityMaterialState } from "./material-transparency";

export const sphere3dRenderer: ItemRenderer<"sphere3d"> = {
  create(
    item: ItemSnapshot<"sphere3d">,
    threeScene: THREE.Scene
  ): ThreeSceneTypes["sphere3d"] {
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshPhongMaterial({
      color: item.color,
      specular: 0xaaaaaa,
      shininess: 5,
      transparent: item.opacity < 1,
      opacity: item.opacity,
      depthWrite: item.opacity >= 1,
    });
    applyOpacityMaterialState(material, item.opacity);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(item.radius, item.radius, item.radius);
    mesh.position.set(item.center.x, item.center.y, item.center.z);
    mesh.visible = item.visible;
    mesh.userData.itemId = item.id;
    threeScene.add(mesh);
    return {
      kind: "sphere3d",
      geometry,
      material,
      mesh,
    };
  },

  update(
    item: ItemSnapshot<"sphere3d">,
    obj: ThreeSceneTypes["sphere3d"]
  ): void {
    obj.material.color.set(item.color);
    applyOpacityMaterialState(obj.material, item.opacity);
    obj.mesh.scale.set(item.radius, item.radius, item.radius);
    obj.mesh.position.set(item.center.x, item.center.y, item.center.z);
    obj.mesh.visible = item.visible;
  },

  dispose(
    obj: ThreeSceneTypes["sphere3d"],
    threeScene: THREE.Scene
  ): void {
    threeScene.remove(obj.mesh);
    obj.geometry.dispose();
    obj.material.dispose();
  },
};
