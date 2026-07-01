import type { ItemSnapshot } from "../../../types/item-registry";
import type { Viewport2D } from "../../../types/view-context";
import {
  getFunctionDomain,
  sampleFunctionRuns,
} from "../../../math/function-sampling";
import type { SvgItemRenderer, SvgSceneTypes } from "./shared";
import { applyStrokePx, polylinePathD, setVisible, svgEl } from "./shared";

function buildD(
  item: ItemSnapshot<"function2d">,
  viewport: Viewport2D | null = null
): string {
  return sampleFunctionRuns(item, viewport)
    .map((run) => polylinePathD(run))
    .join(" ");
}

function apply(
  item: ItemSnapshot<"function2d">,
  obj: SvgSceneTypes["function2d"]
): void {
  obj.path.setAttribute("d", buildD(item));
  applyStrokePx(obj.path, item.color, item.thickness, item.opacity);
  setVisible(obj.path, item.visible);
  obj.layoutKey = null;
}

export const function2dSvgRenderer: SvgItemRenderer<"function2d"> = {
  create(item, container) {
    const path = svgEl("path");
    container.g.appendChild(path);
    const obj: SvgSceneTypes["function2d"] = {
      kind: "function2d",
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
    if (item.domain !== "infinite") return;
    const domain = getFunctionDomain(item, ctx.viewport);
    const layoutKey = JSON.stringify({
      domain,
      samples: item.samples,
      discontinuities: item.discontinuities,
    });
    if (layoutKey === obj.layoutKey) return;

    obj.path.setAttribute("d", buildD(item, ctx.viewport));
    obj.layoutKey = layoutKey;
  },

  dispose(obj) {
    obj.path.remove();
  },
};
