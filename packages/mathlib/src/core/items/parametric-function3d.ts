import { vec3 } from "three/src/Three.TSL.js";
import type { AtomLikeOptions, Field } from "../atom-wrapper";
import type { Color } from "../common-types/colors";
import type { ItemTags } from "../common-types/tags";
import type { Vec3 } from "../common-types/vec3";
import { BaseItem } from "../item";
import type { Scene3D } from "../scene3d";

type ParametricFunction3DFunc = (t: number) => Vec3;

export type PointerEvents = "auto" | "none";

export type ParametricFunction3DFields = {
  tags: ItemTags;
  f: ParametricFunction3DFunc;
  tStart: number;
  tEnd: number;
  color: Color;
  thickness: number;
  samples: number;
  pointerEvents: PointerEvents;
};
export type ParametricFunction3DOptions =
  AtomLikeOptions<ParametricFunction3DFields>;

function mergeDefaults<Opts extends ParametricFunction3DOptions>(
  options: Opts
) {
  return {
    tags: options.tags ?? [],
    f: options.f ?? ((t: number) => vec3(t, t, t)),
    tStart: options.tStart ?? 0,
    tEnd: options.tEnd ?? 1,
    color: options.color ?? "white",
    thickness: options.thickness ?? 1,
    samples: options.samples ?? 64,
    pointerEvents: options.pointerEvents ?? "auto",
  };
}

export class ParametricFunction3D<
  Opts extends ParametricFunction3DOptions = {}
> extends BaseItem<ParametricFunction3DFields, "parametricfunction3d"> {
  kind = "parametricfunction3d" as const;

  tags: Field<ItemTags, "tags", Opts>;
  f: Field<ParametricFunction3DFunc, "f", Opts>;
  tStart: Field<number, "tStart", Opts>;
  tEnd: Field<number, "tEnd", Opts>;
  color: Field<Color, "color", Opts>;
  thickness: Field<number, "thickness", Opts>;
  samples: Field<number, "samples", Opts>;
  pointerEvents: Field<PointerEvents, "pointerEvents", Opts>;

  constructor(
    scene: Scene3D,
    options: Opts & ParametricFunction3DOptions = {} as any
  ) {
    super();
    const opts = mergeDefaults(options);

    // Atomize all the options and add the atom fields
    this.tags = scene.atomize(opts.tags) as any;
    this.f = scene.atomize(opts.f) as any;
    this.tStart = scene.atomize(opts.tStart) as any;
    this.tEnd = scene.atomize(opts.tEnd) as any;
    this.color = scene.atomize(opts.color) as any;
    this.thickness = scene.atomize(opts.thickness) as any;
    this.samples = scene.atomize(opts.samples) as any;
    this.pointerEvents = scene.atomize(opts.pointerEvents) as any;
    this.addAtomFields(
      this.tags,
      this.f,
      this.tStart,
      this.tEnd,
      this.color,
      this.thickness,
      this.samples,
      this.pointerEvents
    );
  }

  getItemSnapshot() {
    return {
      id: this.id,
      kind: this.kind,
      isDirty: this.isDirty,
      tags: this.tags.get(),
      f: this.f.get(),
      tStart: this.tStart.get(),
      tEnd: this.tEnd.get(),
      color: this.color.get(),
      thickness: this.thickness.get(),
      samples: this.samples.get(),
      pointerEvents: this.pointerEvents.get(),
    };
  }
}
