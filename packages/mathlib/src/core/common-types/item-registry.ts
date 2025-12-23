import {
  type Point3DFields,
  type Point3DOptions,
  Point3D,
} from "../items/point3d";
import { type Line3DFields, type Line3DOptions, Line3D } from "../items/line3d";
import {
  type Camera3DFields,
  type Camera3DOptions,
  Camera3D,
} from "../items/camera3d";
import {
  type ParametricFunction3DFields,
  type ParametricFunction3DOptions,
  ParametricFunction3D,
} from "../items/parametric-function3d";
import { type Axes3DFields, type Axes3DOptions, Axes3D } from "../items/axes3d";
import { type Grid3DFields, type Grid3DOptions, Grid3D } from "../items/grid3d";
import type { Scene3D } from "../scene3d";
import type { AtomLikeOptions } from "../atom-wrapper";

export type ItemId = string;
export type ItemKind =
  | "point3d"
  | "line3d"
  | "camera3d"
  | "parametricfunction3d"
  | "axes3d"
  | "grid3d";

export type ItemFieldsMap = {
  point3d: Point3DFields;
  line3d: Line3DFields;
  camera3d: Camera3DFields;
  parametricfunction3d: ParametricFunction3DFields;
  axes3d: Axes3DFields;
  grid3d: Grid3DFields;
};

export type ItemFields<K extends ItemKind> = ItemFieldsMap[K];
export type ItemOptions<K extends ItemKind> = AtomLikeOptions<ItemFieldsMap[K]>;

export type ItemSnapshot<K extends ItemKind = ItemKind> = K extends ItemKind
  ? {
      id: ItemId;
      kind: K;
      isDirty: boolean;
    } & ItemFields<K>
  : never;

export const itemFactory = {
  point3d: <Opts extends Point3DOptions>(scene: Scene3D, options: Opts) =>
    new Point3D(scene, options),
  line3d: <Opts extends Line3DOptions>(scene: Scene3D, options: Opts) =>
    new Line3D(scene, options),
  camera3d: <Opts extends Camera3DOptions>(scene: Scene3D, options: Opts) =>
    new Camera3D(scene, options),
  parametricfunction3d: <Opts extends ParametricFunction3DOptions>(
    scene: Scene3D,
    options: Opts
  ) => new ParametricFunction3D(scene, options),
  axes3d: <Opts extends Axes3DOptions>(scene: Scene3D, options: Opts) =>
    new Axes3D(scene, options),
  grid3d: <Opts extends Grid3DOptions>(scene: Scene3D, options: Opts) =>
    new Grid3D(scene, options),
} as const;

export type ItemFactory<K extends ItemKind> = (typeof itemFactory)[K];

export type ItemInstance<
  K extends ItemKind,
  Opts extends ItemOptions<K>
> = K extends "point3d"
  ? Point3D<Opts>
  : K extends "line3d"
  ? Line3D<Opts>
  : K extends "camera3d"
  ? Camera3D<Opts>
  : K extends "parametricfunction3d"
  ? ParametricFunction3D<Opts>
  : K extends "axes3d"
  ? Axes3D<Opts>
  : K extends "grid3d"
  ? Grid3D<Opts>
  : never;

export type ItemInstanceOf<K extends ItemKind = ItemKind> = K extends ItemKind
  ? ItemInstance<K, ItemOptions<K>>
  : never;

// Union of all concrete item classes, preserving their discriminating "kind"
export type Item = ItemInstanceOf<ItemKind>;
