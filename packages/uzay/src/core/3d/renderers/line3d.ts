import * as THREE from "three";
import type { ItemSnapshot } from "../types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./index";
import { lineThicknessScaleDown } from "./index";
import { checkedColor } from "../../shared/types/colors";

export const line3dRenderer: ItemRenderer<"line3d"> = {
  create(item: ItemSnapshot<"line3d">, threeScene: THREE.Scene): ThreeSceneTypes["line3d"] {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(item.start.x, item.start.y, item.start.z),
      new THREE.Vector3(item.end.x, item.end.y, item.end.z),
    ]);
    // TODO: The line is very thick for some reason, figure out the cause
    const geometry = new THREE.TubeGeometry(
      curve,
      64,
      item.thickness / lineThicknessScaleDown
    );
    const material = new THREE.MeshPhongMaterial({
      color: checkedColor(item.color, "Line3D.color"), specular: 0xAAAAAA, shininess: 5
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = item.visible;
    mesh.userData.itemId = item.id;
    threeScene.add(mesh);
    return {
      kind: "line3d",
      curve,
      geometry,
      material,
      mesh,
    };
  },

  update(item: ItemSnapshot<"line3d">, obj: ThreeSceneTypes["line3d"]): void {
    obj.material.color.set(checkedColor(item.color, "Line3D.color"));
    obj.curve.points[0].set(item.start.x, item.start.y, item.start.z);
    obj.curve.points[1].set(item.end.x, item.end.y, item.end.z);
    // Unfortunately, we can't really change the radius of the tube geometry after creation. So we recreate it.
    // TODO: Only do this if the position or the thickness changes
    const oldGeometry = obj.geometry;
    const geometry = new THREE.TubeGeometry(
      obj.curve,
      64,
      item.thickness / lineThicknessScaleDown
    );
    obj.geometry = geometry;
    obj.mesh.geometry = geometry;
    oldGeometry.dispose();
    obj.mesh.visible = item.visible;
  },

  dispose(obj: ThreeSceneTypes["line3d"], threeScene: THREE.Scene): void {
    threeScene.remove(obj.mesh);
    obj.geometry.dispose();
    obj.material.dispose();
  },
};
