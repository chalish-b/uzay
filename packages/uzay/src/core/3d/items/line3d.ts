import type { ItemTags } from "../../shared/types/tags";
import { vec3, type Vec3 } from "../../shared/types/vec3";
import type { Color } from "../../shared/types/colors";
import type { AtomLikeOptions } from "../../shared/atom-wrapper";
import {
  field,
  type ItemHandleFromDefinition,
} from "../../shared/item-definition";
import { defineItem3D } from "../types/define-item";

export type PointerEvents = "auto" | "none";

// "tube" renders a lit 3D tube; "flat" renders an unlit screen-space stroke
// with pixel thickness, like the 2D renderer's lines.
export type LineStyle3D = "tube" | "flat";

export type Line3DFields = {
  tags: ItemTags;
  start: Vec3;
  end: Vec3;
  color: Color;
  thickness: number;
  opacity: number;
  style: LineStyle3D;
  dashed: boolean;
  visible: boolean;
  pointerEvents: PointerEvents;
};
export type Line3DOptions = AtomLikeOptions<Line3DFields>;

export const line3dDefinition = defineItem3D({
  kind: "line3d",
  fields: {
    tags: field<ItemTags>(() => []),
    start: field<Vec3>(() => vec3(0, 0, 0)),
    end: field<Vec3>(() => vec3(0, 0, 0)),
    color: field<Color>("white"),
    thickness: field(1),
    opacity: field(1),
    style: field<LineStyle3D>("tube"),
    // Only applies to the "flat" style.
    dashed: field(false),
    visible: field(true),
    pointerEvents: field<PointerEvents>("auto"),
  },
});

export type Line3D<Opts extends Line3DOptions = {}> =
  ItemHandleFromDefinition<typeof line3dDefinition, Opts>;
