import type { Color } from "../common-types/colors";
import type { ItemTags } from "../common-types/tags";
import { type Vec3, vec3 } from "../common-types/vec3";
import type { AtomLikeOptions } from "../atom-wrapper";
import {
  defineItem,
  field,
  type ItemHandleFromDefinition,
} from "../item-definition";

export type PointerEvents = "auto" | "none";

export type Plane3DFields = {
  tags: ItemTags;
  point: Vec3;
  normal: Vec3;
  width: number;
  height: number;
  color: Color;
  opacity: number;
  showEdges: boolean;
  visible: boolean;
  pointerEvents: PointerEvents;
};
export type Plane3DOptions = AtomLikeOptions<Plane3DFields>;

export const plane3dDefinition = defineItem({
  kind: "plane3d",
  fields: {
    tags: field<ItemTags>(() => []),
    point: field<Vec3>(() => vec3(0, 0, 0)),
    normal: field<Vec3>(() => vec3(0, 1, 0)),
    width: field(2),
    height: field(2),
    color: field<Color>("white"),
    opacity: field(0.5),
    showEdges: field(true),
    visible: field(true),
    pointerEvents: field<PointerEvents>("auto"),
  },
});

export type Plane3D<Opts extends Plane3DOptions = {}> =
  ItemHandleFromDefinition<typeof plane3dDefinition, Opts>;
