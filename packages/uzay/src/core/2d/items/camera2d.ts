import type { AtomLikeOptions } from "../../shared/atom-wrapper";
import { vec2, type Vec2 } from "../../shared/types/vec2";
import {
  field,
  type ItemHandleFromDefinition,
} from "../../shared/item-definition";
import { defineItem2D } from "../types/define-item";

export type Camera2DFields = {
  // World-space point at the canvas center.
  center: Vec2;
  // Zoom factor relative to the view's base vertical span.
  // zoom = 1 shows the base extent; zoom = 2 halves it (zoom in); etc.
  zoom: number;
  enablePan: boolean;
  enableZoom: boolean;
};

export type Camera2DOptions = AtomLikeOptions<Camera2DFields>;

export const camera2dDefinition = defineItem2D({
  kind: "camera2d",
  fields: {
    center: field<Vec2>(() => vec2(0, 0)),
    zoom: field(1),
    enablePan: field(true),
    enableZoom: field(true),
  },
});

export type Camera2D<Opts extends Camera2DOptions = {}> =
  ItemHandleFromDefinition<typeof camera2dDefinition, Opts>;
