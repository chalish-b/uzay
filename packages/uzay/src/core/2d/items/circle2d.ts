import type { AtomLikeOptions } from "../../shared/atom-wrapper";
import type { Color } from "../../shared/types/colors";
import type { ItemTags } from "../../shared/types/tags";
import { type Vec2, vec2 } from "../../shared/types/vec2";
import {
  field,
  type ItemHandleFromDefinition,
} from "../../shared/item-definition";
import { defineItem2D } from "../types/define-item";

export type PointerEvents = "auto" | "none";

export type Circle2DFields = {
  tags: ItemTags;
  center: Vec2;
  radius: number;
  // Angular span, in radians. The full circle by default; set a sub-span to get
  // an arc. The stroke then draws only the arc curve, and the fill only the
  // sector (the wedge from the center).
  thetaStart: number;
  thetaEnd: number;
  color: Color;
  opacity: number;
  strokeColor: Color;
  strokeOpacity: number;
  strokeThickness: number;
  // Draw the outline with a dashed stroke. The dash pattern is derived from
  // the stroke thickness and keeps a constant on-screen rhythm at any zoom.
  strokeDashed: boolean;
  visible: boolean;
  pointerEvents: PointerEvents;
};
export type Circle2DOptions = AtomLikeOptions<Circle2DFields>;

export const circle2dDefinition = defineItem2D({
  kind: "circle2d",
  fields: {
    tags: field<ItemTags>(() => []),
    center: field<Vec2>(() => vec2(0, 0)),
    radius: field(1),
    thetaStart: field(0),
    thetaEnd: field(Math.PI * 2),
    // Outline by default: the çember (curve) is the common case, the filled
    // daire the exception. Raise opacity to shade the disk.
    color: field<Color>("white"),
    opacity: field(0),
    strokeColor: field<Color>("white"),
    strokeOpacity: field(1),
    strokeThickness: field(2),
    strokeDashed: field(false),
    visible: field(true),
    pointerEvents: field<PointerEvents>("auto"),
  },
});

export type Circle2D<Opts extends Circle2DOptions = object> =
  ItemHandleFromDefinition<typeof circle2dDefinition, Opts>;
