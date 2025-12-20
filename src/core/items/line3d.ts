import type { ItemTags } from "../common-types/tags";
import type { Vec3 } from "../common-types/vec3";
import type { Color } from "../common-types/colors";
import type { AtomLikeOptions, Field } from "../atom-wrapper";
import { vec3 } from "three/src/Three.TSL.js";
import { BaseItem } from "../item";
import type { Scene3D } from "../scene3d";

export type Line3DFields = {
  tags: ItemTags;
  start: Vec3;
  end: Vec3;
  color: Color;
  thickness: number;
};
export type Line3DOptions = AtomLikeOptions<Line3DFields>;

function mergeDefaults<Opts extends Line3DOptions>(options: Opts) {
  return {
    tags: options.tags ?? [],
    start: options.start ?? vec3(0, 0, 0),
    end: options.end ?? vec3(0, 0, 0),
    color: options.color ?? "white",
    thickness: options.thickness ?? 1,
  };
}

export class Line3D<Opts extends Line3DOptions = {}> extends BaseItem<
  Line3DFields,
  "line3d"
> {
  kind = "line3d" as const;

  tags: Field<ItemTags, "tags", Opts>;
  start: Field<Vec3, "start", Opts>;
  end: Field<Vec3, "end", Opts>;
  color: Field<Color, "color", Opts>;
  thickness: Field<number, "thickness", Opts>;

  constructor(scene: Scene3D, options: Opts & Line3DOptions = {} as any) {
    super();
    const opts = mergeDefaults(options);

    // Atomize all the options and add the atom fields
    this.tags = scene.atomize(opts.tags) as any;
    this.start = scene.atomize(opts.start) as any;
    this.end = scene.atomize(opts.end) as any;
    this.color = scene.atomize(opts.color) as any;
    this.thickness = scene.atomize(opts.thickness) as any;
    this.addAtomFields(
      this.tags,
      this.start,
      this.end,
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
      start: this.start.get(),
      end: this.end.get(),
      color: this.color.get(),
      thickness: this.thickness.get(),
    };
  }
}
