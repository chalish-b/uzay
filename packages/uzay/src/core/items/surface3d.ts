import type { AtomLikeOptions } from "../atom-wrapper";
import type { Color } from "../common-types/colors";
import type { ItemTags } from "../common-types/tags";
import {
  defineItem,
  field,
  type ItemHandleFromDefinition,
} from "../item-definition";

type Surface3DFunc = (x: number, z: number) => number;

export type PointerEvents = "auto" | "none";

export type Surface3DFields = {
  tags: ItemTags;
  f: Surface3DFunc;
  xRange: [number, number];
  zRange: [number, number];
  samples: number;
  color: Color;
  opacity: number;
  wireframe: boolean;
  visible: boolean;
  pointerEvents: PointerEvents;
};
export type Surface3DOptions = AtomLikeOptions<Surface3DFields>;

export const surface3dDefinition = defineItem({
  kind: "surface3d",
  fields: {
    tags: field<ItemTags>(() => []),
    f: field<Surface3DFunc>(
      () => (_x: number, _z: number) => 0,
      { atomize: "value" }
    ),
    xRange: field<[number, number]>(() => [-5, 5]),
    zRange: field<[number, number]>(() => [-5, 5]),
    samples: field(64),
    color: field<Color>("white"),
    opacity: field(1),
    wireframe: field(false),
    visible: field(true),
    pointerEvents: field<PointerEvents>("auto"),
  },
});

export type Surface3D<
  Opts extends Surface3DOptions = {}
> = ItemHandleFromDefinition<typeof surface3dDefinition, Opts>;
