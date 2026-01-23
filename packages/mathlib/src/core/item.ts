import type { Atom } from "jotai";
import type { Store } from "jotai/vanilla/store";
import type { BoundAtom } from "./atom-wrapper";
import type { ItemId, ItemKind, ItemSnapshot } from "./common-types/item-registry";
import type {
  InteractionEventType,
  InteractionHandler,
  DragHandler,
  ClickHandler,
  HoverHandler,
  DragEvent,
  ClickEvent,
  HoverEvent,
} from "./common-types/interaction-events";

export abstract class BaseItem<T, K extends ItemKind> {
  abstract kind: K;
  id: ItemId = crypto.randomUUID();
  isDirty: boolean = false;
  invalidateScene: () => void = () => { };

  // When added to the scene, will be set by the scene.
  // This also means we can't directly change a field before adding it to the scene.
  // But I think it's alright.
  store?: Store = undefined;

  // Event handlers for interaction events (drag, click, hover)
  eventHandlers: Map<
    InteractionEventType,
    DragHandler | ClickHandler | HoverHandler
  > = new Map();

  markDirty() {
    this.isDirty = true;
    this.invalidateScene();
  }

  // These atom fields are important for invalidation.
  // We set up a subscription so that when any atom field changes, the item is marked dirty.
  // This usually happens in the constructor of the item
  atomFields: Set<BoundAtom<Atom<any>>> = new Set();
  // NOTE: You must call this function after setting the atom fields for proper updates.
  addAtomFields(...fields: BoundAtom<Atom<any>>[]) {
    for (const field of fields) {
      this.atomFields.add(field);
    }
  }

  // This is called automatically by the scene when the item is added to the scene.
  // It connects the atom fields to scene's invalidation function.
  atomSceneSubscriptions: Set<() => void> = new Set();
  setupAtomInvalidations(invalidateScene: () => void) {
    this.invalidateScene = invalidateScene;

    // I think this should be done in addAtomFields instead, because it's not really
    // related to scene's invalidation. This function should just set the invalidation function.
    // But I guess it requires the "store" to be passed, so it's a bit awkward to do it there.
    for (const atom of this.atomFields) {
      const subscription = atom.sub(() => {
        if (this.isDirty) return;
        this.markDirty();
      });
      this.atomSceneSubscriptions.add(subscription);
    }
  }

  removeFromScene() {
    for (const unsub of this.atomSceneSubscriptions) {
      unsub();
    }
    this.atomSceneSubscriptions.clear();
    this.atomFields.clear();
  }

  // Event handler methods for interaction events
  on<E extends InteractionEventType>(
    event: E,
    handler: InteractionHandler<K>[E]
  ): void {
    if (this.eventHandlers.has(event)) {
      console.warn(`Overwriting existing "${event}" handler on item ${this.id}`);
    }
    this.eventHandlers.set(event, handler as DragHandler | ClickHandler | HoverHandler);
  }

  off(event: InteractionEventType): void {
    this.eventHandlers.delete(event);
  }

  getHandler<E extends InteractionEventType>(
    event: E
  ): InteractionHandler<K>[E] | undefined {
    return this.eventHandlers.get(event) as InteractionHandler<K>[E] | undefined;
  }

  // Returns the cursor to show when hovering over this item.
  // Override in subclasses to provide custom cursor behavior.
  getCursorState(): string | null {
    return null;
  }

  // Default interaction handlers. Override in subclasses to provide custom behavior.
  // These are called when no custom handler is set via on().
  handleDrag?(event: DragEvent<K>): void;
  handleClick?(event: ClickEvent<K>): void;
  handleHover?(event: HoverEvent<K>): void;

  // Will be implemented by the subclasses
  // Will be passed to the renderer
  abstract getItemSnapshot(): ItemSnapshot<K>;
}
