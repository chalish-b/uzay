import type { Color } from "../../shared/types/colors";
import type { ItemTags } from "../../shared/types/tags";
import type { AtomLikeOptions } from "../../shared/atom-wrapper";
import {
  field,
  type ItemHandleFromDefinition,
} from "../../shared/item-definition";
import { defineItem2D } from "../types/define-item";

export type PointerEvents = "auto" | "none";

// Axes2D mirrors Axes3D's API: each axis takes `true` (infinite default range),
// `false` (axis disabled), or `[min, max]` for an explicit range.
export type Axes2DFields = {
  tags: ItemTags;
  x: boolean | [number, number];
  y: boolean | [number, number];
  color: Color;
  thickness: number;
  visible: boolean;
  pointerEvents: PointerEvents;
  tickmarks: boolean;
  tickStep: number;
  arrows: boolean;
};
export type Axes2DOptions = AtomLikeOptions<Axes2DFields>;

export const axes2dDefinition = defineItem2D({
  kind: "axes2d",
  fields: {
    tags: field<ItemTags>(() => []),
    x: field<boolean | [number, number]>(true),
    y: field<boolean | [number, number]>(true),
    color: field<Color>("white"),
    thickness: field(1),
    visible: field(true),
    // 2D axes are 1px lines; raycasting against them is unreliable without a
    // tuned line-threshold, so default to "none" (axes are visual scaffolding).
    pointerEvents: field<PointerEvents>("none"),
    tickmarks: field(false),
    tickStep: field(1),
    arrows: field(true),
  },
});

export type Axes2D<Opts extends Axes2DOptions = {}> =
  ItemHandleFromDefinition<typeof axes2dDefinition, Opts>;
