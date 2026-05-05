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
import type { Events2DMap } from "./interaction-events";

// 2D-specific defineItem wrapper that bakes in the 2D event map so item
// authors get typed handlers (worldPosition: Vec2) automatically.
export function defineItem2D<
  Kind extends string,
  Fields extends object,
  State extends object = {},
>(
  definition: ItemDefinition<Kind, Fields, State, Events2DMap<Kind>>
): ItemDefinition<Kind, Fields, State, Events2DMap<Kind>> {
  return defineItem(definition);
}

// 2D-specific runtime item factory. Same as createRuntimeItem at runtime;
// typed against Events2DMap so the resulting handle's on/handleDrag etc.
// surface 2D event payloads.
export function createRuntimeItem2D<
  Definition extends ItemDefinition<any, any, any, Events2DMap<any>>,
  const Opts extends object,
>(
  scene: SceneLike,
  definition: Definition,
  options: AtomLikeOptions<DefinitionFields<Definition>> & Opts
): ItemHandleFromDefinition<Definition, Opts> {
  return createRuntimeItem(scene, definition, options);
}
