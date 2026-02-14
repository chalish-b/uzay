import type { PointDraggableDir } from "../common-types/axes";
import type { Color } from "../common-types/colors";
import type { ItemTags } from "../common-types/tags";
import { type Vec3, Vec3 as Vec3Utils, vec3 } from "../common-types/vec3";
import { applyDragConstraint } from "../common-types/drag-utils";
import { BaseItem } from "../item";
import {
  isWritableBoundAtom,
  setBoundAtomIfWritable,
  type AtomLikeOptions,
  type Field,
} from "../atom-wrapper";
import type { Scene3D } from "../scene3d";
import type { DragEvent } from "../common-types/interaction-events";

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
  pointerEvents: PointerEvents;
};
export type Vector3DOptions = AtomLikeOptions<Vector3DFields>;

function mergeDefaults<Opts extends Vector3DOptions>(options: Opts) {
  return {
    tags: options.tags ?? [],
    origin: options.origin ?? vec3(0, 0, 0),
    vector: options.vector ?? vec3(1, 0, 0),
    draggable: options.draggable ?? "xyz",
    color: options.color ?? "white",
    thickness: options.thickness ?? 1,
    headLength: options.headLength ?? 0.2,
    headWidth: options.headWidth ?? 0.1,
    pointerEvents: options.pointerEvents ?? "auto",
  };
}

export class Vector3D<Opts extends Vector3DOptions = {}> extends BaseItem<
  Vector3DFields,
  "vector3d"
> {
  kind = "vector3d" as const;

  warnedReadOnly = false;
  private _dragOffset: Vec3 = vec3(0, 0, 0);

  tags: Field<ItemTags, "tags", Opts>;
  origin: Field<Vec3, "origin", Opts>;
  vector: Field<Vec3, "vector", Opts>;
  draggable: Field<PointDraggableDir, "draggable", Opts>;
  color: Field<Color, "color", Opts>;
  thickness: Field<number, "thickness", Opts>;
  headLength: Field<number, "headLength", Opts>;
  headWidth: Field<number, "headWidth", Opts>;
  pointerEvents: Field<PointerEvents, "pointerEvents", Opts>;

  constructor(scene: Scene3D, options: Opts & Vector3DOptions = {} as any) {
    super();
    const opts = mergeDefaults(options);

    this.tags = scene.atomize(opts.tags) as any;
    this.origin = scene.atomize(opts.origin) as any;
    this.vector = scene.atomize(opts.vector) as any;
    this.draggable = scene.atomize(opts.draggable) as any;
    this.color = scene.atomize(opts.color) as any;
    this.thickness = scene.atomize(opts.thickness) as any;
    this.headLength = scene.atomize(opts.headLength) as any;
    this.headWidth = scene.atomize(opts.headWidth) as any;
    this.pointerEvents = scene.atomize(opts.pointerEvents) as any;
    this.addAtomFields(
      this.tags,
      this.origin,
      this.vector,
      this.draggable,
      this.color,
      this.thickness,
      this.headLength,
      this.headWidth,
      this.pointerEvents
    );
  }

  getItemSnapshot() {
    return {
      id: this.id,
      kind: this.kind,
      isDirty: this.isDirty,
      tags: this.tags.get(),
      origin: this.origin.get(),
      vector: this.vector.get(),
      draggable: this.draggable.get(),
      color: this.color.get(),
      thickness: this.thickness.get(),
      headLength: this.headLength.get(),
      headWidth: this.headWidth.get(),
      pointerEvents: this.pointerEvents.get(),
    };
  }

  getCursorState() {
    const draggable = this.draggable.get();
    if (draggable === "none") return null;
    if (!isWritableBoundAtom(this.vector)) return null;
    return "grab";
  }

  handleDrag(event: DragEvent<"vector3d">) {
    const draggable = this.draggable.get();
    if (draggable === "none") return;

    if (!isWritableBoundAtom(this.vector)) {
      if (!this.warnedReadOnly) {
        this.warnedReadOnly = true;
        console.warn(
          `[Vector3D] Item "${this.id}" has read-only vector atom, but draggable is "${draggable}". ` +
            `Dragging is disabled. Set draggable: "none", or make the vector atom writable.`
        );
      }
      return;
    }

    const origin = this.origin.get();
    const currentVector = this.vector.get();
    const tipPos = Vec3Utils.add(origin, currentVector);

    if (event.phase === "start") {
      this._dragOffset = Vec3Utils.subtract(event.worldPosition, tipPos);
      return;
    }

    const adjusted = Vec3Utils.subtract(event.worldPosition, this._dragOffset);
    const constrained = applyDragConstraint(tipPos, adjusted, draggable);
    const newVector = Vec3Utils.subtract(constrained, origin);
    setBoundAtomIfWritable(this.vector, newVector);
  }
}
