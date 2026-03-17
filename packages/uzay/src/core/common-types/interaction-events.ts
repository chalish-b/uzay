import type { Vec3 } from "./vec3";
import type { Vec2 } from "./vec2";

type ItemId = string;

// Base event with common fields
type BaseInteractionEvent<K extends string = string> = {
  itemId: ItemId;
  itemKind: K;
  worldPosition: Vec3; // 3D position where event occurred
  screenPosition: Vec2; // Pixel coordinates on canvas
  ray: { origin: Vec3; direction: Vec3 }; // Camera ray through the pointer
};

// Drag event
export type DragEvent<K extends string = string> = BaseInteractionEvent<K> & {
  type: "drag";
  phase: "start" | "move" | "end";
  startWorldPosition: Vec3;
  delta: Vec3; // Movement since last event (for "move") or since start (for "end")
};

// Click event
export type ClickEvent<K extends string = string> = BaseInteractionEvent<K> & {
  type: "click";
};

// Hover event
export type HoverEvent<K extends string = string> = BaseInteractionEvent<K> & {
  type: "hover";
  phase: "enter" | "move" | "leave";
};

// Union type
export type InteractionEvent<K extends string = string> =
  | DragEvent<K>
  | ClickEvent<K>
  | HoverEvent<K>;

// Event type names
export type InteractionEventType = "drag" | "click" | "hover";

// Handler function types
export type DragHandler<K extends string = string> = (event: DragEvent<K>) => void;
export type ClickHandler<K extends string = string> = (event: ClickEvent<K>) => void;
export type HoverHandler<K extends string = string> = (event: HoverEvent<K>) => void;

export type InteractionHandler<K extends string = string> = {
  drag: DragHandler<K>;
  click: ClickHandler<K>;
  hover: HoverHandler<K>;
};
