import type { ItemId } from "./ids";
import type { Vec2 } from "./vec2";

export type InteractionEventType = "drag" | "click" | "hover";

// Generic interaction event shapes, parameterized over the world-space type.
// Concrete dimension-specific events (3D, 2D) extend these by fixing WorldPos
// and optionally adding extra fields like the camera ray.

export type BaseInteractionEvent<K extends string, WorldPos> = {
  itemId: ItemId;
  itemKind: K;
  worldPosition: WorldPos;
  screenPosition: Vec2;
};

export type BaseDragEvent<K extends string, WorldPos> = BaseInteractionEvent<K, WorldPos> & {
  type: "drag";
  phase: "start" | "move" | "end";
  startWorldPosition: WorldPos;
  delta: WorldPos;
};

export type BaseClickEvent<K extends string, WorldPos> = BaseInteractionEvent<K, WorldPos> & {
  type: "click";
};

export type BaseHoverEvent<K extends string, WorldPos> = BaseInteractionEvent<K, WorldPos> & {
  type: "hover";
  phase: "enter" | "move" | "leave";
};

// Structural shape for any per-dimension event map. BaseItem is generic over
// this so 3D and 2D items can plug in their own concrete event types.
export type AnyEventMap = {
  drag: any;
  click: any;
  hover: any;
};
