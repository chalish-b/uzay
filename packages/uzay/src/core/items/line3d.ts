import type { ItemTags } from "../common-types/tags";
import { vec3, type Vec3 } from "../common-types/vec3";
import type { Color } from "../common-types/colors";
import type { AtomLikeOptions } from "../atom-wrapper";
import {
  defineItem,
  field,
  type ItemHandleFromDefinition,
} from "../item-definition";

export type PointerEvents = "auto" | "none";

export type Line3DFields = {
  tags: ItemTags;
  start: Vec3;
  end: Vec3;
  color: Color;
  thickness: number;
  visible: boolean;
  pointerEvents: PointerEvents;
};
export type Line3DOptions = AtomLikeOptions<Line3DFields>;

export const line3dDefinition = defineItem({
  kind: "line3d",
  fields: {
    tags: field<ItemTags>(() => []),
    start: field<Vec3>(() => vec3(0, 0, 0)),
    end: field<Vec3>(() => vec3(0, 0, 0)),
    color: field<Color>("white"),
    thickness: field(1),
    visible: field(true),
    pointerEvents: field<PointerEvents>("auto"),
  },
});

export type Line3D<Opts extends Line3DOptions = {}> =
  ItemHandleFromDefinition<typeof line3dDefinition, Opts>;
