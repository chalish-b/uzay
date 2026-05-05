import { createStore } from "jotai/vanilla";
import {
  type ItemKind,
  type Item,
  type ItemOptions,
  type ItemInstance,
  type ItemId,
  type ItemSnapshot,
  itemDefinitions,
} from "./types/item-registry";
import type { SceneAtomFunction, Store } from "../shared/atom-wrapper";
import { createSceneAtom } from "../shared/atom-wrapper";
import { createRuntimeItem } from "../shared/item";

export type SceneSnapshot = {
  itemSnapshots: Map<ItemId, ItemSnapshot>;
};

export class Scene2D {
  store: Store;
  items: Map<ItemId, Item> = new Map();

  // scene.atom() function, with the underlying store already bound so
  // consumers can call myAtom.get() / .set() directly.
  atom: SceneAtomFunction;

  // Called by items when their state changes. The View subscribes here to
  // schedule a re-render. Manually wired up by the View, not in the constructor.
  invalidateSceneListeners: Set<() => void> = new Set();
  listenForSceneInvalidation(cb: () => void) {
    this.invalidateSceneListeners.add(cb);
    return () => {
      this.invalidateSceneListeners.delete(cb);
    };
  }
  invalidateScene() {
    for (const listener of this.invalidateSceneListeners) {
      listener();
    }
  }

  constructor() {
    this.store = createStore();
    this.atom = createSceneAtom(this.store);
  }

  create<K extends ItemKind, const Opts extends object>(
    kind: K,
    options: ItemOptions<K> & Opts
  ): ItemInstance<K, Opts> {
    const definition = itemDefinitions[kind] as (typeof itemDefinitions)[K];
    const item = createRuntimeItem(
      this,
      definition,
      options
    ) as ItemInstance<K, Opts>;
    this.items.set(item.id, item as unknown as Item);

    item.setupAtomInvalidations(() => {
      this.invalidateScene();
    });

    this.invalidateScene();
    return item;
  }

  remove<T extends Item>(item: T) {
    if (!this.items.has(item.id)) return;
    item.removeFromScene();
    this.items.delete(item.id);
    this.invalidateScene();
  }

  getSceneSnapshot(): SceneSnapshot {
    const itemSnapshots: Map<ItemId, ItemSnapshot> = new Map();
    for (const item of this.items.values()) {
      itemSnapshots.set(item.id, item.getItemSnapshot());
    }
    return { itemSnapshots };
  }

  getCamera(cameraId: ItemId) {
    const cam = this.items.get(cameraId);
    if (!cam || cam.kind !== "camera2d") {
      throw new Error(
        `Camera with id ${cameraId} not found. Make sure to add a camera2d to the scene.`
      );
    }
    return cam as ItemInstance<"camera2d", ItemOptions<"camera2d">>;
  }

  renderComplete() {
    for (const item of this.items.values()) {
      item.isDirty = false;
    }
  }
}
