import { createStore } from "jotai/vanilla";
import { type ItemId, type ItemSnapshot } from "./common-types/item-registry";
import {
  type ItemKind,
  type Item,
  type ItemOptions,
  type ItemInstance,
  itemDefinitions,
} from "./common-types/item-registry";
import type { SceneAtomFunction, Store } from "./atom-wrapper";
import { createSceneAtom } from "./atom-wrapper";
import { createRuntimeItem } from "./item";

export type SceneSnapshot = {
  itemSnapshots: Map<ItemId, ItemSnapshot>;
};

export class Scene3D {
  store: Store;
  items: Map<ItemId, Item> = new Map();

  // scene.atom() function, which wraps the Jotai atoms with "store" already
  // bounded, so we can directly do things like myAtom.get()
  atom: SceneAtomFunction;

  // Called by items when their state changes.
  // Signals the View / Renderer to schedule a re-render.
  // This is manually assigned by the View object. It's not in the constructor.
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

    // When the item has any reactive field updated, it'll invalidate the whole scene.
    // Which will then schedule a re-render on the view.
    item.setupAtomInvalidations(() => {
      this.invalidateScene();
    });

    // Creating an item changes scene membership immediately, so trigger reconciliation.
    this.invalidateScene();
    return item;
  }

  remove<T extends Item>(item: T) {
    // If the item isn't in this scene, there is nothing to remove or invalidate.
    if (!this.items.has(item.id)) return;

    item.removeFromScene();
    this.items.delete(item.id);

    // Removing an item changes scene membership immediately, so trigger reconciliation.
    this.invalidateScene();
  }

  getSceneSnapshot(): SceneSnapshot {
    const itemSnapshots: Map<ItemId, ItemSnapshot> = new Map();
    for (const item of this.items.values()) {
      itemSnapshots.set(item.id, item.getItemSnapshot());
    }
    return {
      itemSnapshots,
    };
  }

  getCamera(cameraId: ItemId) {
    const cam = this.items.get(cameraId);
    if (!cam || cam.kind !== "camera3d") {
      throw new Error(
        `Camera with id ${cameraId} not found. Make sure to add a camera to the scene.`
      );
    }
    return cam as ItemInstance<"camera3d", ItemOptions<"camera3d">>;
  }

  // Called by the View when a render is done. Marks all the items clean again
  renderComplete() {
    for (const item of this.items.values()) {
      item.isDirty = false;
    }
  }
}
