import type { PointDraggableDir } from "../common-types/axes";
import type { Color } from "../common-types/colors";
import type { ItemTags } from "../common-types/tags";
import { type Vec3, Vec3 as Vec3Utils, vec3 } from "../common-types/vec3";
import { applyDragConstraint } from "../common-types/drag-utils";
import {
  isWritableBoundAtom,
  setBoundAtomIfWritable,
  type AtomLikeOptions,
} from "../atom-wrapper";
import type { DragEvent } from "../common-types/interaction-events";
import {
  defineItem,
  field,
  type ItemHandleFromDefinition,
} from "../item-definition";

export type PointerEvents = "auto" | "none";

export type Vector3DFields = {
  tags: ItemTags;
  origin: Vec3;
  vector: Vec3;
  draggable: PointDraggableDir;
  color: Color;
  thickness: number;
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

export const vector3dDefinition = defineItem({
  kind: "vector3d",
  fields: {
    tags: field<ItemTags>(() => []),
    origin: field<Vec3>(() => vec3(0, 0, 0)),
    vector: field<Vec3>(() => vec3(1, 0, 0)),
    draggable: field<PointDraggableDir>("xyz"),
    color: field<Color>("white"),
    thickness: field(1),
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
    const tipPos = Vec3Utils.add(origin, currentVector);

    if (event.phase === "start") {
      state.dragOffset = Vec3Utils.subtract(event.worldPosition, tipPos);
      return;
    }

    const adjusted = Vec3Utils.subtract(event.worldPosition, state.dragOffset);
    const constrained = applyDragConstraint(tipPos, adjusted, draggable);
    const nextVector = Vec3Utils.subtract(constrained, origin);
    setBoundAtomIfWritable(item.vector, nextVector);
  },
});

export type Vector3D<Opts extends Vector3DOptions = {}> =
  ItemHandleFromDefinition<typeof vector3dDefinition, Opts>;
