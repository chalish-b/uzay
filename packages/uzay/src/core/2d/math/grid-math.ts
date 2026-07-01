import type { ItemSnapshot } from "../types/item-registry";
import type { Viewport2D } from "../types/view-context";
import { getNiceStep } from "../types/nice-step";

type GridRange = boolean | [number, number];
type Bounds = readonly [number, number];

export function getResolvedGridBounds(
  item: ItemSnapshot<"grid2d">,
  viewport: Viewport2D | null
): { x: Bounds | null; y: Bounds | null } {
  const normalize = (bounds: Bounds): Bounds =>
    bounds[0] <= bounds[1] ? bounds : [bounds[1], bounds[0]];

  const resolve = (
    range: GridRange,
    viewportBounds: Bounds | null
  ): Bounds | null => {
    if (Array.isArray(range)) return normalize(range);
    if (range === true) return viewportBounds ? normalize(viewportBounds) : null;
    return null;
  };

  const xViewportBounds: Bounds | null = viewport
    ? [viewport.visibleWorldBounds.left, viewport.visibleWorldBounds.right]
    : null;
  const yViewportBounds: Bounds | null = viewport
    ? [viewport.visibleWorldBounds.bottom, viewport.visibleWorldBounds.top]
    : null;

  return {
    x: resolve(item.rangeX, xViewportBounds),
    y: resolve(item.rangeY, yViewportBounds),
  };
}

export function getGridGap(
  gap: ItemSnapshot<"grid2d">["gap"],
  viewport: Viewport2D | null
): number {
  if (gap !== "auto") return gap;
  if (!viewport || viewport.worldPerPixel <= 0) return 1;
  return getNiceStep(viewport.worldPerPixel);
}

// The grid's line coordinates over the resolved rangeX × rangeY at the
// requested gap: vertical lines at each x running yBounds, horizontal lines
// at each y running xBounds. `true` ranges are viewport-backed when a
// viewport is provided, and otherwise resolve to no lines.
export function buildGridLines(
  item: ItemSnapshot<"grid2d">,
  viewport: Viewport2D | null = null
): { xs: number[]; ys: number[]; xBounds: Bounds; yBounds: Bounds } | null {
  const { x: xBounds, y: yBounds } = getResolvedGridBounds(item, viewport);
  const gap = getGridGap(item.gap, viewport);
  if (!xBounds || !yBounds || gap <= 0) return null;

  const xs: number[] = [];
  const ys: number[] = [];
  const [x0, x1] = xBounds;
  const [y0, y1] = yBounds;

  const firstX = Math.ceil(x0 / gap) * gap;
  for (let x = firstX; x <= x1 + 1e-9; x += gap) {
    xs.push(x);
  }

  const firstY = Math.ceil(y0 / gap) * gap;
  for (let y = firstY; y <= y1 + 1e-9; y += gap) {
    ys.push(y);
  }

  return { xs, ys, xBounds, yBounds };
}
