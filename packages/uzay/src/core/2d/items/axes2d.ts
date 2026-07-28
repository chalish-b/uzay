import type { ArrowEnds } from "../../shared/types/arrows";
import type { Color } from "../../shared/types/colors";
import type { ItemTags } from "../../shared/types/tags";
import { vec2, type Vec2 } from "../../shared/types/vec2";
import type { AtomLikeOptions } from "../../shared/atom-wrapper";
import {
  field,
  type ItemHandleFromDefinition,
} from "../../shared/item-definition";
import { defineItem2D } from "../types/define-item";

export type PointerEvents = "auto" | "none";
export type TickStep = number | "auto";

// Axes2D mirrors Axes3D's API: each axis takes `true` for a viewport-backed
// axis, `false` to disable it, or `[min, max]` for an explicit range.
export type Axes2DFields = {
  tags: ItemTags;
  x: boolean | [number, number];
  y: boolean | [number, number];
  // World point where the two axes cross. Axis lines, tickmarks and arrows
  // shift with it; tick values and labels stay absolute world coordinates.
  // Off-origin axes also make single-axis number lines (e.g. stacked rows):
  // enable one axis and place its baseline with the origin's other component.
  origin: Vec2;
  color: Color;
  thickness: number;
  visible: boolean;
  pointerEvents: PointerEvents;
  tickmarks: boolean;
  tickStep: TickStep;
  labels: boolean;
  /**
   * CSS class for tick labels. Providing this (or labelStyle) removes the
   * default label look entirely (color, font, text-shadow), so classes can
   * theme labels without fighting inline styles. Only structural styles
   * (line-height, white-space, pointer-events) remain.
   */
  labelClassName: string;
  /**
   * Inline CSS for tick labels. Replaces the default label look entirely
   * (color, font, text-shadow) rather than merging with it: properties you
   * don't set fall back to inherited/browser values, not to the defaults.
   */
  labelStyle: string;
  // Arrowheads at the axes' ends: "end" is the range's max side, "start" the
  // min side. One value applies to both enabled axes.
  arrows: ArrowEnds;
};
export type Axes2DOptions = AtomLikeOptions<Axes2DFields>;

export const axes2dDefinition = defineItem2D({
  kind: "axes2d",
  fields: {
    tags: field<ItemTags>(() => []),
    x: field<boolean | [number, number]>(true),
    y: field<boolean | [number, number]>(true),
    origin: field<Vec2>(() => vec2(0, 0)),
    color: field<Color>("white"),
    thickness: field(1),
    visible: field(true),
    // 2D axes are 1px lines; raycasting against them is unreliable without a
    // tuned line-threshold, so default to "none" (axes are visual scaffolding).
    pointerEvents: field<PointerEvents>("none"),
    tickmarks: field(false),
    tickStep: field<TickStep>(1),
    labels: field(false),
    labelClassName: field(""),
    labelStyle: field(""),
    arrows: field<ArrowEnds>("both"),
  },
});

export type Axes2D<Opts extends Axes2DOptions = object> =
  ItemHandleFromDefinition<typeof axes2dDefinition, Opts>;
