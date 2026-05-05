import { camera2dDefinition } from "../items/camera2d";
import { point2dDefinition } from "../items/point2d";
import { grid2dDefinition } from "../items/grid2d";
import { axes2dDefinition } from "../items/axes2d";
import { line2dDefinition } from "../items/line2d";
import { vector2dDefinition } from "../items/vector2d";
import type { AtomLikeOptions } from "../../shared/atom-wrapper";
import type {
  DefinitionFields,
  ItemHandleFromDefinition,
} from "../../shared/item-definition";
import type { ItemId } from "../../shared/types/ids";

export type { ItemId };

export const itemDefinitions = {
  camera2d: camera2dDefinition,
  point2d: point2dDefinition,
  grid2d: grid2dDefinition,
  axes2d: axes2dDefinition,
  line2d: line2dDefinition,
  vector2d: vector2dDefinition,
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
  Opts extends object
> = ItemHandleFromDefinition<(typeof itemDefinitions)[K], Opts>;

export type ItemInstanceOf<K extends ItemKind = ItemKind> = K extends ItemKind
  ? ItemInstance<K, ItemOptions<K>>
  : never;

export type Item = ItemInstanceOf<ItemKind>;
