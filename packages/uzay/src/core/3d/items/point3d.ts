import type { PointDraggableDir } from "../types/axes";
import type { Color } from "../../shared/types/colors";
import type { ItemTags } from "../../shared/types/tags";
import { type Vec3, vec3 } from "../../shared/types/vec3";
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
import { defineItem3D } from "../types/define-item";

export type PointerEvents = "auto" | "none";

export type Point3DFields = {
  tags: ItemTags;
  coords: Vec3;
  draggable: PointDraggableDir;
  color: Color;
  radius: number;
  opacity: number;
  visible: boolean;
  pointerEvents: PointerEvents;
};
export type Point3DOptions = AtomLikeOptions<Point3DFields>;

type Point3DState = {
  warnedReadOnly: boolean;
  dragOffset: Vec3;
};

export const point3dDefinition = defineItem3D({
  kind: "point3d",
  fields: {
    tags: field<ItemTags>(() => []),
    coords: field<Vec3>(() => vec3(0, 0, 0)),
    draggable: field<PointDraggableDir>("xyz"),
    color: field<Color>("white"),
    radius: field(2),
    opacity: field(1),
    visible: field(true),
    pointerEvents: field<PointerEvents>("auto"),
  },
  state: (): Point3DState => ({
    warnedReadOnly: false,
    dragOffset: vec3(0, 0, 0),
  }),
  // Show a grab cursor only when the point can actually write drag updates.
  // "custom" mode always shows the cursor since the user handles drag logic.
  getCursorState({ item }) {
    const draggable = item.draggable.get();
    if (draggable === "none") return null;
    if (draggable === "custom") return "grab";
    if (!isWritableBoundAtom(item.coords)) return null;
    return "grab";
  },
  // Dragging only affects writable coordinate atoms. Derived coords can still
  // drive the point visually, but they should not pretend to be draggable.
  // "custom" mode is a no-op: the user must provide their own handler via .on("drag").
  handleDrag({ item, state }, event: DragEvent<"point3d">) {
    const draggable = item.draggable.get();
    if (draggable === "none" || draggable === "custom") return;

    if (!isWritableBoundAtom(item.coords)) {
      if (!state.warnedReadOnly) {
        state.warnedReadOnly = true;
        console.warn(
          `[Point3D] Item "${item.id}" has read-only coords atom, but draggable is "${draggable}". ` +
            `Dragging is disabled. Set draggable: "none", or make the coords atom writable.`
        );
      }
      return;
    }

    if (event.phase === "start") {
      state.dragOffset = event.worldPosition.sub(item.coords.get());
      return;
    }

    const adjusted = event.worldPosition.sub(state.dragOffset);
    const nextCoords = applyDragConstraint(
      item.coords.get(),
      adjusted,
      draggable
    );
    setBoundAtomIfWritable(item.coords, nextCoords);
  },
});

export type Point3D<Opts extends Point3DOptions = {}> =
  ItemHandleFromDefinition<typeof point3dDefinition, Opts>;
