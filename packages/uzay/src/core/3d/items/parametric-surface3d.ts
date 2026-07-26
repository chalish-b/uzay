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

type ParametricSurface3DFunc = (u: number, v: number) => Vec3;

export type PointerEvents = "auto" | "none";

// A single count applies to both axes; a pair is [uSamples, vSamples].
export type ParametricSurface3DSamples = number | [number, number];

export type ParametricSurface3DFields = {
  tags: ItemTags;
  f: ParametricSurface3DFunc;
  uRange: [number, number];
  vRange: [number, number];
  samples: ParametricSurface3DSamples;
  // Declares that the surface joins up along the axis: f at the range's end
  // lands on f at its start for every value of the other parameter. The seam
  // is then welded into shared vertices, so shading is smooth across it.
  closedU: boolean;
  closedV: boolean;
  color: Color;
  opacity: number;
  wireframe: boolean;
  visible: boolean;
  pointerEvents: PointerEvents;
};
export type ParametricSurface3DOptions =
  AtomLikeOptions<ParametricSurface3DFields>;

export const parametricSurface3dDefinition = defineItem3D({
  kind: "parametricsurface3d",
  fields: {
    tags: field<ItemTags>(() => []),
    // Function-valued fields must be atomized as plain values, otherwise Jotai
    // would interpret them as derived atom factories.
    f: field<ParametricSurface3DFunc>(
      () => (u: number, v: number) => vec3(u, 0, v),
      { atomize: "value" }
    ),
    uRange: field<[number, number]>(() => [0, 1]),
    vRange: field<[number, number]>(() => [0, 1]),
    samples: field<ParametricSurface3DSamples>(64),
    closedU: field(false),
    closedV: field(false),
    color: field<Color>("white"),
    opacity: field(1),
    wireframe: field(false),
    visible: field(true),
    pointerEvents: field<PointerEvents>("auto"),
  },
});

export type ParametricSurface3D<
  Opts extends ParametricSurface3DOptions = {}
> = ItemHandleFromDefinition<typeof parametricSurface3dDefinition, Opts>;
