import {
  point3dDefinition,
} from "../items/point3d";
import {
  camera3dDefinition,
} from "../items/camera3d";
import {
  parametricFunction3dDefinition,
} from "../items/parametric-function3d";
import {
  axes3dDefinition,
} from "../items/axes3d";
import {
  grid3dDefinition,
} from "../items/grid3d";
import {
  sphere3dDefinition,
} from "../items/sphere3d";
import {
  vector3dDefinition,
} from "../items/vector3d";
import {
  overlay3dDefinition,
} from "../items/overlay3d";
import {
  plane3dDefinition,
} from "../items/plane3d";
import {
  line3dDefinition,
} from "../items/line3d";
import type { AtomLikeOptions } from "../atom-wrapper";
import type {
  DefinitionFields,
  ItemHandleFromDefinition,
} from "../item-definition";

export type ItemId = string;
export const itemDefinitions = {
  point3d: point3dDefinition,
  line3d: line3dDefinition,
  camera3d: camera3dDefinition,
  parametricfunction3d: parametricFunction3dDefinition,
  axes3d: axes3dDefinition,
  grid3d: grid3dDefinition,
  sphere3d: sphere3dDefinition,
  vector3d: vector3dDefinition,
  overlay3d: overlay3dDefinition,
  plane3d: plane3dDefinition,
} as const;

export type ItemKind = keyof typeof itemDefinitions;

export type ItemFieldsMap = {
  [K in ItemKind]: DefinitionFields<(typeof itemDefinitions)[K]>;
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

export type ItemInstance<
  K extends ItemKind,
  Opts extends ItemOptions<K>
> = ItemHandleFromDefinition<(typeof itemDefinitions)[K], Opts>;

export type ItemInstanceOf<K extends ItemKind = ItemKind> = K extends ItemKind
  ? ItemInstance<K, ItemOptions<K>>
  : never;

// Union of all concrete item classes, preserving their discriminating "kind"
export type Item = ItemInstanceOf<ItemKind>;
