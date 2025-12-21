import type { Color } from "../common-types/colors";
import type { ItemTags } from "../common-types/tags";
import type { AtomLikeOptions, Field } from "../atom-wrapper";
import { BaseItem } from "../item";
import type { Scene3D } from "../scene3d";

export type Axes3DFields = {
  tags: ItemTags;
  // In the future, we'll probably make this `boolean | [number, number]` for range
  // "true" is infinite (default), "false" is disabled, and array gives us a range
  x: boolean | [number, number];
  y: boolean | [number, number];
  z: boolean | [number, number];
  color: Color;
  thickness: number;
};
export type Axes3DOptions = AtomLikeOptions<Axes3DFields>;

function mergeDefaults<Opts extends Axes3DOptions>(options: Opts) {
  return {
    tags: options.tags ?? [],
    x: options.x ?? true,
    y: options.y ?? true,
    z: options.z ?? true,
    color: options.color ?? "white",
    thickness: options.thickness ?? 1,
  };
}

export class Axes3D<Opts extends Axes3DOptions = {}> extends BaseItem<
  Axes3DFields,
  "axes3d"
> {
  kind = "axes3d" as const;

  tags: Field<ItemTags, "tags", Opts>;
  x: Field<boolean | [number, number], "x", Opts>;
  y: Field<boolean | [number, number], "y", Opts>;
  z: Field<boolean | [number, number], "z", Opts>;
  color: Field<Color, "color", Opts>;
  thickness: Field<number, "thickness", Opts>;

  constructor(scene: Scene3D, options: Opts & Axes3DOptions = {} as any) {
    super();
    const opts = mergeDefaults(options);

    // Atomize all the options and add the atom fields
    this.tags = scene.atomize(opts.tags) as any;
    this.x = scene.atomize(opts.x) as any;
    this.y = scene.atomize(opts.y) as any;
    this.z = scene.atomize(opts.z) as any;
    this.color = scene.atomize(opts.color) as any;
    this.thickness = scene.atomize(opts.thickness) as any;
    this.addAtomFields(
      this.tags,
      this.x,
      this.y,
      this.z,
      this.color,
      this.thickness
    );
  }

  getItemSnapshot() {
    return {
      id: this.id,
      kind: this.kind,
      isDirty: this.isDirty,
      tags: this.tags.get(),
      x: this.x.get(),
      y: this.y.get(),
      z: this.z.get(),
      color: this.color.get(),
      thickness: this.thickness.get(),
    };
  }
}
