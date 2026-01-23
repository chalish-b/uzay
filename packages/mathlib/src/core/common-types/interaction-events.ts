import type { ItemId, ItemKind } from "./item-registry";
import type { Vec3 } from "./vec3";
import type { Vec2 } from "./vec2";

// Base event with common fields
type BaseInteractionEvent<K extends ItemKind = ItemKind> = {
  itemId: ItemId;
  itemKind: K;
  worldPosition: Vec3; // 3D position where event occurred
  screenPosition: Vec2; // Pixel coordinates on canvas
};

// Drag event
export type DragEvent<K extends ItemKind = ItemKind> = BaseInteractionEvent<K> & {
  type: "drag";
  phase: "start" | "move" | "end";
  startWorldPosition: Vec3;
  delta: Vec3; // Movement since last event (for "move") or since start (for "end")
};

// Click event
export type ClickEvent<K extends ItemKind = ItemKind> = BaseInteractionEvent<K> & {
  type: "click";
};

// Hover event
export type HoverEvent<K extends ItemKind = ItemKind> = BaseInteractionEvent<K> & {
  type: "hover";
  phase: "enter" | "move" | "leave";
};

// Union type
export type InteractionEvent<K extends ItemKind = ItemKind> =
  | DragEvent<K>
  | ClickEvent<K>
  | HoverEvent<K>;

// Event type names
export type InteractionEventType = "drag" | "click" | "hover";

// Handler function types
export type DragHandler<K extends ItemKind = ItemKind> = (event: DragEvent<K>) => void;
export type ClickHandler<K extends ItemKind = ItemKind> = (event: ClickEvent<K>) => void;
export type HoverHandler<K extends ItemKind = ItemKind> = (event: HoverEvent<K>) => void;

export type InteractionHandler<K extends ItemKind = ItemKind> = {
  drag: DragHandler<K>;
  click: ClickHandler<K>;
  hover: HoverHandler<K>;
};
