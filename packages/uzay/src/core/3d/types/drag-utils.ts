import type { PointDraggableDir } from "./axes";
import { vec3, type Vec3 } from "../../shared/types/vec3";

/** Apply axis/plane constraint to a target position relative to a current position. */
export function applyDragConstraint(
  current: Vec3,
  target: Vec3,
  constraint: PointDraggableDir
): Vec3 {
  switch (constraint) {
    case "x":
      return vec3(target.x, current.y, current.z);
    case "y":
      return vec3(current.x, target.y, current.z);
    case "z":
      return vec3(current.x, current.y, target.z);
    case "xy":
      return vec3(target.x, target.y, current.z);
    case "xz":
      return vec3(target.x, current.y, target.z);
    case "yz":
      return vec3(current.x, target.y, target.z);
    case "xyz":
      return target;
    case "none":
    default:
      return current;
  }
}
