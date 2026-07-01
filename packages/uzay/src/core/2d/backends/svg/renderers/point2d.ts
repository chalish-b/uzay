import type { ItemSnapshot } from "../../../types/item-registry";
import type { SvgItemRenderer, SvgSceneTypes } from "./shared";
import { cssColor, setAttrs, setVisible, svgEl } from "./shared";

function apply(
  item: ItemSnapshot<"point2d">,
  obj: SvgSceneTypes["point2d"]
): void {
  setAttrs(obj.circle, {
    cx: item.coords.x,
    cy: item.coords.y,
    fill: cssColor(item.color),
  });
  setVisible(obj.circle, item.visible);
}

export const point2dSvgRenderer: SvgItemRenderer<"point2d"> = {
  create(item, container) {
    const circle = svgEl("circle");
    container.g.appendChild(circle);
    const obj: SvgSceneTypes["point2d"] = { kind: "point2d", circle };
    apply(item, obj);
    return obj;
  },

  update(item, obj) {
    apply(item, obj);
  },

  // The radius is a pixel size; convert to world units at the current zoom.
  layout(item, obj, ctx) {
    obj.circle.setAttribute(
      "r",
      String(item.radius * ctx.viewport.worldPerPixel)
    );
  },

  dispose(obj) {
    obj.circle.remove();
  },
};
