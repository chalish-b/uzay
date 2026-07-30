import type { ItemSnapshot } from "../../../types/item-registry";
import {
  createFunctionSamplingPlan,
  planFitsViewport,
  sampleFunctionGeometry,
  type FunctionEndpointMarker,
  type FunctionSamplingPlan,
} from "../../../math/function-sampling";
import type { SvgItemRenderer, SvgSceneTypes } from "./shared";
import {
  applyStrokeDashedWorld,
  applyStrokePx,
  clearDashedStroke,
  cssColor,
  polylinePathD,
  setAttrs,
  setVisible,
  svgEl,
} from "./shared";

function applyStroke(
  item: ItemSnapshot<"function2d">,
  obj: SvgSceneTypes["function2d"]
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

function buildMarkerCircle(
  item: ItemSnapshot<"function2d">,
  marker: FunctionEndpointMarker
): SVGCircleElement {
  const circle = svgEl("circle");
  setAttrs(circle, { cx: marker.x, cy: marker.y });
  if (marker.style === "closed") {
    setAttrs(circle, {
      fill: cssColor(item.color),
      "fill-opacity": item.opacity,
    });
  } else {
    applyStrokePx(circle, item.color, item.thickness, item.opacity);
  }
  return circle;
}

// Sampling is viewport-dependent (screen-space tolerance, view-window
// clipping), so the path and the endpoint markers are built in layout()
// rather than create()/update(). Those two only reset the stored plan;
// layout() rebuilds whenever the plan is missing or no longer fits the
// viewport. Marker radii are pixel sizes, so they refresh on every layout
// like point2d's radius does.
export const function2dSvgRenderer: SvgItemRenderer<"function2d"> = {
  create(item, container) {
    const path = svgEl("path");
    container.g.appendChild(path);
    const markerGroup = svgEl("g");
    container.g.appendChild(markerGroup);
    const obj: SvgSceneTypes["function2d"] = {
      kind: "function2d",
      path,
      markerGroup,
      markerCircles: [],
      plan: null,
      dashWorldPerPixel: null,
    };
    applyStroke(item, obj);
    setVisible(path, item.visible);
    setVisible(markerGroup, item.visible);
    return obj;
  },

  update(item, obj) {
    applyStroke(item, obj);
    setVisible(obj.path, item.visible);
    setVisible(obj.markerGroup, item.visible);
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

    if (!obj.plan || !planFitsViewport(item, obj.plan, ctx.viewport)) {
      const plan = createFunctionSamplingPlan(item, ctx.viewport);
      const geometry = sampleFunctionGeometry(item, plan);
      obj.path.setAttribute(
        "d",
        geometry.runs.map((run) => polylinePathD(run)).join(" ")
      );
      for (const circle of obj.markerCircles) circle.remove();
      obj.markerCircles = geometry.markers.map((marker) => {
        const circle = buildMarkerCircle(item, marker);
        obj.markerGroup.appendChild(circle);
        return circle;
      });
      obj.plan = plan;
    }

    const r = item.markerRadius * ctx.viewport.worldPerPixel;
    for (const circle of obj.markerCircles) {
      circle.setAttribute("r", String(r));
    }
  },

  dispose(obj) {
    obj.path.remove();
    obj.markerGroup.remove();
  },
};
