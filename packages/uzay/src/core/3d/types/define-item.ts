import {
  defineItem,
  type ItemDefinition,
} from "../../shared/item-definition";
import { createRuntimeItem, type SceneLike } from "../../shared/item";
import type { AtomLikeOptions } from "../../shared/atom-wrapper";
import type {
  DefinitionFields,
  ItemHandleFromDefinition,
} from "../../shared/item-definition";
import type { Events3DMap } from "./interaction-events";

// 3D-specific defineItem wrapper that bakes in the 3D event map so item
// authors get typed handlers (worldPosition: Vec3, ray) automatically.
export function defineItem3D<
  Kind extends string,
  Fields extends object,
  State extends object = {},
>(
  definition: ItemDefinition<Kind, Fields, State, Events3DMap<Kind>>
): ItemDefinition<Kind, Fields, State, Events3DMap<Kind>> {
  return defineItem(definition);
}

// 3D-specific runtime item factory. Identical to createRuntimeItem at runtime,
// but typed against Events3DMap so the resulting handle's on/handleDrag etc.
// surface 3D event payloads.
export function createRuntimeItem3D<
  Definition extends ItemDefinition<any, any, any, Events3DMap<any>>,
  const Opts extends object,
>(
  scene: SceneLike,
  definition: Definition,
  options: AtomLikeOptions<DefinitionFields<Definition>> & Opts
): ItemHandleFromDefinition<Definition, Opts> {
  return createRuntimeItem(scene, definition, options);
}
