import type { PointDraggableDir } from "./axes";
import type { Vec3 } from "../../shared/types/vec3";

/** Apply axis/plane constraint to a target position relative to a current position. */
export function applyDragConstraint(
  current: Vec3,
  target: Vec3,
  constraint: PointDraggableDir
): Vec3 {
  switch (constraint) {
    case "x":
      return { ...current, x: target.x };
    case "y":
      return { ...current, y: target.y };
    case "z":
      return { ...current, z: target.z };
    case "xy":
      return { ...current, x: target.x, y: target.y };
    case "xz":
      return { ...current, x: target.x, z: target.z };
    case "yz":
      return { ...current, y: target.y, z: target.z };
    case "xyz":
      return target;
    case "none":
    default:
      return current;
  }
}
