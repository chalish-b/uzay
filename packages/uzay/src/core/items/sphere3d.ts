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

export type Sphere3DFields = {
  tags: ItemTags;
  center: Vec3;
  radius: number;
  color: Color;
  opacity: number;
  visible: boolean;
  pointerEvents: PointerEvents;
};
export type Sphere3DOptions = AtomLikeOptions<Sphere3DFields>;

export const sphere3dDefinition = defineItem({
  kind: "sphere3d",
  fields: {
    tags: field<ItemTags>(() => []),
    center: field<Vec3>(() => vec3(0, 0, 0)),
    radius: field(1),
    color: field<Color>("white"),
    opacity: field(1),
    visible: field(true),
    pointerEvents: field<PointerEvents>("auto"),
  },
});

export type Sphere3D<Opts extends Sphere3DOptions = {}> =
  ItemHandleFromDefinition<typeof sphere3dDefinition, Opts>;
