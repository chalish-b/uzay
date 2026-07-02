import type { ItemSnapshot } from "../../../types/item-registry";
import {
  createParametricSamplingPlan,
  parametricPlanFitsViewport,
  sampleParametricRuns,
  type ParametricSamplingPlan,
} from "../../../math/parametric-sampling";
import type { SvgItemRenderer, SvgSceneTypes } from "./shared";
import { applyStrokePx, polylinePathD, setVisible, svgEl } from "./shared";

function buildD(
  item: ItemSnapshot<"parametricfunction2d">,
  plan: ParametricSamplingPlan
): string {
  return sampleParametricRuns(item, plan)
    .map((run) => polylinePathD(run))
    .join(" ");
}

// Sampling is viewport-dependent (screen-space tolerance, view-window
// clipping), so the path is built in layout() rather than create()/update().
// Those two only reset the stored plan; layout() rebuilds whenever the plan
// is missing or no longer fits the viewport.
export const parametricFunction2dSvgRenderer: SvgItemRenderer<"parametricfunction2d"> =
  {
    create(item, container) {
      const path = svgEl("path");
      container.g.appendChild(path);
      const obj: SvgSceneTypes["parametricfunction2d"] = {
        kind: "parametricfunction2d",
        path,
        plan: null,
      };
      applyStrokePx(path, item.color, item.thickness, item.opacity);
      setVisible(path, item.visible);
      return obj;
    },

    update(item, obj) {
      applyStrokePx(obj.path, item.color, item.thickness, item.opacity);
      setVisible(obj.path, item.visible);
      obj.plan = null;
    },

    layout(item, obj, ctx) {
      if (obj.plan && parametricPlanFitsViewport(obj.plan, ctx.viewport)) return;

      const plan = createParametricSamplingPlan(ctx.viewport);
      obj.path.setAttribute("d", buildD(item, plan));
      obj.plan = plan;
    },

    dispose(obj) {
      obj.path.remove();
    },
  };
