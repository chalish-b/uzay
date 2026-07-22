import { vec3 } from "../../shared/types/vec3";
import type { AtomLikeOptions } from "../../shared/atom-wrapper";
import type { Color } from "../../shared/types/colors";
import type { ItemTags } from "../../shared/types/tags";
import type { Vec3 } from "../../shared/types/vec3";
import {
  field,
  type ItemHandleFromDefinition,
} from "../../shared/item-definition";
import { defineItem3D } from "../types/define-item";

type ParametricFunction3DFunc = (t: number) => Vec3;

export type PointerEvents = "auto" | "none";

export type ParametricFunction3DFields = {
  tags: ItemTags;
  f: ParametricFunction3DFunc;
  tStart: number;
  tEnd: number;
  color: Color;
  thickness: number;
  opacity: number;
  samples: number;
  visible: boolean;
  pointerEvents: PointerEvents;
};
export type ParametricFunction3DOptions =
  AtomLikeOptions<ParametricFunction3DFields>;

export const parametricFunction3dDefinition = defineItem3D({
  kind: "parametricfunction3d",
  fields: {
    tags: field<ItemTags>(() => []),
    // Function-valued fields must be atomized as plain values, otherwise Jotai
    // would interpret them as derived atom factories.
    f: field<ParametricFunction3DFunc>(
      () => (t: number) => vec3(t, t, t),
      { atomize: "value" }
    ),
    tStart: field(0),
    tEnd: field(1),
    color: field<Color>("white"),
    thickness: field(1),
    opacity: field(1),
    samples: field(64),
    visible: field(true),
    pointerEvents: field<PointerEvents>("auto"),
  },
});

export type ParametricFunction3D<
  Opts extends ParametricFunction3DOptions = {}
> = ItemHandleFromDefinition<typeof parametricFunction3dDefinition, Opts>;
