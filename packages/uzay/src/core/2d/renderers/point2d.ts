import * as THREE from "three";
import type { ItemSnapshot } from "../types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./shared";
import { Z_POINT } from "./shared";
import { getWorldPerPixel, chainOnBeforeRender } from "../types/screen-space";
import { checkedColor } from "../../shared/types/colors";

// Geometry is built once at unit radius (1 world unit). Each frame
// onBeforeRender scales the mesh so its rendered size is exactly
// `userData.radius` CSS pixels regardless of camera zoom.
const UNIT_RADIUS = 1;
const SEGMENTS = 32;

export const point2dRenderer: ItemRenderer<"point2d"> = {
  create(
    item: ItemSnapshot<"point2d">,
    threeScene: THREE.Object3D
  ): ThreeSceneTypes["point2d"] {
    const geometry = new THREE.CircleGeometry(UNIT_RADIUS, SEGMENTS);
    const material = new THREE.MeshBasicMaterial({
      color: checkedColor(item.color, "Point2D.color"),
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(item.coords.x, item.coords.y, Z_POINT);
    mesh.visible = item.visible;
    mesh.userData.itemId = item.id;
    mesh.userData.radius = item.radius;
    chainOnBeforeRender(mesh, onBeforeRender);
    threeScene.add(mesh);
    return { kind: "point2d", geometry, material, mesh };
  },

  // Position + visibility + color get applied directly. The pixel-radius
  // value just gets stashed in userData; onBeforeRender reads it each frame.
  update(item: ItemSnapshot<"point2d">, obj: ThreeSceneTypes["point2d"]): void {
    obj.material.color.set(checkedColor(item.color, "Point2D.color"));
    obj.mesh.position.set(item.coords.x, item.coords.y, Z_POINT);
    obj.mesh.visible = item.visible;
    obj.mesh.userData.radius = item.radius;
  },

  dispose(obj: ThreeSceneTypes["point2d"], threeScene: THREE.Object3D): void {
    threeScene.remove(obj.mesh);
    obj.geometry.dispose();
    obj.material.dispose();
  },
};

function onBeforeRender(
  this: THREE.Object3D,
  renderer: THREE.WebGLRenderer,
  camera: THREE.Camera
) {
  if (!(camera as THREE.OrthographicCamera).isOrthographicCamera) return;
  const wpp = getWorldPerPixel(renderer, camera as THREE.OrthographicCamera);
  const s = (this.userData.radius as number) * wpp;
  this.scale.set(s, s, 1);
}
