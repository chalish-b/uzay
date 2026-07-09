import type { ItemSnapshot } from "../../../types/item-registry";
import type { SvgItemRenderer, SvgSceneTypes } from "./shared";
import {
  applyStrokeDashedWorld,
  applyStrokePx,
  clearDashedStroke,
  setAttrs,
  setVisible,
  svgEl,
} from "./shared";

function applyStroke(
  item: ItemSnapshot<"line2d">,
  obj: SvgSceneTypes["line2d"]
): void {
  if (item.dashed && obj.dashWorldPerPixel !== null) {
    applyStrokeDashedWorld(
      obj.line,
      item.color,
      item.thickness,
      item.opacity,
      obj.dashWorldPerPixel
    );
  } else {
    // Solid, or dashed but not laid out yet: layout() runs later in the same
    // frame and applies the dash pattern before the browser paints.
    applyStrokePx(obj.line, item.color, item.thickness, item.opacity);
    clearDashedStroke(obj.line);
  }
}

function apply(
  item: ItemSnapshot<"line2d">,
  obj: SvgSceneTypes["line2d"]
): void {
  setAttrs(obj.line, {
    x1: item.start.x,
    y1: item.start.y,
    x2: item.end.x,
    y2: item.end.y,
  });
  applyStroke(item, obj);
  setVisible(obj.line, item.visible);
}

export const line2dSvgRenderer: SvgItemRenderer<"line2d"> = {
  create(item, container) {
    const line = svgEl("line");
    container.g.appendChild(line);
    const obj: SvgSceneTypes["line2d"] = {
      kind: "line2d",
      line,
      dashWorldPerPixel: null,
    };
    apply(item, obj);
    return obj;
  },

  update(item, obj) {
    apply(item, obj);
  },

  layout(item, obj, ctx) {
    if (!item.dashed) {
      obj.dashWorldPerPixel = null;
      return;
    }
    const wpp = ctx.viewport.worldPerPixel;
    if (wpp <= 0 || wpp === obj.dashWorldPerPixel) return;
    obj.dashWorldPerPixel = wpp;
    applyStroke(item, obj);
  },

  dispose(obj) {
    obj.line.remove();
  },
};
