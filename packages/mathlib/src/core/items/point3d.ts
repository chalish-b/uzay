import type { PointDraggableDir } from "../common-types/axes";
import type { Color } from "../common-types/colors";
import type { ItemTags } from "../common-types/tags";
import { type Vec3, vec3 } from "../common-types/vec3";
import { BaseItem } from "../item";
import type { AtomLikeOptions, AtomizeResult, Field } from "../atom-wrapper";
import type { Scene3D } from "../scene3d";
import type { ClickEvent, DragEvent } from "../common-types/interaction-events";

// Helper: apply axis constraint to target position
function applyDragConstraint(
  current: Vec3,
  target: Vec3,
  constraint: PointDraggableDir
): Vec3 {
  switch (constraint) {
    case "x":
      return { ...current, x: target.x };
    case "y":
      return { ...current, y: target.y };
    case "z":
      return { ...current, z: target.z };
    case "xy":
      return { ...current, x: target.x, y: target.y };
    case "xz":
      return { ...current, x: target.x, z: target.z };
    case "yz":
      return { ...current, y: target.y, z: target.z };
    case "xyz":
      return target;
    case "none":
    default:
      return current;
  }
}

export type Point3DFields = {
  tags: ItemTags;
  coords: Vec3;
  draggable: PointDraggableDir;
  color: Color;
  radius: number;
};
export type Point3DOptions = AtomLikeOptions<Point3DFields>;

function mergeDefaults<Opts extends Point3DOptions>(options: Opts) {
  return {
    tags: options.tags ?? [],
    coords: options.coords ?? vec3(0, 0, 0),
    draggable: options.draggable ?? "xyz",
    color: options.color ?? "white",
    radius: options.radius ?? 2,
  };
}

export class Point3D<Opts extends Point3DOptions = {}> extends BaseItem<
  Point3DFields,
  "point3d"
> {
  kind = "point3d" as const;

  // Track if we've warned about read-only coords
  warnedReadOnly = false;

  // All fields that can be changed are atoms
  tags: Field<ItemTags, "tags", Opts>;
  coords: Field<Vec3, "coords", Opts>;
  draggable: Field<PointDraggableDir, "draggable", Opts>;
  color: Field<Color, "color", Opts>;
  radius: Field<number, "radius", Opts>;

  constructor(scene: Scene3D, options: Opts & Point3DOptions = {} as any) {
    super();
    const opts = mergeDefaults(options);

    // Atomize all the options and add the atom fields
    this.tags = scene.atomize(opts.tags) as any;
    this.coords = scene.atomize(opts.coords) as any;
    this.draggable = scene.atomize(opts.draggable) as any;
    this.color = scene.atomize(opts.color) as any;
    this.radius = scene.atomize(opts.radius) as any;
    this.addAtomFields(
      this.tags,
      this.coords,
      this.draggable,
      this.color,
      this.radius
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
    };
  }

  getCursorState() {
    const draggable = this.draggable.get();
    if (draggable === "none") return null;
    // Only show grab cursor if coords is writable
    if (typeof (this.coords as any).write !== "function") return null;
    return "grab";
  }

  handleClick(event: ClickEvent<"point3d">) {
    // Just for testing the click behavior works as intended
    console.log("Point3D handleClick", event);
  }

  handleDrag(event: DragEvent<"point3d">) {
    const draggable = this.draggable.get();
    if (draggable === "none") return;

    // Check if coords atom is writable
    if (typeof (this.coords as any).write !== "function") {
      if (!this.warnedReadOnly) {
        this.warnedReadOnly = true;
        console.warn(
          `[Point3D] Item "${this.id}" has read-only coords atom, but draggable is "${draggable}". ` +
            `Dragging is disabled. Set draggable: "none", or make the coords atom writable.`
        );
      }
      return;
    }

    // Apply constraint based on draggable axis
    const newCoords = applyDragConstraint(
      this.coords.get(),
      event.worldPosition,
      draggable
    );
    // We already checked the atom is writable above, so this assertion is safe
    (this.coords as { set: (v: Vec3) => void }).set(newCoords);
  }
}
