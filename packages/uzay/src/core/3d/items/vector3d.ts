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

export type Vector3DFields = {
  tags: ItemTags;
  origin: Vec3;
  vector: Vec3;
  draggable: PointDraggableDir;
  color: Color;
  thickness: number;
  opacity: number;
  headLength: number;
  headWidth: number;
  visible: boolean;
  pointerEvents: PointerEvents;
};
export type Vector3DOptions = AtomLikeOptions<Vector3DFields>;

type Vector3DState = {
  warnedReadOnly: boolean;
  dragOffset: Vec3;
};

export const vector3dDefinition = defineItem3D({
  kind: "vector3d",
  fields: {
    tags: field<ItemTags>(() => []),
    origin: field<Vec3>(() => vec3(0, 0, 0)),
    vector: field<Vec3>(() => vec3(1, 0, 0)),
    draggable: field<PointDraggableDir>("xyz"),
    color: field<Color>("white"),
    thickness: field(1),
    opacity: field(1),
    headLength: field(0.2),
    headWidth: field(0.1),
    visible: field(true),
    pointerEvents: field<PointerEvents>("auto"),
  },
  state: (): Vector3DState => ({
    warnedReadOnly: false,
    dragOffset: vec3(0, 0, 0),
  }),
  // Dragging edits the vector tip, so a read-only direction atom should not
  // advertise interactivity even if the vector is still rendered reactively.
  // "custom" mode always shows the cursor since the user handles drag logic.
  getCursorState({ item }) {
    const draggable = item.draggable.get();
    if (draggable === "none") return null;
    if (draggable === "custom") return "grab";
    if (!isWritableBoundAtom(item.vector)) return null;
    return "grab";
  },
  handleDrag({ item, state }, event: DragEvent<"vector3d">) {
    const draggable = item.draggable.get();
    if (draggable === "none" || draggable === "custom") return;

    if (!isWritableBoundAtom(item.vector)) {
      if (!state.warnedReadOnly) {
        state.warnedReadOnly = true;
        console.warn(
          `[Vector3D] Item "${item.id}" has read-only vector atom, but draggable is "${draggable}". ` +
            `Dragging is disabled. Set draggable: "none", or make the vector atom writable.`
        );
      }
      return;
    }

    const origin = item.origin.get();
    const currentVector = item.vector.get();
    const tipPos = origin.add(currentVector);

    if (event.phase === "start") {
      state.dragOffset = event.worldPosition.sub(tipPos);
      return;
    }

    const adjusted = event.worldPosition.sub(state.dragOffset);
    const constrained = applyDragConstraint(tipPos, adjusted, draggable);
    const nextVector = constrained.sub(origin);
    setBoundAtomIfWritable(item.vector, nextVector);
  },
});

export type Vector3D<Opts extends Vector3DOptions = {}> =
  ItemHandleFromDefinition<typeof vector3dDefinition, Opts>;
