import type { Color } from "../common-types/colors";
import type { ItemTags } from "../common-types/tags";
import { type Vec3, vec3 } from "../common-types/vec3";
import { BaseItem } from "../item";
import type { AtomLikeOptions, Field } from "../atom-wrapper";
import type { Scene3D } from "../scene3d";

export type Sphere3DFields = {
  tags: ItemTags;
  center: Vec3;
  radius: number;
  color: Color;
  opacity: number;
};
export type Sphere3DOptions = AtomLikeOptions<Sphere3DFields>;

function mergeDefaults<Opts extends Sphere3DOptions>(options: Opts) {
  return {
    tags: options.tags ?? [],
    center: options.center ?? vec3(0, 0, 0),
    radius: options.radius ?? 1,
    color: options.color ?? "white",
    opacity: options.opacity ?? 1,
  };
}

export class Sphere3D<Opts extends Sphere3DOptions = {}> extends BaseItem<
  Sphere3DFields,
  "sphere3d"
> {
  kind = "sphere3d" as const;

  tags: Field<ItemTags, "tags", Opts>;
  center: Field<Vec3, "center", Opts>;
  radius: Field<number, "radius", Opts>;
  color: Field<Color, "color", Opts>;
  opacity: Field<number, "opacity", Opts>;

  constructor(scene: Scene3D, options: Opts & Sphere3DOptions = {} as any) {
    super();
    const opts = mergeDefaults(options);

    this.tags = scene.atomize(opts.tags) as any;
    this.center = scene.atomize(opts.center) as any;
    this.radius = scene.atomize(opts.radius) as any;
    this.color = scene.atomize(opts.color) as any;
    this.opacity = scene.atomize(opts.opacity) as any;
    this.addAtomFields(
      this.tags,
      this.center,
      this.radius,
      this.color,
      this.opacity
    );
  }

  getItemSnapshot() {
    return {
      id: this.id,
      kind: this.kind,
      isDirty: this.isDirty,
      tags: this.tags.get(),
      center: this.center.get(),
      radius: this.radius.get(),
      color: this.color.get(),
      opacity: this.opacity.get(),
    };
  }
}
