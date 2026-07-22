import * as THREE from "three";
import type { ItemSnapshot } from "../types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./shared";
import { pointScaleDown } from "./shared";
import { applyOpacityMaterialState } from "./material-transparency";
import { checkedColor } from "../../shared/types/colors";

export const point3dRenderer: ItemRenderer<"point3d"> = {
  create(
    item: ItemSnapshot<"point3d">,
    threeScene: THREE.Object3D
  ): ThreeSceneTypes["point3d"] {
    const geometry = new THREE.SphereGeometry(1);
    const material = new THREE.MeshPhongMaterial({
      color: checkedColor(item.color, "Point3D.color"), specular: 0xAAAAAA, shininess: 5,
    });
    applyOpacityMaterialState(material, item.opacity);
    const mesh = new THREE.Mesh(geometry, material);
    const size = item.radius / pointScaleDown;
    mesh.scale.set(size, size, size);
    mesh.position.set(item.coords.x, item.coords.y, item.coords.z);
    mesh.visible = item.visible;
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
    obj.material.color.set(checkedColor(item.color, "Point3D.color"));
    applyOpacityMaterialState(obj.material, item.opacity);
    const size = item.radius / pointScaleDown;
    obj.mesh.scale.set(size, size, size);
    obj.mesh.position.set(item.coords.x, item.coords.y, item.coords.z);
    obj.mesh.visible = item.visible;
  },

  dispose(obj: ThreeSceneTypes["point3d"], threeScene: THREE.Object3D): void {
    threeScene.remove(obj.mesh);
    obj.geometry.dispose();
    obj.material.dispose();
  },
};
