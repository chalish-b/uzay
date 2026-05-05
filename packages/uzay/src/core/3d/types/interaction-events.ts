import type { Vec3 } from "../../shared/types/vec3";
import type {
  BaseClickEvent,
  BaseDragEvent,
  BaseHoverEvent,
  InteractionEventType,
} from "../../shared/types/interaction-events-base";

// Camera ray through the pointer in world space. Useful for "custom" drag
// projection where the item author wants to do its own intersection math.
type Ray3D = { origin: Vec3; direction: Vec3 };

export type DragEvent<K extends string = string> = BaseDragEvent<K, Vec3> & {
  ray: Ray3D;
};

export type ClickEvent<K extends string = string> = BaseClickEvent<K, Vec3> & {
  ray: Ray3D;
};

export type HoverEvent<K extends string = string> = BaseHoverEvent<K, Vec3> & {
  ray: Ray3D;
};

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

// Event map plugged into BaseItem's EventMap generic for 3D items.
export type Events3DMap<K extends string = string> = {
  drag: DragEvent<K>;
  click: ClickEvent<K>;
  hover: HoverEvent<K>;
};

export type { InteractionEventType };
