import type { ItemSnapshot } from "../types/item-registry";
import type { Viewport2D } from "../types/view-context";
import { getNiceStep } from "../types/nice-step";
import { hasArrowAt, type ArrowEnds } from "../../shared/types/arrows";

export const INFINITE_RANGE: readonly [number, number] = [-100, 100];

export type AxisKey = "x" | "y";

export function getAxisRange(
  axis: AxisKey,
  value: boolean | [number, number],
  viewport: Viewport2D | null = null
): readonly [number, number] {
  if (typeof value !== "boolean") return value;
  if (value === true && viewport) {
    const { left, right, bottom, top } = viewport.visibleWorldBounds;
    return axis === "x" ? [left, right] : [bottom, top];
  }
  return INFINITE_RANGE;
}

// Range ends whose tick (and label) the arrowhead replaces.
export function arrowEndSkips(
  range: readonly [number, number],
  arrows: ArrowEnds
): number[] {
  const skips: number[] = [];
  if (hasArrowAt(arrows, "start")) skips.push(range[0]);
  if (hasArrowAt(arrows, "end")) skips.push(range[1]);
  return skips;
}

// `skip` drops ticks at those positions: the axes' crossing point (where a
// mark and label would collide with the crossing axis line) and any range
// end carrying an arrowhead (the head visually replaces the tick).
export function buildTickPositions(
  range: readonly [number, number],
  step: number,
  skip: readonly number[] = []
): number[] {
  if (step <= 0) return [];
  const positions: number[] = [];
  const start = Math.ceil(range[0] / step) * step;
  for (let v = start; v <= range[1] + 1e-9; v += step) {
    if (skip.some((s) => Math.abs(v - s) < 1e-9)) continue;
    positions.push(v);
  }
  return positions;
}

export function formatTick(value: number, step: number): string {
  const decimals = Math.max(0, Math.ceil(-Math.log10(Math.abs(step))));
  const rounded = Number(value.toFixed(decimals));
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

export function getTickStep(
  tickStep: ItemSnapshot<"axes2d">["tickStep"],
  viewport: Viewport2D | null
): number {
  if (tickStep !== "auto") return tickStep;
  if (!viewport || viewport.worldPerPixel <= 0) return 1;
  return getNiceStep(viewport.worldPerPixel);
}
