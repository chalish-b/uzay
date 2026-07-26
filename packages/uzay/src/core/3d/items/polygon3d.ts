import type { AtomLikeOptions } from "../../shared/atom-wrapper";
import type { Color } from "../../shared/types/colors";
import type { ItemTags } from "../../shared/types/tags";
import { type Vec3, vec3 } from "../../shared/types/vec3";
import {
  field,
  type ItemHandleFromDefinition,
} from "../../shared/item-definition";
import { defineItem3D } from "../types/define-item";

export type PointerEvents = "auto" | "none";

// A single planar polygon, or several disjoint polygons rendered as one item.
// Each polygon can be concave but is expected to be planar: a non-planar
// polygon still renders, triangulated from its flat projection so it folds
// across the surface, and logs a console warning.
export type Polygon3DPoints = Vec3[] | Vec3[][];

export type Polygon3DFields = {
  tags: ItemTags;
  points: Polygon3DPoints;
  color: Color;
  opacity: number;
  strokeColor: Color;
  strokeOpacity: number;
  strokeThickness: number;
  visible: boolean;
  pointerEvents: PointerEvents;
};
export type Polygon3DOptions = AtomLikeOptions<Polygon3DFields>;

export const polygon3dDefinition = defineItem3D({
  kind: "polygon3d",
  fields: {
    tags: field<ItemTags>(() => []),
    points: field<Polygon3DPoints>(() => [
      vec3(0, 0, 0),
      vec3(1, 0, 0),
      vec3(0, 1, 0),
    ]),
    color: field<Color>("white"),
    opacity: field(0.35),
    strokeColor: field<Color>("white"),
    strokeOpacity: field(0),
    strokeThickness: field(1),
    visible: field(true),
    pointerEvents: field<PointerEvents>("auto"),
  },
});

export type Polygon3D<Opts extends Polygon3DOptions = object> =
  ItemHandleFromDefinition<typeof polygon3dDefinition, Opts>;
