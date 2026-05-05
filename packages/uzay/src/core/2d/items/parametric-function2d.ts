import { vec2 } from "../../shared/types/vec2";
import type { AtomLikeOptions } from "../../shared/atom-wrapper";
import type { Color } from "../../shared/types/colors";
import type { ItemTags } from "../../shared/types/tags";
import type { Vec2 } from "../../shared/types/vec2";
import {
  field,
  type ItemHandleFromDefinition,
} from "../../shared/item-definition";
import { defineItem2D } from "../types/define-item";

type ParametricFunction2DFunc = (t: number) => Vec2;

export type PointerEvents = "auto" | "none";

export type ParametricFunction2DFields = {
  tags: ItemTags;
  f: ParametricFunction2DFunc;
  tStart: number;
  tEnd: number;
  color: Color;
  thickness: number;
  samples: number;
  visible: boolean;
  pointerEvents: PointerEvents;
};
export type ParametricFunction2DOptions =
  AtomLikeOptions<ParametricFunction2DFields>;

export const parametricFunction2dDefinition = defineItem2D({
  kind: "parametricfunction2d",
  fields: {
    tags: field<ItemTags>(() => []),
    // Function-valued fields must be atomized as plain values, otherwise Jotai
    // would interpret them as derived atom factories.
    f: field<ParametricFunction2DFunc>(
      () => (t: number) => vec2(t, t),
      { atomize: "value" }
    ),
    tStart: field(0),
    tEnd: field(1),
    color: field<Color>("white"),
    thickness: field(1),
    samples: field(64),
    visible: field(true),
    pointerEvents: field<PointerEvents>("auto"),
  },
});

export type ParametricFunction2D<
  Opts extends ParametricFunction2DOptions = {}
> = ItemHandleFromDefinition<typeof parametricFunction2dDefinition, Opts>;
