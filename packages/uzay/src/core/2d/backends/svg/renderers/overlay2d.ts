import type { SvgItemRenderer } from "./shared";
import { applyOverlay2DElementStyles } from "../../../overlay-dom";

// The wrapper is absolutely positioned with its center on the item's world
// point (same convention as the three backend's CSS2DRenderer); the inner
// element carries the content, user styling, and anchor offset.
export const overlay2dSvgRenderer: SvgItemRenderer<"overlay2d"> = {
  create(item, container) {
    const wrapper = document.createElement("div");
    wrapper.style.position = "absolute";
    wrapper.style.width = "max-content";
    wrapper.style.transform = "translate(-50%, -50%)";

    const element = document.createElement("div");
    wrapper.appendChild(element);
    applyOverlay2DElementStyles(element, item);

    container.overlay.appendChild(wrapper);
    return { kind: "overlay2d", wrapper, element };
  },

  update(item, obj) {
    applyOverlay2DElementStyles(obj.element, item);
  },

  // Reposition every frame: the screen position moves with pan/zoom even
  // when the item itself hasn't changed.
  layout(item, obj, ctx) {
    const screen = ctx.viewport.worldToScreen(item.position);
    obj.wrapper.style.left = `${screen.x}px`;
    obj.wrapper.style.top = `${screen.y}px`;
  },

  dispose(obj) {
    obj.wrapper.remove();
  },
};
