import type { BaseItem } from "../item";
import { type Point3DOptions, Point3D } from "../items/point3d";
import type { Scene3D } from "../scene3d";

export type ItemKind = "point3d";

export type ItemOptionsMap = {
  point3d: Point3DOptions;
};

export type ItemOptions<K extends ItemKind> = ItemOptionsMap[K];

export const itemFactory = {
  point3d: <Opts extends Point3DOptions>(scene: Scene3D, options: Opts) =>
    new Point3D(scene, options),
} as const;

export type ItemFactory<K extends ItemKind> = (typeof itemFactory)[K];

// export type ItemInstance<K extends ItemKind, Opts> =
//   K extends "point3d"
//   ? (Opts extends Point3DOptions ? Point3D<Opts> : never)
//   : never;
export type ItemInstance<
  K extends ItemKind,
  Opts extends ItemOptions<K>
> = K extends "point3d" ? Point3D<Opts> : never;

export type Item = BaseItem<any, any>;
