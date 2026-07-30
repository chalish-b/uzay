import type { AtomLikeOptions } from "../../shared/atom-wrapper";
import type { Color } from "../../shared/types/colors";
import type { ItemTags } from "../../shared/types/tags";
import type { EndpointStyle } from "../types/endpoints";
import {
  field,
  type ItemHandleFromDefinition,
} from "../../shared/item-definition";
import { defineItem2D } from "../types/define-item";

type Function2DFunc = (x: number) => number;
export type Function2DDomain = "infinite" | [number, number];
export type PointerEvents = "auto" | "none";

// A discontinuity is either a bare x (the curve just breaks there) or an x
// with endpoint markers per side. "closed" draws a filled dot at (x, f(x));
// "open" draws a hollow ring at the one-sided limit, with the curve trimmed
// back to the ring's edge. A side whose limit diverges gets no marker.
export type Function2DDiscontinuity =
  | number
  | { x: number; left?: EndpointStyle; right?: EndpointStyle };

// Markers at the ends of a finite domain. `start` is the lower-x end.
export type Function2DEndpoints = {
  start?: EndpointStyle;
  end?: EndpointStyle;
};

export type Function2DFields = {
  tags: ItemTags;
  f: Function2DFunc;
  domain: Function2DDomain;
  discontinuities: Function2DDiscontinuity[];
  endpoints: Function2DEndpoints;
  markerRadius: number;
  color: Color;
  thickness: number;
  opacity: number;
  // Draw the curve with a dashed stroke. The dash pattern is derived from
  // the thickness and keeps a constant on-screen rhythm at any zoom.
  dashed: boolean;
  visible: boolean;
  pointerEvents: PointerEvents;
};
export type Function2DOptions = AtomLikeOptions<Function2DFields>;

export const function2dDefinition = defineItem2D({
  kind: "function2d",
  fields: {
    tags: field<ItemTags>(() => []),
    f: field<Function2DFunc>(() => (x: number) => x, { atomize: "value" }),
    domain: field<Function2DDomain>(() => [-10, 10]),
    discontinuities: field<Function2DDiscontinuity[]>(() => []),
    endpoints: field<Function2DEndpoints>(() => ({})),
    // Marker radius in CSS pixels. Stays visually constant across zoom levels.
    markerRadius: field(4),
    color: field<Color>("white"),
    thickness: field(1),
    opacity: field(1),
    dashed: field(false),
    visible: field(true),
    pointerEvents: field<PointerEvents>("auto"),
  },
});

export type Function2D<Opts extends Function2DOptions = object> =
  ItemHandleFromDefinition<typeof function2dDefinition, Opts>;
