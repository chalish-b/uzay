import type { AtomLikeOptions, Field } from "../atom-wrapper";
import type { Color } from "../common-types/colors";
import type { ItemTags } from "../common-types/tags";
import type { Scene3D } from "../scene3d";
import { BaseItem } from "../item";

type PlaneDir = "xy" | "xz" | "yz";
export type Grid3DFields = {
  tags: ItemTags;
  plane: PlaneDir;
  range1: boolean | [number, number];
  range2: boolean | [number, number];
  gap: number;
  color: Color;
  thickness: number;
};
export type Grid3DOptions = AtomLikeOptions<Grid3DFields>;

function mergeDefaults<Opts extends Grid3DOptions>(options: Opts) {
  return {
    tags: options.tags ?? [],
    plane: options.plane ?? "xz",
    range1: options.range1 ?? true,
    range2: options.range2 ?? true,
    gap: options.gap ?? 1,
    color: options.color ?? "white",
    thickness: options.thickness ?? 1,
  };
}

export class Grid3D<Opts extends Grid3DOptions = {}> extends BaseItem<
  Grid3DFields,
  "grid3d"
> {
  kind = "grid3d" as const;

  tags: Field<ItemTags, "tags", Opts>;
  plane: Field<PlaneDir, "plane", Opts>;
  range1: Field<boolean | [number, number], "range1", Opts>;
  range2: Field<boolean | [number, number], "range2", Opts>;
  gap: Field<number, "gap", Opts>;
  color: Field<Color, "color", Opts>;
  thickness: Field<number, "thickness", Opts>;

  constructor(scene: Scene3D, options: Opts & Grid3DOptions = {} as any) {
    super();
    const opts = mergeDefaults(options);

    // Atomize all the options and add the atom fields
    this.tags = scene.atomize(opts.tags) as any;
    this.plane = scene.atomize(opts.plane) as any;
    this.range1 = scene.atomize(opts.range1) as any;
    this.range2 = scene.atomize(opts.range2) as any;
    this.gap = scene.atomize(opts.gap) as any;
    this.color = scene.atomize(opts.color) as any;
    this.thickness = scene.atomize(opts.thickness) as any;
    this.addAtomFields(
      this.tags,
      this.plane,
      this.range1,
      this.range2,
      this.gap,
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
      plane: this.plane.get(),
      range1: this.range1.get(),
      range2: this.range2.get(),
      gap: this.gap.get(),
      color: this.color.get(),
      thickness: this.thickness.get(),
    };
  }
}
