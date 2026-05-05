import type { PointDraggableDir2D } from "../types/axes";
import type { Color } from "../../shared/types/colors";
import type { ItemTags } from "../../shared/types/tags";
import { type Vec2, Vec2 as Vec2Utils, vec2 } from "../../shared/types/vec2";
import { applyDragConstraint } from "../types/drag-utils";
import {
  isWritableBoundAtom,
  setBoundAtomIfWritable,
  type AtomLikeOptions,
} from "../../shared/atom-wrapper";
import type { DragEvent } from "../types/interaction-events";
import {
  field,
  type ItemHandleFromDefinition,
} from "../../shared/item-definition";
import { defineItem2D } from "../types/define-item";

export type PointerEvents = "auto" | "none";

export type Vector2DFields = {
  tags: ItemTags;
  origin: Vec2;
  vector: Vec2;
  draggable: PointDraggableDir2D;
  color: Color;
  thickness: number;
  headLength: number;
  headWidth: number;
  visible: boolean;
  pointerEvents: PointerEvents;
};
export type Vector2DOptions = AtomLikeOptions<Vector2DFields>;

type Vector2DState = {
  warnedReadOnly: boolean;
  dragOffset: Vec2;
};

export const vector2dDefinition = defineItem2D({
  kind: "vector2d",
  fields: {
    tags: field<ItemTags>(() => []),
    origin: field<Vec2>(() => vec2(0, 0)),
    vector: field<Vec2>(() => vec2(1, 0)),
    draggable: field<PointDraggableDir2D>("xy"),
    color: field<Color>("white"),
    thickness: field(1),
    // Head dimensions in CSS pixels; rendered constant size across zoom.
    headLength: field(14),
    headWidth: field(10),
    visible: field(true),
    pointerEvents: field<PointerEvents>("auto"),
  },
  state: (): Vector2DState => ({
    warnedReadOnly: false,
    dragOffset: vec2(0, 0),
  }),
  // The cursor only matters when the vector atom is actually writable. Read-only
  // atoms (e.g. derived ones) should not advertise interactivity.
  getCursorState({ item }) {
    const draggable = item.draggable.get();
    if (draggable === "none") return null;
    if (!isWritableBoundAtom(item.vector)) return null;
    return "grab";
  },
  handleDrag({ item, state }, event: DragEvent<"vector2d">) {
    const draggable = item.draggable.get();
    if (draggable === "none") return;

    if (!isWritableBoundAtom(item.vector)) {
      if (!state.warnedReadOnly) {
        state.warnedReadOnly = true;
        console.warn(
          `[Vector2D] Item "${item.id}" has read-only vector atom, but draggable is "${draggable}". ` +
            `Dragging is disabled. Set draggable: "none", or make the vector atom writable.`
        );
      }
      return;
    }

    const origin = item.origin.get();
    const currentVector = item.vector.get();
    const tipPos = Vec2Utils.add(origin, currentVector);

    if (event.phase === "start") {
      state.dragOffset = Vec2Utils.subtract(event.worldPosition, tipPos);
      return;
    }

    const adjusted = Vec2Utils.subtract(event.worldPosition, state.dragOffset);
    const constrained = applyDragConstraint(tipPos, adjusted, draggable);
    const nextVector = Vec2Utils.subtract(constrained, origin);
    setBoundAtomIfWritable(item.vector, nextVector);
  },
});

export type Vector2D<Opts extends Vector2DOptions = {}> =
  ItemHandleFromDefinition<typeof vector2dDefinition, Opts>;
