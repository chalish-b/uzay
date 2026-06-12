import type { AtomLikeOptions } from "../../shared/atom-wrapper";
import type { Color } from "../../shared/types/colors";
import type { ItemTags } from "../../shared/types/tags";
import { type Vec2, vec2 } from "../../shared/types/vec2";
import {
  field,
  type ItemHandleFromDefinition,
} from "../../shared/item-definition";
import { defineItem2D } from "../types/define-item";

export type PointerEvents = "auto" | "none";

// A single polygon, or several disjoint polygons rendered as one region.
export type Region2DPoints = Vec2[] | Vec2[][];

export type Region2DFields = {
  tags: ItemTags;
  points: Region2DPoints;
  color: Color;
  opacity: number;
  strokeColor: Color;
  strokeOpacity: number;
  strokeThickness: number;
  visible: boolean;
  pointerEvents: PointerEvents;
};
export type Region2DOptions = AtomLikeOptions<Region2DFields>;

export const region2dDefinition = defineItem2D({
  kind: "region2d",
  fields: {
    tags: field<ItemTags>(() => []),
    points: field<Region2DPoints>(() => [vec2(0, 0), vec2(1, 0), vec2(0, 1)]),
    color: field<Color>("white"),
    opacity: field(0.35),
    strokeColor: field<Color>("white"),
    strokeOpacity: field(0),
    strokeThickness: field(1),
    visible: field(true),
    pointerEvents: field<PointerEvents>("auto"),
  },
});

export type Region2D<Opts extends Region2DOptions = object> =
  ItemHandleFromDefinition<typeof region2dDefinition, Opts>;
