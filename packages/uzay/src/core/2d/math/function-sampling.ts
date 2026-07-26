import type { ItemSnapshot } from "../types/item-registry";
import type { Viewport2D } from "../types/view-context";
import type { EndpointStyle } from "../types/endpoints";
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

// A discontinuity entry normalized to its object form.
type DiscontinuitySpec = {
  x: number;
  left?: EndpointStyle;
  right?: EndpointStyle;
};

function discontinuitySpecs(
  item: ItemSnapshot<"function2d">
): DiscontinuitySpec[] {
  return item.discontinuities.map((d) =>
    typeof d === "number" ? { x: d } : d
  );
}

// An endpoint marker resolved to its world position: a filled dot ("closed")
// or a hollow ring ("open") at the end of a curve branch.
export type FunctionEndpointMarker = {
  x: number;
  y: number;
  style: EndpointStyle;
};

export type FunctionGeometry = {
  runs: CurvePoint[][];
  markers: FunctionEndpointMarker[];
};

// Sample the function into continuous polyline runs, clipped to the plan's
// window. Runs break at declared discontinuities, at detected jumps and
// asymptotes, and at the edges of the function's domain of definition.
function sampleRuns(
  item: ItemSnapshot<"function2d">,
  plan: FunctionSamplingPlan
): CurvePoint[][] {
  if (!(plan.xEnd > plan.xStart)) return [];

  const breaks = discontinuitySpecs(item)
    .map((spec) => spec.x)
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

// Convergence threshold for the one-sided limit probe, in pixels per step.
const LIMIT_CONVERGED_PX = 0.05;
// Same runaway guard rationale as adaptive-sampling's edge loops: float64
// runs out of halvings around 1074 steps.
const MAX_LIMIT_STEPS = 1100;

// Once-per-cause warnings for markers the item asked for but that can't be
// placed. Keyed by item id and cause, so plan rebuilds don't repeat them.
const warnedMarkers = new Set<string>();

function warnMarkerOnce(key: string, message: string): void {
  if (warnedMarkers.has(key)) return;
  warnedMarkers.add(key);
  console.warn(message);
}

// Estimate the one-sided limit of f at x0, approaching from below ("left")
// or above ("right"). Halves the remaining gap each step, like the sampler's
// boundary approach: geometrically shrinking progress reads as a finite
// limit, while values leaving the vertical band still moving outward
// (asymptotes, log-type tails) read as divergence and yield null.
function oneSidedLimit(
  f: (x: number) => number,
  x0: number,
  side: "left" | "right",
  plan: FunctionSamplingPlan
): number | null {
  const dir = side === "left" ? -1 : 1;
  const pad = plan.yMax - plan.yMin;
  const yTop = plan.yMax + pad;
  const yBottom = plan.yMin - pad;

  let dist = SEED_STEP_PX * plan.worldPerPixel;
  let prev: number | null = null;
  let prevProgress = Infinity;
  for (let k = 0; k < MAX_LIMIT_STEPS; k++) {
    dist /= 2;
    const x = x0 + dir * dist;
    if (x === x0) break;
    const y = f(x);
    if (!Number.isFinite(y)) continue;
    if (prev !== null) {
      if ((y > yTop && y > prev) || (y < yBottom && y < prev)) return null;
      const progress = Math.abs(y - prev) / plan.worldPerPixel;
      if (
        k > 8 &&
        progress < LIMIT_CONVERGED_PX &&
        progress < prevProgress * 0.7
      ) {
        return y;
      }
      prevProgress = progress;
    }
    prev = y;
  }
  return prev !== null && prev >= yBottom && prev <= yTop ? prev : null;
}

// Resolve one requested marker to a position. Closed markers sit at the
// attained value f(x); open markers sit at the one-sided limit and are
// skipped when that limit diverges.
function markerAt(
  item: ItemSnapshot<"function2d">,
  plan: FunctionSamplingPlan,
  x: number,
  side: "left" | "right",
  style: EndpointStyle
): FunctionEndpointMarker | null {
  if (style === "closed") {
    const y = item.f(x);
    if (!Number.isFinite(y)) {
      warnMarkerOnce(
        `${item.id}:closed:${x}`,
        `[Function2D] Item "${item.id}" requests a closed endpoint marker at x = ${x}, but f(${x}) is not finite. No marker drawn.`
      );
      return null;
    }
    return { x, y, style };
  }
  const y = oneSidedLimit(item.f, x, side, plan);
  return y === null ? null : { x, y, style };
}

// A hole (both sides open, converging to the same value) collapses into a
// single ring instead of two coincident ones.
function dedupeMarkers(
  markers: FunctionEndpointMarker[],
  worldPerPixel: number
): FunctionEndpointMarker[] {
  const out: FunctionEndpointMarker[] = [];
  for (const m of markers) {
    const dup = out.some(
      (o) =>
        o.style === m.style &&
        Math.abs(o.x - m.x) / worldPerPixel < 0.5 &&
        Math.abs(o.y - m.y) / worldPerPixel < 0.5
    );
    if (!dup) out.push(m);
  }
  return out;
}

function collectEndpointMarkers(
  item: ItemSnapshot<"function2d">,
  plan: FunctionSamplingPlan
): FunctionEndpointMarker[] {
  const out: FunctionEndpointMarker[] = [];

  for (const spec of discontinuitySpecs(item)) {
    if (spec.x <= plan.xStart || spec.x >= plan.xEnd) continue;
    if (spec.left) {
      const m = markerAt(item, plan, spec.x, "left", spec.left);
      if (m) out.push(m);
    }
    if (spec.right) {
      const m = markerAt(item, plan, spec.x, "right", spec.right);
      if (m) out.push(m);
    }
  }

  const { start, end } = item.endpoints;
  if (start || end) {
    const domain = domainBounds(item);
    if (!domain) {
      warnMarkerOnce(
        `${item.id}:endpoints-infinite`,
        `[Function2D] Item "${item.id}" sets endpoints, but its domain is "infinite" so there are no ends to mark. No markers drawn.`
      );
    } else {
      // The plan clamps to the domain, so the plan edge coincides with the
      // domain edge exactly when that edge is within the sampled window.
      if (start && plan.xStart === domain[0]) {
        const m = markerAt(item, plan, domain[0], "right", start);
        if (m) out.push(m);
      }
      if (end && plan.xEnd === domain[1]) {
        const m = markerAt(item, plan, domain[1], "left", end);
        if (m) out.push(m);
      }
    }
  }

  return dedupeMarkers(out, plan.worldPerPixel);
}

function distSq(p: CurvePoint, m: FunctionEndpointMarker): number {
  const dx = p.x - m.x;
  const dy = p.y - m.y;
  return dx * dx + dy * dy;
}

// First crossing of the segment from a (outside the circle) to b (inside)
// with the circle of radius r around c. Falls back to b on degenerate or
// grazing configurations.
function circleCrossing(
  a: CurvePoint,
  b: CurvePoint,
  c: FunctionEndpointMarker,
  r: number
): CurvePoint {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const fx = a.x - c.x;
  const fy = a.y - c.y;
  const qa = dx * dx + dy * dy;
  if (qa === 0) return b;
  const qb = 2 * (fx * dx + fy * dy);
  const qc = fx * fx + fy * fy - r * r;
  const disc = qb * qb - 4 * qa * qc;
  if (disc <= 0) return b;
  const s = Math.sqrt(disc);
  let t = (-qb - s) / (2 * qa);
  if (t < 0 || t > 1) t = (-qb + s) / (2 * qa);
  if (t < 0 || t > 1) return b;
  return { x: a.x + t * dx, y: a.y + t * dy };
}

// Shorten one end of a run that terminates inside the marker's ring, so the
// curve stops at the ring's edge instead of poking into its hollow interior.
// Returns [] when the whole run sits inside the ring.
function trimRunEnd(
  run: CurvePoint[],
  m: FunctionEndpointMarker,
  r: number,
  which: "start" | "end"
): CurvePoint[] {
  if (run.length < 2) return run;
  const r2 = r * r;

  if (which === "end") {
    if (distSq(run[run.length - 1], m) >= r2) return run;
    let i = run.length - 1;
    while (i >= 0 && distSq(run[i], m) < r2) i--;
    if (i < 0) return [];
    const cross = circleCrossing(run[i], run[i + 1], m, r);
    return [...run.slice(0, i + 1), cross];
  }

  if (distSq(run[0], m) >= r2) return run;
  let i = 0;
  while (i < run.length && distSq(run[i], m) < r2) i++;
  if (i >= run.length) return [];
  const cross = circleCrossing(run[i], run[i - 1], m, r);
  return [cross, ...run.slice(i)];
}

// Only run ends are trim candidates: a run merely passing near a marker
// keeps its interior points, since the curve genuinely goes through there.
function trimRunsAtOpenMarkers(
  runs: CurvePoint[][],
  markers: FunctionEndpointMarker[],
  rWorld: number
): CurvePoint[][] {
  const open = markers.filter((m) => m.style === "open");
  if (open.length === 0 || !(rWorld > 0)) return runs;

  const trimmed: CurvePoint[][] = [];
  for (let run of runs) {
    for (const m of open) {
      run = trimRunEnd(run, m, rWorld, "start");
      run = trimRunEnd(run, m, rWorld, "end");
    }
    if (run.length >= 2) trimmed.push(run);
  }
  return trimmed;
}

// The full drawable geometry for one plan: polyline runs plus endpoint
// markers, with runs trimmed back to the edge of any open ring they end in.
// The trim distance is baked in world units at the plan's zoom; markers are
// drawn at exact pixel radius, and the mismatch within the plan's zoom
// tolerance stays under the ring's stroke width.
export function sampleFunctionGeometry(
  item: ItemSnapshot<"function2d">,
  plan: FunctionSamplingPlan
): FunctionGeometry {
  const runs = sampleRuns(item, plan);
  const markers = collectEndpointMarkers(item, plan);
  return {
    runs: trimRunsAtOpenMarkers(
      runs,
      markers,
      item.markerRadius * plan.worldPerPixel
    ),
    markers,
  };
}
