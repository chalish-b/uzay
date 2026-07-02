import type { ItemSnapshot } from "../types/item-registry";
import type { Viewport2D } from "../types/view-context";
import {
  adaptiveSampleCurve,
  type ClipRect,
  type CurvePoint,
} from "./adaptive-sampling";

// Padding past the visible viewport, so small pans reuse the geometry.
const PAD_RATIO = 0.25;
// Re-sample when the zoom has drifted enough from the plan's pixel size that
// the screen-space tolerance it was built for no longer holds.
const WPP_REBUILD_RATIO = 1.25;
const SEED_COUNT = 64;

// The viewport window one parametric geometry rebuild was sampled for.
// Renderers keep it alongside the geometry and rebuild only when the
// viewport moves outside it (see parametricPlanFitsViewport).
export type ParametricSamplingPlan = {
  clip: ClipRect;
  worldPerPixel: number;
};

export function createParametricSamplingPlan(
  viewport: Viewport2D
): ParametricSamplingPlan {
  const bounds = viewport.visibleWorldBounds;
  const padX = (bounds.right - bounds.left) * PAD_RATIO;
  const padY = (bounds.top - bounds.bottom) * PAD_RATIO;
  return {
    clip: {
      xMin: bounds.left - padX,
      xMax: bounds.right + padX,
      yMin: bounds.bottom - padY,
      yMax: bounds.top + padY,
    },
    worldPerPixel: viewport.worldPerPixel,
  };
}

export function parametricPlanFitsViewport(
  plan: ParametricSamplingPlan,
  viewport: Viewport2D
): boolean {
  const ratio = viewport.worldPerPixel / plan.worldPerPixel;
  if (ratio > WPP_REBUILD_RATIO || ratio < 1 / WPP_REBUILD_RATIO) return false;

  const bounds = viewport.visibleWorldBounds;
  return (
    bounds.left >= plan.clip.xMin &&
    bounds.right <= plan.clip.xMax &&
    bounds.bottom >= plan.clip.yMin &&
    bounds.top <= plan.clip.yMax
  );
}

// Sample the curve into continuous polyline runs, clipped to the plan's
// window. Runs break wherever the function returns a non-finite value and at
// detected jumps.
export function sampleParametricRuns(
  item: ItemSnapshot<"parametricfunction2d">,
  plan: ParametricSamplingPlan
): CurvePoint[][] {
  const start = Math.min(item.tStart, item.tEnd);
  const end = Math.max(item.tStart, item.tEnd);
  if (!(end > start)) return [];

  return adaptiveSampleCurve({
    f: (t) => {
      const p = item.f(t);
      return { x: p.x, y: p.y };
    },
    segments: [{ start, end }],
    worldPerPixel: plan.worldPerPixel,
    clip: plan.clip,
    seedCount: SEED_COUNT,
  });
}
