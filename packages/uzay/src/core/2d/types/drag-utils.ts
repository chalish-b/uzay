import type { PointDraggableDir2D } from "./axes";
import type { Vec2 } from "../../shared/types/vec2";

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
      return { x: target.x, y: current.y };
    case "y":
      return { x: current.x, y: target.y };
    case "xy":
      return target;
    case "none":
    default:
      return current;
  }
}
