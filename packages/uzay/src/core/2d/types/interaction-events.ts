import type { Vec2 } from "../../shared/types/vec2";
import type {
  BaseClickEvent,
  BaseDragEvent,
  BaseHoverEvent,
  InteractionEventType,
} from "../../shared/types/interaction-events-base";

// 2D events: Vec2 world positions, no camera ray. Orthographic projection
// makes the cursor map directly to a world (x,y) on the z=0 plane, so a ray
// would just be a degenerate line and isn't useful for item authors.

export type DragEvent<K extends string = string> = BaseDragEvent<K, Vec2>;
export type ClickEvent<K extends string = string> = BaseClickEvent<K, Vec2>;
export type HoverEvent<K extends string = string> = BaseHoverEvent<K, Vec2>;

export type InteractionEvent<K extends string = string> =
  | DragEvent<K>
  | ClickEvent<K>
  | HoverEvent<K>;

export type DragHandler<K extends string = string> = (event: DragEvent<K>) => void;
export type ClickHandler<K extends string = string> = (event: ClickEvent<K>) => void;
export type HoverHandler<K extends string = string> = (event: HoverEvent<K>) => void;

export type InteractionHandler<K extends string = string> = {
  drag: DragHandler<K>;
  click: ClickHandler<K>;
  hover: HoverHandler<K>;
};

// Plugged into BaseItem's EventMap generic for 2D items.
export type Events2DMap<K extends string = string> = {
  drag: DragEvent<K>;
  click: ClickEvent<K>;
  hover: HoverEvent<K>;
};

export type { InteractionEventType };
