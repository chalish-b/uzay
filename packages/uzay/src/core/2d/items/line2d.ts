import type { ItemTags } from "../../shared/types/tags";
import { vec2, type Vec2 } from "../../shared/types/vec2";
import type { Color } from "../../shared/types/colors";
import type { AtomLikeOptions } from "../../shared/atom-wrapper";
import {
  field,
  type ItemHandleFromDefinition,
} from "../../shared/item-definition";
import { defineItem2D } from "../types/define-item";

export type PointerEvents = "auto" | "none";

export type Line2DArrows = "none" | "start" | "end" | "both";

export type Line2DFields = {
  tags: ItemTags;
  start: Vec2;
  end: Vec2;
  color: Color;
  thickness: number;
  opacity: number;
  // Draw the segment with a dashed stroke. The dash pattern is derived from
  // the thickness and keeps a constant on-screen rhythm at any zoom.
  dashed: boolean;
  // Arrowheads at the segment's ends: tips exactly at the endpoints, pointing
  // outward along the line. "both" is the double-headed dimension arrow. The
  // heads are annotation-sized, a shared library convention; for a
  // configurable head use vector2d.
  arrows: Line2DArrows;
  visible: boolean;
  pointerEvents: PointerEvents;
};
export type Line2DOptions = AtomLikeOptions<Line2DFields>;

export const line2dDefinition = defineItem2D({
  kind: "line2d",
  fields: {
    tags: field<ItemTags>(() => []),
    start: field<Vec2>(() => vec2(0, 0)),
    end: field<Vec2>(() => vec2(0, 0)),
    color: field<Color>("white"),
    thickness: field(1),
    opacity: field(1),
    dashed: field(false),
    arrows: field<Line2DArrows>("none"),
    visible: field(true),
    pointerEvents: field<PointerEvents>("auto"),
  },
});

export type Line2D<Opts extends Line2DOptions = {}> =
  ItemHandleFromDefinition<typeof line2dDefinition, Opts>;
