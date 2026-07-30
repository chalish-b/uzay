import type { ItemSnapshot } from "../../../types/item-registry";
import {
  createParametricSamplingPlan,
  parametricPlanFitsViewport,
  sampleParametricRuns,
  type ParametricSamplingPlan,
} from "../../../math/parametric-sampling";
import type { SvgItemRenderer, SvgSceneTypes } from "./shared";
import {
  applyStrokeDashedWorld,
  applyStrokePx,
  clearDashedStroke,
  polylinePathD,
  setVisible,
  svgEl,
} from "./shared";

function applyStroke(
  item: ItemSnapshot<"parametricfunction2d">,
  obj: SvgSceneTypes["parametricfunction2d"]
): void {
  if (item.dashed && obj.dashWorldPerPixel !== null) {
    applyStrokeDashedWorld(
      obj.path,
      item.color,
      item.thickness,
      item.opacity,
      obj.dashWorldPerPixel
    );
  } else {
    // Solid, or dashed but not laid out yet: layout() runs later in the same
    // frame and applies the dash pattern before the browser paints.
    applyStrokePx(obj.path, item.color, item.thickness, item.opacity);
    clearDashedStroke(obj.path);
  }
}

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
        dashWorldPerPixel: null,
      };
      applyStroke(item, obj);
      setVisible(path, item.visible);
      return obj;
    },

    update(item, obj) {
      applyStroke(item, obj);
      setVisible(obj.path, item.visible);
      obj.plan = null;
    },

    layout(item, obj, ctx) {
      if (item.dashed) {
        const wpp = ctx.viewport.worldPerPixel;
        if (wpp > 0 && wpp !== obj.dashWorldPerPixel) {
          obj.dashWorldPerPixel = wpp;
          applyStroke(item, obj);
        }
      } else {
        obj.dashWorldPerPixel = null;
      }

      if (obj.plan && parametricPlanFitsViewport(obj.plan, ctx.viewport)) return;

      const plan = createParametricSamplingPlan(ctx.viewport);
      obj.path.setAttribute("d", buildD(item, plan));
      obj.plan = plan;
    },

    dispose(obj) {
      obj.path.remove();
    },
  };
