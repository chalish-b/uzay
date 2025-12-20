import type { PointDraggableDir } from "../common-types/axes";
import type { Color } from "../common-types/colors";
import type { ItemTags } from "../common-types/tags";
import { type Vec3, vec3 } from "../common-types/vec3";
import { BaseItem } from "../item";
import type { AtomLikeOptions, AtomizeResult, Field } from "../atom-wrapper";
import type { Scene3D } from "../scene3d";

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
    radius: options.radius ?? 0.1,
  };
}

export class Point3D<Opts extends Point3DOptions = {}> extends BaseItem<
  Point3DFields,
  "point3d"
> {
  kind = "point3d" as const;

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
}
