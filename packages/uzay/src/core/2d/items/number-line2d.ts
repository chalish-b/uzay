import type { ArrowEnds } from "../../shared/types/arrows";
import type { Color } from "../../shared/types/colors";
import type { OverlayAnchor } from "../../shared/types/overlay";
import type { ItemTags } from "../../shared/types/tags";
import { vec2, type Vec2 } from "../../shared/types/vec2";
import type { AtomLikeOptions } from "../../shared/atom-wrapper";
import {
  field,
  type ItemHandleFromDefinition,
} from "../../shared/item-definition";
import { defineItem2D } from "../types/define-item";
import type { TickStep } from "./axes2d";

export type PointerEvents = "auto" | "none";

// A number line: its own 1D coordinate system embedded in the plane. Unlike
// axes2d, whose labels report world coordinates, a number line's ticks and
// labels are its own values and travel with it wherever it is placed. A
// value v lands at position + direction(angle) · scale · v.
export type NumberLine2DFields = {
  tags: ItemTags;
  // World point where value 0 sits.
  position: Vec2;
  // Direction of increasing values, in radians. 0 points along +x.
  angle: number;
  // World units per value unit. Must be nonzero.
  scale: number;
  // Visible span, in value units.
  range: [number, number];
  color: Color;
  thickness: number;
  tickmarks: boolean;
  tickStep: TickStep;
  // Ornament sizes in CSS pixels, rendered constant across zoom (same
  // convention as vector2d's head fields). Full tick length, head measured
  // from base to tip / across the base.
  tickLength: number;
  headLength: number;
  headWidth: number;
  labels: boolean;
  /**
   * Which side of the line the tick labels sit on, as the overlay anchor
   * vocabulary: the anchor names the label-box edge pinned at the tick, so
   * the label extends away from it ("right" puts labels to the left of a
   * vertical line, "top" hangs them below a horizontal one). "auto" places
   * them clear of the line based on its angle.
   */
  labelAnchor: OverlayAnchor | "auto";
  /**
   * CSS class for tick labels. Providing this (or labelStyle) removes the
   * default label look entirely, same contract as axes2d.
   */
  labelClassName: string;
  labelStyle: string;
  // Arrowheads at the line's ends: "end" is the range's max side, "start"
  // the min side.
  arrows: ArrowEnds;
  visible: boolean;
  pointerEvents: PointerEvents;
};
export type NumberLine2DOptions = AtomLikeOptions<NumberLine2DFields>;

export const numberLine2dDefinition = defineItem2D({
  kind: "numberline2d",
  fields: {
    tags: field<ItemTags>(() => []),
    position: field<Vec2>(() => vec2(0, 0)),
    angle: field(0),
    scale: field(1),
    range: field<[number, number]>(() => [-5, 5]),
    color: field<Color>("white"),
    thickness: field(1),
    // Ticks and labels are the identity of a number line, so unlike axes2d
    // they default on.
    tickmarks: field(true),
    tickStep: field<TickStep>(1),
    tickLength: field(12),
    headLength: field(14),
    headWidth: field(10),
    labels: field(true),
    labelAnchor: field<OverlayAnchor | "auto">("auto"),
    labelClassName: field(""),
    labelStyle: field(""),
    arrows: field<ArrowEnds>("both"),
    visible: field(true),
    // Like axes2d: a 1px line raycasts unreliably, and the item is usually
    // scaffolding for marks placed on it.
    pointerEvents: field<PointerEvents>("none"),
  },
});

export type NumberLine2D<Opts extends NumberLine2DOptions = object> =
  ItemHandleFromDefinition<typeof numberLine2dDefinition, Opts>;
