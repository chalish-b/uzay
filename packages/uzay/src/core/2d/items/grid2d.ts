import type { AtomLikeOptions } from "../../shared/atom-wrapper";
import type { Color } from "../../shared/types/colors";
import type { ItemTags } from "../../shared/types/tags";
import {
  field,
  type ItemHandleFromDefinition,
} from "../../shared/item-definition";
import { defineItem2D } from "../types/define-item";

export type PointerEvents = "auto" | "none";
export type GridGap = number | "auto";

// Grid2D mirrors Grid3D's range1/range2 shape: explicit bounds [min, max]
// for finite grids, `true` for a viewport-backed grid, or `false` to omit
// that axis.
export type Grid2DFields = {
  tags: ItemTags;
  rangeX: boolean | [number, number];
  rangeY: boolean | [number, number];
  gap: GridGap;
  color: Color;
  opacity: number;
  thickness: number;
  visible: boolean;
  pointerEvents: PointerEvents;
};
export type Grid2DOptions = AtomLikeOptions<Grid2DFields>;

export const grid2dDefinition = defineItem2D({
  kind: "grid2d",
  fields: {
    tags: field<ItemTags>(() => []),
    rangeX: field<boolean | [number, number]>(() => [-10, 10]),
    rangeY: field<boolean | [number, number]>(() => [-10, 10]),
    gap: field<GridGap>(1),
    color: field<Color>("white"),
    opacity: field(0.3),
    thickness: field(1),
    visible: field(true),
    pointerEvents: field<PointerEvents>("none"),
  },
});

export type Grid2D<Opts extends Grid2DOptions = object> =
  ItemHandleFromDefinition<typeof grid2dDefinition, Opts>;
