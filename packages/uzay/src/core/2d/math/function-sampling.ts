import type { ItemSnapshot } from "../types/item-registry";
import type { Viewport2D } from "../types/view-context";
import {
  adaptiveSampleCurve,
  type CurvePoint,
  type CurveSegment,
} from "./adaptive-sampling";

// How far sampling extends past the visible viewport, as a fraction of the
// visible size. The head-room lets small pans reuse the previous geometry.
const X_PAD_RATIO = 0.25;
const Y_PAD_RATIO = 0.5;
// Re-sample when the zoom has drifted enough from the plan's pixel size that
// the screen-space tolerance it was built for no longer holds.
const WPP_REBUILD_RATIO = 1.25;
// Seed spacing in screen pixels; refinement fills in wherever the curve
// bends harder than this grid can follow.
const SEED_STEP_PX = 8;

// A sampling plan pins down the window one geometry rebuild covered: the
// sampled x-range, the vertical clip band, and the pixel size it was built
// for. Renderers keep the plan alongside the geometry and rebuild only when
// the viewport moves outside it (see planFitsViewport).
export type FunctionSamplingPlan = {
  xStart: number;
  xEnd: number;
  yMin: number;
  yMax: number;
  worldPerPixel: number;
};

function domainBounds(
  item: ItemSnapshot<"function2d">
): readonly [number, number] | null {
  if (item.domain === "infinite") return null;
  return item.domain[0] <= item.domain[1]
    ? item.domain
    : [item.domain[1], item.domain[0]];
}

export function createFunctionSamplingPlan(
  item: ItemSnapshot<"function2d">,
  viewport: Viewport2D
): FunctionSamplingPlan {
  const bounds = viewport.visibleWorldBounds;
  const padX = (bounds.right - bounds.left) * X_PAD_RATIO;
  const padY = (bounds.top - bounds.bottom) * Y_PAD_RATIO;

  let xStart = bounds.left - padX;
  let xEnd = bounds.right + padX;
  const domain = domainBounds(item);
  if (domain) {
    xStart = Math.max(xStart, domain[0]);
    xEnd = Math.min(xEnd, domain[1]);
  }

  return {
    xStart,
    xEnd,
    yMin: bounds.bottom - padY,
    yMax: bounds.top + padY,
    worldPerPixel: viewport.worldPerPixel,
  };
}

// Whether the geometry built from `plan` still serves the current viewport:
// the zoom hasn't drifted past the tolerance the plan was sampled at, and the
// view hasn't panned outside the sampled x-range or the vertical clip band.
// Item-field changes don't need checking here; any of those go through the
// renderer's update(), which drops the stored plan.
export function planFitsViewport(
  item: ItemSnapshot<"function2d">,
  plan: FunctionSamplingPlan,
  viewport: Viewport2D
): boolean {
  const ratio = viewport.worldPerPixel / plan.worldPerPixel;
  if (ratio > WPP_REBUILD_RATIO || ratio < 1 / WPP_REBUILD_RATIO) return false;

  const bounds = viewport.visibleWorldBounds;
  let needLeft = bounds.left;
  let needRight = bounds.right;
  const domain = domainBounds(item);
  if (domain) {
    needLeft = Math.max(needLeft, domain[0]);
    needRight = Math.min(needRight, domain[1]);
  }
  if (needRight > needLeft && (needLeft < plan.xStart || needRight > plan.xEnd)) {
    return false;
  }
  if (bounds.bottom < plan.yMin || bounds.top > plan.yMax) return false;
  return true;
}

// Sample the function into continuous polyline runs, clipped to the plan's
// window. Runs break at declared discontinuities, at detected jumps and
// asymptotes, and at the edges of the function's domain of definition.
export function sampleFunctionRuns(
  item: ItemSnapshot<"function2d">,
  plan: FunctionSamplingPlan
): CurvePoint[][] {
  if (!(plan.xEnd > plan.xStart)) return [];

  const breaks = [...item.discontinuities]
    .filter((x) => x > plan.xStart && x < plan.xEnd)
    .sort((a, b) => a - b)
    .filter((x, i, arr) => i === 0 || x !== arr[i - 1]);

  const boundaries = [plan.xStart, ...breaks, plan.xEnd];
  const segments: CurveSegment[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    segments.push({
      start: boundaries[i],
      end: boundaries[i + 1],
      openStart: i > 0,
      openEnd: i < boundaries.length - 2,
    });
  }

  const xSlack = SEED_STEP_PX * plan.worldPerPixel;
  return adaptiveSampleCurve({
    f: (x) => ({ x, y: item.f(x) }),
    segments,
    worldPerPixel: plan.worldPerPixel,
    clip: {
      xMin: plan.xStart - xSlack,
      xMax: plan.xEnd + xSlack,
      yMin: plan.yMin,
      yMax: plan.yMax,
    },
    seedStep: SEED_STEP_PX * plan.worldPerPixel,
  });
}
