import type { AtomLikeOptions } from "../../shared/atom-wrapper";
import type { Color } from "../../shared/types/colors";
import type { ItemTags } from "../../shared/types/tags";
import {
  field,
  type ItemHandleFromDefinition,
} from "../../shared/item-definition";
import { defineItem2D } from "../types/define-item";

type Function2DFunc = (x: number) => number;
export type Function2DDomain = "infinite" | [number, number];
export type PointerEvents = "auto" | "none";

export type Function2DFields = {
  tags: ItemTags;
  f: Function2DFunc;
  domain: Function2DDomain;
  discontinuities: number[];
  color: Color;
  thickness: number;
  samples: number;
  visible: boolean;
  pointerEvents: PointerEvents;
};
export type Function2DOptions = AtomLikeOptions<Function2DFields>;

export const function2dDefinition = defineItem2D({
  kind: "function2d",
  fields: {
    tags: field<ItemTags>(() => []),
    f: field<Function2DFunc>(() => (x: number) => x, { atomize: "value" }),
    domain: field<Function2DDomain>(() => [-10, 10]),
    discontinuities: field<number[]>(() => []),
    color: field<Color>("white"),
    thickness: field(1),
    samples: field(128),
    visible: field(true),
    pointerEvents: field<PointerEvents>("auto"),
  },
});

export type Function2D<Opts extends Function2DOptions = object> =
  ItemHandleFromDefinition<typeof function2dDefinition, Opts>;
