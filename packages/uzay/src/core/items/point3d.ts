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
import type { ClickEvent, DragEvent } from "../common-types/interaction-events";

export type PointerEvents = "auto" | "none";

export type Point3DFields = {
  tags: ItemTags;
  coords: Vec3;
  draggable: PointDraggableDir;
  color: Color;
  radius: number;
  visible: boolean;
  pointerEvents: PointerEvents;
};
export type Point3DOptions = AtomLikeOptions<Point3DFields>;

function mergeDefaults<Opts extends Point3DOptions>(options: Opts) {
  return {
    tags: options.tags ?? [],
    coords: options.coords ?? vec3(0, 0, 0),
    draggable: options.draggable ?? "xyz",
    color: options.color ?? "white",
    radius: options.radius ?? 2,
    visible: options.visible ?? true,
    pointerEvents: options.pointerEvents ?? "auto",
  };
}

export class Point3D<Opts extends Point3DOptions = {}> extends BaseItem<
  Point3DFields,
  "point3d"
> {
  kind = "point3d" as const;

  warnedReadOnly = false;
  private _dragOffset: Vec3 = vec3(0, 0, 0);

  // All fields that can be changed are atoms
  tags: Field<ItemTags, "tags", Opts>;
  coords: Field<Vec3, "coords", Opts>;
  draggable: Field<PointDraggableDir, "draggable", Opts>;
  color: Field<Color, "color", Opts>;
  radius: Field<number, "radius", Opts>;
  visible: Field<boolean, "visible", Opts>;
  pointerEvents: Field<PointerEvents, "pointerEvents", Opts>;

  constructor(scene: Scene3D, options: Opts & Point3DOptions = {} as any) {
    super();
    const opts = mergeDefaults(options);

    // Atomize all the options and add the atom fields
    this.tags = scene.atomize(opts.tags) as any;
    this.coords = scene.atomize(opts.coords) as any;
    this.draggable = scene.atomize(opts.draggable) as any;
    this.color = scene.atomize(opts.color) as any;
    this.radius = scene.atomize(opts.radius) as any;
    this.visible = scene.atomize(opts.visible) as any;
    this.pointerEvents = scene.atomize(opts.pointerEvents) as any;
    this.addAtomFields(
      this.tags,
      this.coords,
      this.draggable,
      this.color,
      this.radius,
      this.visible,
      this.pointerEvents
    );
  }

  getItemSnapshot() {
    return {
      id: this.id,
      kind: this.kind,
      isDirty: this.isDirty,
      coords: this.coords.get(),
      tags: this.tags.get(),
      draggable: this.draggable.get(),
      color: this.color.get(),
      radius: this.radius.get(),
      visible: this.visible.get(),
      pointerEvents: this.pointerEvents.get(),
    };
  }

  getCursorState() {
    const draggable = this.draggable.get();
    if (draggable === "none") return null;
    // Only show grab cursor if coords is writable
    if (!isWritableBoundAtom(this.coords)) return null;
    return "grab";
  }

  handleDrag(event: DragEvent<"point3d">) {
    const draggable = this.draggable.get();
    if (draggable === "none") return;

    // If coords is read-only, dragging cannot write updates back.
    if (!isWritableBoundAtom(this.coords)) {
      if (!this.warnedReadOnly) {
        this.warnedReadOnly = true;
        console.warn(
          `[Point3D] Item "${this.id}" has read-only coords atom, but draggable is "${draggable}". ` +
            `Dragging is disabled. Set draggable: "none", or make the coords atom writable.`
        );
      }
      return;
    }

    if (event.phase === "start") {
      this._dragOffset = Vec3Utils.subtract(event.worldPosition, this.coords.get());
      return;
    }

    const adjusted = Vec3Utils.subtract(event.worldPosition, this._dragOffset);
    const newCoords = applyDragConstraint(
      this.coords.get(),
      adjusted,
      draggable
    );
    setBoundAtomIfWritable(this.coords, newCoords);
  }
}
