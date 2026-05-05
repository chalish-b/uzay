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

export type Point2DFields = {
  tags: ItemTags;
  coords: Vec2;
  draggable: PointDraggableDir2D;
  color: Color;
  radius: number;
  visible: boolean;
  pointerEvents: PointerEvents;
};
export type Point2DOptions = AtomLikeOptions<Point2DFields>;

type Point2DState = {
  warnedReadOnly: boolean;
  dragOffset: Vec2;
};

export const point2dDefinition = defineItem2D({
  kind: "point2d",
  fields: {
    tags: field<ItemTags>(() => []),
    coords: field<Vec2>(() => vec2(0, 0)),
    draggable: field<PointDraggableDir2D>("xy"),
    color: field<Color>("white"),
    // Radius in CSS pixels. Stays visually constant across zoom levels.
    radius: field(6),
    visible: field(true),
    pointerEvents: field<PointerEvents>("auto"),
  },
  state: (): Point2DState => ({
    warnedReadOnly: false,
    dragOffset: vec2(0, 0),
  }),
  getCursorState({ item }) {
    const draggable = item.draggable.get();
    if (draggable === "none") return null;
    if (!isWritableBoundAtom(item.coords)) return null;
    return "grab";
  },
  // Dragging only affects writable coordinate atoms. Derived coords can still
  // drive the point visually, but they should not pretend to be draggable.
  handleDrag({ item, state }, event: DragEvent<"point2d">) {
    const draggable = item.draggable.get();
    if (draggable === "none") return;

    if (!isWritableBoundAtom(item.coords)) {
      if (!state.warnedReadOnly) {
        state.warnedReadOnly = true;
        console.warn(
          `[Point2D] Item "${item.id}" has read-only coords atom, but draggable is "${draggable}". ` +
            `Dragging is disabled. Set draggable: "none", or make the coords atom writable.`
        );
      }
      return;
    }

    if (event.phase === "start") {
      state.dragOffset = Vec2Utils.subtract(
        event.worldPosition,
        item.coords.get()
      );
      return;
    }

    const adjusted = Vec2Utils.subtract(event.worldPosition, state.dragOffset);
    const nextCoords = applyDragConstraint(
      item.coords.get(),
      adjusted,
      draggable
    );
    setBoundAtomIfWritable(item.coords, nextCoords);
  },
});

export type Point2D<Opts extends Point2DOptions = {}> =
  ItemHandleFromDefinition<typeof point2dDefinition, Opts>;
