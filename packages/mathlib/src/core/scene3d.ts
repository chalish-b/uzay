import { createStore } from "jotai/vanilla";
import { type ItemId, type ItemSnapshot } from "./common-types/item-registry";
import {
  type ItemKind,
  type Item,
  type ItemOptions,
  type ItemInstance,
  itemFactory,
} from "./common-types/item-registry";
import type { SceneAtomFunction, BoundAtom, Store } from "./atom-wrapper";
import { createSceneAtom } from "./atom-wrapper";
import type { Atom, PrimitiveAtom } from "jotai";

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

  create<K extends ItemKind, Opts extends ItemOptions<K>>(
    kind: K,
    options: Opts,
    ..._check: Opts extends ItemOptions<K> ? [] : ["Invalid options for kind"]
  ): ItemInstance<K, Opts> {
    const item = (
      itemFactory[kind] as (
        scene: Scene3D,
        options: Opts
      ) => ItemInstance<K, Opts>
    )(this, options as any) as ItemInstance<K, Opts>;
    this.items.set(item.id, item);
    item.store = this.store;

    // When the item has any reactive field updated, it'll invalidate the whole scene.
    // Which will then schedule a re-render on the view.
    item.setupAtomInvalidations(() => {
      this.invalidateScene();
    });
    return item;
  }

  remove<T extends Item>(item: T) {
    item.removeFromScene();
    this.items.delete(item.id);
  }

  atomize<V, A extends Atom<V>>(value: BoundAtom<A>): BoundAtom<A>;
  atomize<T>(value: T): BoundAtom<PrimitiveAtom<T>>;
  atomize(value: unknown): any {
    const isBoundAtom = (value: unknown): value is BoundAtom<Atom<unknown>> => {
      return (
        value !== null &&
        typeof value === "object" &&
        "read" in value &&
        typeof value.read === "function" &&
        "get" in (value as any) &&
        typeof (value as any).get === "function"
      );
    };

    if (isBoundAtom(value)) {
      return value;
    }

    // When the value itself is a function (e.g. parametric function fields), we
    // need to treat it as a plain value, not as a Jotai read function.
    if (typeof value === "function") {
      const fnValue = value;
      return this.atom(() => fnValue);
    }

    return this.atom(value as any);
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
    return cam;
  }

  // Called by the View when a render is done. Marks all the items clean again
  renderComplete() {
    for (const [id, item] of this.items.entries()) {
      item.isDirty = false;
    }
  }
}
