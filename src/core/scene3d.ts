import { createStore, type Store } from "jotai/vanilla/store";
import { type ItemId } from "./item";
import {
  type ItemKind,
  type Item,
  type ItemOptions,
  type ItemInstance,
  itemFactory,
} from "./common-types/item-registry";
import type { SceneAtomFunction, BoundAtom } from "./atom-wrapper";
import { createSceneAtom } from "./atom-wrapper";
import type { Atom, PrimitiveAtom } from "jotai";
import { Camera3D, type Camera3DOptions, type CameraId } from "./camera3d";

export class Scene3D {
  store: Store;
  items: Map<ItemId, Item> = new Map();
  cameras: Map<CameraId, Camera3D> = new Map();

  // scene.atom() function, which wraps the Jotai atoms with "store" already
  // bounded, so we can directly do things like myAtom.get()
  atom: SceneAtomFunction;

  // Called by items when their state changes.
  // Signals the View / Renderer to schedule a re-render.
  // This is manually assigned by the View object. It's not in the constructor.
  invalidateScene = () => { };

  constructor() {
    this.store = createStore();
    this.atom = createSceneAtom(this.store);
  }

  create<K extends ItemKind, Opts extends ItemOptions<K>>(
    kind: K,
    options: Opts,
    ..._check: Opts extends ItemOptions<K> ? [] : ["Invalid options for kind"]
  ): ItemInstance<K, Opts> {
    const item = (itemFactory[kind] as (scene: Scene3D, options: Opts) => ItemInstance<K, Opts>)(this, options as any) as ItemInstance<
      K,
      Opts
    >;
    this.items.set(item.id, item);
    item.store = this.store;

    // When the item has any reactive field updated, it'll invalidate the whole scene.
    // Which will then schedule a re-render on the view.
    item.setupAtomInvalidations(this.store, this.invalidateScene);
    return item;
  }

  camera(options: Camera3DOptions = {}): Camera3D {
    const cam = new Camera3D(this, options);
    this.cameras.set(cam.id, cam);
    cam.store = this.store;

    // Should camera changing invalidate the scene?? Or should it have a different
    // Call to only invalidate the View?
    cam.setupAtomInvalidations(this.store, this.invalidateScene);
    return cam;
  }

  remove<T extends Item>(item: T) {
    item.removeFromScene();
    this.items.delete(item.id);
  }

  atomize<V, A extends Atom<V>>(value: BoundAtom<A>): BoundAtom<A>;
  atomize<T>(value: T): BoundAtom<PrimitiveAtom<T>>;
  atomize(value: unknown): any {
    const isBoundAtom = <T>(
      value: unknown
    ): value is BoundAtom<Atom<unknown>> => {
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

    return this.atom(value as any);
  }
}
