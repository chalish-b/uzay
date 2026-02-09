import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import katex from "katex";
import "katex/dist/katex.min.css";
import type { ItemSnapshot } from "../common-types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./index";
import { anchorToTranslate } from "../common-types/overlay";

function applyStyles(
  element: HTMLDivElement,
  item: ItemSnapshot<"overlay3d">
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

  const offsetX = item.offset.x;
  const offsetY = item.offset.y;
  const anchorTranslate = anchorToTranslate(item.anchor);
  // Combine anchor translate with pixel offset
  element.style.transform = `${anchorTranslate} translate(${offsetX}px, ${offsetY}px)`;
}

export const overlay3dRenderer: ItemRenderer<"overlay3d"> = {
  create(
    item: ItemSnapshot<"overlay3d">,
    threeScene: THREE.Scene
  ): ThreeSceneTypes["overlay3d"] {
    // CSS2DRenderer overwrites `transform` on the element it manages each frame,
    // so we use a wrapper div for CSS2DObject and nest the content div inside it.
    // The wrapper is sized to fit its content so it doesn't stretch full-width.
    const wrapper = document.createElement("div");
    wrapper.style.width = "max-content";

    const element = document.createElement("div");
    wrapper.appendChild(element);
    applyStyles(element, item);

    const cssObject = new CSS2DObject(wrapper);
    cssObject.position.set(item.position.x, item.position.y, item.position.z);
    cssObject.userData.itemId = item.id;
    threeScene.add(cssObject);

    return {
      kind: "overlay3d",
      cssObject,
      element,
    };
  },

  update(
    item: ItemSnapshot<"overlay3d">,
    obj: ThreeSceneTypes["overlay3d"]
  ): void {
    applyStyles(obj.element, item);
    obj.cssObject.position.set(
      item.position.x,
      item.position.y,
      item.position.z
    );
  },

  dispose(
    obj: ThreeSceneTypes["overlay3d"],
    threeScene: THREE.Scene
  ): void {
    threeScene.remove(obj.cssObject);
    obj.cssObject.element.remove();
  },
};
