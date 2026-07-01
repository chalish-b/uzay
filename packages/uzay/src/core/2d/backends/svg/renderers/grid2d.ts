import type { ItemSnapshot } from "../../../types/item-registry";
import type { Viewport2D } from "../../../types/view-context";
import {
  buildGridLines,
  getGridGap,
  getResolvedGridBounds,
} from "../../../math/grid-math";
import type { SvgItemRenderer, SvgSceneTypes } from "./shared";
import { applyStrokePx, setVisible, svgEl } from "./shared";

function buildD(
  item: ItemSnapshot<"grid2d">,
  viewport: Viewport2D | null = null
): string {
  const lines = buildGridLines(item, viewport);
  if (!lines) return "";

  const [x0, x1] = lines.xBounds;
  const [y0, y1] = lines.yBounds;
  const parts: string[] = [];
  for (const x of lines.xs) {
    parts.push(`M ${x} ${y0} L ${x} ${y1}`);
  }
  for (const y of lines.ys) {
    parts.push(`M ${x0} ${y} L ${x1} ${y}`);
  }
  return parts.join(" ");
}

function apply(
  item: ItemSnapshot<"grid2d">,
  obj: SvgSceneTypes["grid2d"]
): void {
  obj.path.setAttribute("d", buildD(item));
  applyStrokePx(obj.path, item.color, item.thickness, item.opacity);
  setVisible(obj.path, item.visible);
  obj.layoutKey = null;
}

export const grid2dSvgRenderer: SvgItemRenderer<"grid2d"> = {
  create(item, container) {
    const path = svgEl("path");
    container.g.appendChild(path);
    const obj: SvgSceneTypes["grid2d"] = {
      kind: "grid2d",
      path,
      layoutKey: null,
    };
    apply(item, obj);
    return obj;
  },

  update(item, obj) {
    apply(item, obj);
  },

  layout(item, obj, ctx) {
    if (item.rangeX !== true && item.rangeY !== true && item.gap !== "auto") return;
    const { x, y } = getResolvedGridBounds(item, ctx.viewport);
    const gap = getGridGap(item.gap, ctx.viewport);
    const layoutKey = JSON.stringify({ x, y, gap });
    if (layoutKey === obj.layoutKey) return;

    obj.path.setAttribute("d", buildD(item, ctx.viewport));
    obj.layoutKey = layoutKey;
  },

  dispose(obj) {
    obj.path.remove();
  },
};
