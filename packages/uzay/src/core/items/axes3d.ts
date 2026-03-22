import type { Color } from "../common-types/colors";
import type { ItemTags } from "../common-types/tags";
import type { AtomLikeOptions } from "../atom-wrapper";
import {
  defineItem,
  field,
  type ItemHandleFromDefinition,
} from "../item-definition";

export type PointerEvents = "auto" | "none";

export type Axes3DFields = {
  tags: ItemTags;
  // In the future, we'll probably make this `boolean | [number, number]` for range
  // "true" is infinite (default), "false" is disabled, and array gives us a range
  x: boolean | [number, number];
  y: boolean | [number, number];
  z: boolean | [number, number];
  color: Color;
  thickness: number;
  visible: boolean;
  pointerEvents: PointerEvents;
  tickmarks: boolean;
  tickStep: number;
  arrows: boolean;
};
export type Axes3DOptions = AtomLikeOptions<Axes3DFields>;

export const axes3dDefinition = defineItem({
  kind: "axes3d",
  fields: {
    tags: field<ItemTags>(() => []),
    x: field<boolean | [number, number]>(true),
    y: field<boolean | [number, number]>(true),
    z: field<boolean | [number, number]>(true),
    color: field<Color>("white"),
    thickness: field(1),
    visible: field(true),
    pointerEvents: field<PointerEvents>("auto"),
    tickmarks: field(false),
    tickStep: field(1),
    arrows: field(true),
  },
});

export type Axes3D<Opts extends Axes3DOptions = {}> =
  ItemHandleFromDefinition<typeof axes3dDefinition, Opts>;
