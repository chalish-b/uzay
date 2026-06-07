import type { ItemTags } from "../../shared/types/tags";
import { type Vec2, vec2 } from "../../shared/types/vec2";
import type { OverlayAnchor, OverlayFormat } from "../../shared/types/overlay";
import type { PointerEvents } from "./point2d";
import type { AtomLikeOptions } from "../../shared/atom-wrapper";
import {
  field,
  type ItemHandleFromDefinition,
} from "../../shared/item-definition";
import { defineItem2D } from "../types/define-item";

export type Overlay2DFields = {
  tags: ItemTags;
  position: Vec2;
  content: string;
  format: OverlayFormat;
  offset: Vec2;
  anchor: OverlayAnchor;
  visible: boolean;
  className: string;
  style: string;
  pointerEvents: PointerEvents;
};
export type Overlay2DOptions = AtomLikeOptions<Overlay2DFields>;

export const overlay2dDefinition = defineItem2D({
  kind: "overlay2d",
  fields: {
    tags: field<ItemTags>(() => []),
    position: field<Vec2>(() => vec2(0, 0)),
    content: field(""),
    format: field<OverlayFormat>("text"),
    offset: field<Vec2>(() => vec2(0, 0)),
    anchor: field<OverlayAnchor>("center"),
    visible: field(true),
    className: field(""),
    style: field(""),
    pointerEvents: field<PointerEvents>("none"),
  },
});

export type Overlay2D<Opts extends Overlay2DOptions = {}> =
  ItemHandleFromDefinition<typeof overlay2dDefinition, Opts>;
