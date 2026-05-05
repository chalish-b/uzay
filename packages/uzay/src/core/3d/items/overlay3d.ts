import type { ItemTags } from "../../shared/types/tags";

import { type Vec3, vec3 } from "../../shared/types/vec3";
import { type Vec2, vec2 } from "../../shared/types/vec2";
import type { OverlayAnchor, OverlayFormat } from "../../shared/types/overlay";
import type { PointerEvents } from "./point3d";
import type { AtomLikeOptions } from "../../shared/atom-wrapper";
import {
  field,
  type ItemHandleFromDefinition,
} from "../../shared/item-definition";
import { defineItem3D } from "../types/define-item";

export type Overlay3DFields = {
  tags: ItemTags;
  position: Vec3;
  content: string;
  format: OverlayFormat;
  offset: Vec2;
  anchor: OverlayAnchor;
  visible: boolean;
  className: string;
  style: string;
  pointerEvents: PointerEvents;
};
export type Overlay3DOptions = AtomLikeOptions<Overlay3DFields>;

export const overlay3dDefinition = defineItem3D({
  kind: "overlay3d",
  fields: {
    tags: field<ItemTags>(() => []),
    position: field<Vec3>(() => vec3(0, 0, 0)),
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

export type Overlay3D<Opts extends Overlay3DOptions = {}> =
  ItemHandleFromDefinition<typeof overlay3dDefinition, Opts>;
