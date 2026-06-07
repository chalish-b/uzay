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

export type Line2DFields = {
  tags: ItemTags;
  start: Vec2;
  end: Vec2;
  color: Color;
  thickness: number;
  opacity: number;
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
    visible: field(true),
    pointerEvents: field<PointerEvents>("auto"),
  },
});

export type Line2D<Opts extends Line2DOptions = {}> =
  ItemHandleFromDefinition<typeof line2dDefinition, Opts>;
