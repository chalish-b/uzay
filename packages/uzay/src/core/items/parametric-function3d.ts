import { vec3 } from "../common-types/vec3";
import type { AtomLikeOptions } from "../atom-wrapper";
import type { Color } from "../common-types/colors";
import type { ItemTags } from "../common-types/tags";
import type { Vec3 } from "../common-types/vec3";
import {
  defineItem,
  field,
  type ItemHandleFromDefinition,
} from "../item-definition";

type ParametricFunction3DFunc = (t: number) => Vec3;

export type PointerEvents = "auto" | "none";

export type ParametricFunction3DFields = {
  tags: ItemTags;
  f: ParametricFunction3DFunc;
  tStart: number;
  tEnd: number;
  color: Color;
  thickness: number;
  samples: number;
  visible: boolean;
  pointerEvents: PointerEvents;
};
export type ParametricFunction3DOptions =
  AtomLikeOptions<ParametricFunction3DFields>;

export const parametricFunction3dDefinition = defineItem({
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
    samples: field(64),
    visible: field(true),
    pointerEvents: field<PointerEvents>("auto"),
  },
});

export type ParametricFunction3D<
  Opts extends ParametricFunction3DOptions = {}
> = ItemHandleFromDefinition<typeof parametricFunction3dDefinition, Opts>;
