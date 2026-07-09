import type { PointDraggableDir2D } from "./axes";
import { vec2, type Vec2 } from "../../shared/types/vec2";

// Apply axis constraint to a target position relative to a current position.
// 2D doesn't need ray-plane projection like 3D does because mouse coords map
// directly to a world (x,y) under orthographic projection.
export function applyDragConstraint(
  current: Vec2,
  target: Vec2,
  constraint: PointDraggableDir2D
): Vec2 {
  switch (constraint) {
    case "x":
      return vec2(target.x, current.y);
    case "y":
      return vec2(current.x, target.y);
    case "xy":
      return target;
    case "custom":
    case "none":
    default:
      return current;
  }
}
