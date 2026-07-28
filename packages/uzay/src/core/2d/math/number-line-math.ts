import { vec2, type Vec2 } from "../../shared/types/vec2";
import type { Viewport2D } from "../types/view-context";
import type { TickStep } from "../items/axes2d";
import { getNiceStep } from "../types/nice-step";

// A number line is its own 1D coordinate system embedded in the plane:
// `position` is the world point where value 0 sits, `angle` the direction of
// increasing values, `scale` how many world units one value unit takes. The
// value-to-world mapping is shared here so both backends agree on it.

// Distance from the line to a tick label's center, in pixels. Labels sit on
// the clockwise side of the direction of travel (below a rightward line).
export const NUMBER_LINE_LABEL_OFFSET_PX = 14;

// The unit direction of increasing values.
export function numberLineDirection(angle: number): Vec2 {
  return vec2(Math.cos(angle), Math.sin(angle));
}

// The unit normal, 90° counterclockwise from the direction.
export function numberLineNormal(angle: number): Vec2 {
  return vec2(-Math.sin(angle), Math.cos(angle));
}

// World position of a value on the line.
export function numberLineValueToWorld(
  position: Vec2,
  angle: number,
  scale: number,
  value: number
): Vec2 {
  return position.add(numberLineDirection(angle).scale(scale * value));
}

// The value whose position lies closest to a world point: the orthogonal
// projection of the point onto the line, read in value units.
export function numberLineWorldToValue(
  position: Vec2,
  angle: number,
  scale: number,
  point: Vec2
): number {
  const dir = numberLineDirection(angle);
  const rel = point.sub(position);
  return (rel.x * dir.x + rel.y * dir.y) / scale;
}

// Tick step in value units. "auto" adapts to the zoom like axes2d, with the
// line's scale folded in so the picked step reads as values, not world units.
export function getNumberLineTickStep(
  tickStep: TickStep,
  viewport: Viewport2D | null,
  scale: number
): number {
  if (tickStep !== "auto") return tickStep;
  if (!viewport || viewport.worldPerPixel <= 0 || scale === 0) return 1;
  return getNiceStep(viewport.worldPerPixel / Math.abs(scale));
}
