import type { ItemSnapshot } from "../../../types/item-registry";
import {
  ANNOTATION_HEAD_LENGTH,
  ANNOTATION_HEAD_WIDTH,
} from "../../../math/arrow-math";
import type { SvgItemRenderer, SvgSceneTypes } from "./shared";
import {
  applyStrokeDashedWorld,
  applyStrokePx,
  arrowHeadD,
  clearDashedStroke,
  cssColor,
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
  for (const head of [obj.headStart, obj.headEnd]) {
    setAttrs(head, { fill: cssColor(item.color), "fill-opacity": item.opacity });
  }
  setVisible(obj.group, item.visible);
}

export const line2dSvgRenderer: SvgItemRenderer<"line2d"> = {
  create(item, container) {
    const group = svgEl("g");
    const line = svgEl("line");
    const headStart = svgEl("path");
    const headEnd = svgEl("path");
    group.appendChild(line);
    group.appendChild(headStart);
    group.appendChild(headEnd);
    container.g.appendChild(group);
    const obj: SvgSceneTypes["line2d"] = {
      kind: "line2d",
      group,
      line,
      headStart,
      headEnd,
      dashWorldPerPixel: null,
    };
    apply(item, obj);
    return obj;
  },

  update(item, obj) {
    apply(item, obj);
  },

  layout(item, obj, ctx) {
    const wpp = ctx.viewport.worldPerPixel;

    // The arrowheads, recomputed like vector2d's: their size is in pixels, so
    // it depends on the zoom. An excluded or degenerate head gets an empty
    // path, which erases it.
    const dir = {
      x: item.end.x - item.start.x,
      y: item.end.y - item.start.y,
    };
    const headAt = (which: "start" | "end") =>
      item.arrows === which || item.arrows === "both";
    obj.headEnd.setAttribute(
      "d",
      headAt("end")
        ? arrowHeadD(item.end, dir, ANNOTATION_HEAD_LENGTH, ANNOTATION_HEAD_WIDTH, wpp)
        : ""
    );
    obj.headStart.setAttribute(
      "d",
      headAt("start")
        ? arrowHeadD(
            item.start,
            { x: -dir.x, y: -dir.y },
            ANNOTATION_HEAD_LENGTH,
            ANNOTATION_HEAD_WIDTH,
            wpp
          )
        : ""
    );

    if (!item.dashed) {
      obj.dashWorldPerPixel = null;
      return;
    }
    if (wpp <= 0 || wpp === obj.dashWorldPerPixel) return;
    obj.dashWorldPerPixel = wpp;
    applyStroke(item, obj);
  },

  dispose(obj) {
    obj.group.remove();
  },
};
