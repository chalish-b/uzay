import type { Color } from "../common-types/colors";
import type { ItemTags } from "../common-types/tags";
import { type Vec3, vec3 } from "../common-types/vec3";
import { BaseItem } from "../item";
import type { AtomLikeOptions, Field } from "../atom-wrapper";
import type { Scene3D } from "../scene3d";

export type PointerEvents = "auto" | "none";

export type Plane3DFields = {
  tags: ItemTags;
  point: Vec3;
  normal: Vec3;
  width: number;
  height: number;
  color: Color;
  opacity: number;
  showEdges: boolean;
  pointerEvents: PointerEvents;
};
export type Plane3DOptions = AtomLikeOptions<Plane3DFields>;

function mergeDefaults<Opts extends Plane3DOptions>(options: Opts) {
  return {
    tags: options.tags ?? [],
    point: options.point ?? vec3(0, 0, 0),
    normal: options.normal ?? vec3(0, 1, 0),
    width: options.width ?? 2,
    height: options.height ?? 2,
    color: options.color ?? "white",
    opacity: options.opacity ?? 0.5,
    showEdges: options.showEdges ?? true,
    pointerEvents: options.pointerEvents ?? "auto",
  };
}

export class Plane3D<Opts extends Plane3DOptions = {}> extends BaseItem<
  Plane3DFields,
  "plane3d"
> {
  kind = "plane3d" as const;

  tags: Field<ItemTags, "tags", Opts>;
  point: Field<Vec3, "point", Opts>;
  normal: Field<Vec3, "normal", Opts>;
  width: Field<number, "width", Opts>;
  height: Field<number, "height", Opts>;
  color: Field<Color, "color", Opts>;
  opacity: Field<number, "opacity", Opts>;
  showEdges: Field<boolean, "showEdges", Opts>;
  pointerEvents: Field<PointerEvents, "pointerEvents", Opts>;

  constructor(scene: Scene3D, options: Opts & Plane3DOptions = {} as any) {
    super();
    const opts = mergeDefaults(options);

    this.tags = scene.atomize(opts.tags) as any;
    this.point = scene.atomize(opts.point) as any;
    this.normal = scene.atomize(opts.normal) as any;
    this.width = scene.atomize(opts.width) as any;
    this.height = scene.atomize(opts.height) as any;
    this.color = scene.atomize(opts.color) as any;
    this.opacity = scene.atomize(opts.opacity) as any;
    this.showEdges = scene.atomize(opts.showEdges) as any;
    this.pointerEvents = scene.atomize(opts.pointerEvents) as any;
    this.addAtomFields(
      this.tags,
      this.point,
      this.normal,
      this.width,
      this.height,
      this.color,
      this.opacity,
      this.showEdges,
      this.pointerEvents
    );
  }

  getItemSnapshot() {
    return {
      id: this.id,
      kind: this.kind,
      isDirty: this.isDirty,
      tags: this.tags.get(),
      point: this.point.get(),
      normal: this.normal.get(),
      width: this.width.get(),
      height: this.height.get(),
      color: this.color.get(),
      opacity: this.opacity.get(),
      showEdges: this.showEdges.get(),
      pointerEvents: this.pointerEvents.get(),
    };
  }
}
