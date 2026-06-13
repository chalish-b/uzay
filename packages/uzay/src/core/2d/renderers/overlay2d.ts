import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import katex from "katex";
import type { ItemSnapshot } from "../types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./shared";
import { Z_POINT } from "./shared";
import { anchorToTranslate } from "../../shared/types/overlay";

function applyStyles(
  element: HTMLDivElement,
  item: ItemSnapshot<"overlay2d">
) {
  if (item.format === "latex") {
    element.innerHTML = katex.renderToString(item.content, {
      throwOnError: false,
    });
  } else {
    element.textContent = item.content;
  }

  element.className = item.className;
  element.style.cssText = item.style;
  element.style.visibility = item.visible ? "visible" : "hidden";
  element.style.pointerEvents = item.pointerEvents;
  if (!element.style.zIndex) {
    element.style.zIndex = "10";
  }

  const offsetX = item.offset.x;
  const offsetY = item.offset.y;
  const anchorTranslate = anchorToTranslate(item.anchor);
  element.style.transform = `${anchorTranslate} translate(${offsetX}px, ${offsetY}px)`;
}

export const overlay2dRenderer: ItemRenderer<"overlay2d"> = {
  create(
    item: ItemSnapshot<"overlay2d">,
    threeScene: THREE.Object3D
  ): ThreeSceneTypes["overlay2d"] {
    const wrapper = document.createElement("div");
    wrapper.style.width = "max-content";

    const element = document.createElement("div");
    wrapper.appendChild(element);
    applyStyles(element, item);

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
    applyStyles(obj.element, item);
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
