import type { AtomLikeOptions } from "../atom-wrapper";
import type { Color } from "../common-types/colors";
import type { ItemTags } from "../common-types/tags";
import {
  defineItem,
  field,
  type ItemHandleFromDefinition,
} from "../item-definition";

type PlaneDir = "xy" | "xz" | "yz";
export type PointerEvents = "auto" | "none";

export type Grid3DFields = {
  tags: ItemTags;
  plane: PlaneDir;

  // TODO: This having a boolean doesn't really make sense (unlike axes)
  // because we can't "disable" one axis. It's just that "true" means infinite here.
  // Should probably replace this with just an "infinite" string.
  range1: boolean | [number, number];
  range2: boolean | [number, number];
  offset: number;
  gap: number;
  color: Color;
  opacity: number;
  thickness: number;
  visible: boolean;
  pointerEvents: PointerEvents;
};
export type Grid3DOptions = AtomLikeOptions<Grid3DFields>;

export const grid3dDefinition = defineItem({
  kind: "grid3d",
  fields: {
    tags: field<ItemTags>(() => []),
    plane: field<PlaneDir>("xz"),
    range1: field<boolean | [number, number]>(true),
    range2: field<boolean | [number, number]>(true),
    offset: field(0),
    gap: field(1),
    color: field<Color>("white"),
    opacity: field(0.3),
    thickness: field(2),
    visible: field(true),
    pointerEvents: field<PointerEvents>("auto"),
  },
});

export type Grid3D<Opts extends Grid3DOptions = {}> =
  ItemHandleFromDefinition<typeof grid3dDefinition, Opts>;
