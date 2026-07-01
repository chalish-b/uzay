import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import type { ItemSnapshot } from "../../../types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./shared";
import { Z_POINT } from "./shared";
import { applyOverlay2DElementStyles } from "../../../overlay-dom";

export const overlay2dRenderer: ItemRenderer<"overlay2d"> = {
  create(
    item: ItemSnapshot<"overlay2d">,
    threeScene: THREE.Object3D
  ): ThreeSceneTypes["overlay2d"] {
    const wrapper = document.createElement("div");
    wrapper.style.width = "max-content";

    const element = document.createElement("div");
    wrapper.appendChild(element);
    applyOverlay2DElementStyles(element, item);

    const cssObject = new CSS2DObject(wrapper);
    cssObject.position.set(item.position.x, item.position.y, Z_POINT);
    cssObject.userData.itemId = item.id;
    threeScene.add(cssObject);

    return {
      kind: "overlay2d",
      cssObject,
      element,
    };
  },

  update(
    item: ItemSnapshot<"overlay2d">,
    obj: ThreeSceneTypes["overlay2d"]
  ): void {
    applyOverlay2DElementStyles(obj.element, item);
    obj.cssObject.position.set(item.position.x, item.position.y, Z_POINT);
  },

  dispose(
    obj: ThreeSceneTypes["overlay2d"],
    threeScene: THREE.Object3D
  ): void {
    threeScene.remove(obj.cssObject);
    obj.cssObject.element.remove();
  },
};
