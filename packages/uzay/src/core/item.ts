import type { Atom } from "jotai";
import { isBoundAtom, type BoundAtom } from "./atom-wrapper";
import type { AtomizeMode } from "./item-definition";
import type {
  AnyItemDefinition,
  DefinitionFields,
  DefinitionKind,
  ItemContext,
  ItemHandleFromDefinition,
  ItemHandleFields,
  ItemDefinitionState,
  RuntimeFields,
} from "./item-definition";
import type { ItemId } from "./common-types/item-registry";
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
import type { Scene3D } from "./scene3d";

export abstract class BaseItem<T, K extends string> {
  abstract kind: K;
  id: ItemId = crypto.randomUUID();
  isDirty: boolean = false;
  invalidateScene: () => void = () => { };

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
  abstract getItemSnapshot(): {
    id: ItemId;
    kind: K;
    isDirty: boolean;
  } & T;
}

type FieldKeys<Definition extends AnyItemDefinition> = Extract<
  keyof Definition["fields"],
  string
>;

class DefinedItem<
  Definition extends AnyItemDefinition,
> extends BaseItem<
  DefinitionFields<Definition>,
  DefinitionKind<Definition>
> {
  kind: DefinitionKind<Definition>;
  private definition: Definition;
  private context: ItemContext<
    DefinitionKind<Definition>,
    DefinitionFields<Definition>,
    ItemDefinitionState<Definition>
  >;

  constructor(
    definition: Definition,
    state: ItemDefinitionState<Definition>
  ) {
    super();
    this.kind = definition.kind as DefinitionKind<Definition>;
    this.definition = definition;
    this.context = {
      item: this as BaseItem<
        DefinitionFields<Definition>,
        DefinitionKind<Definition>
      > &
        RuntimeFields<DefinitionFields<Definition>>,
      state,
    };

    // Wire optional behavior hooks once so each item definition only declares
    // custom branches when it actually needs special interaction logic.
    if (definition.handleDrag) {
      this.handleDrag = (event) => definition.handleDrag!(this.context, event);
    }
    if (definition.handleClick) {
      this.handleClick = (event) => definition.handleClick!(this.context, event);
    }
    if (definition.handleHover) {
      this.handleHover = (event) => definition.handleHover!(this.context, event);
    }
  }

  getItemSnapshot(): {
    id: ItemId;
    kind: DefinitionKind<Definition>;
    isDirty: boolean;
  } & DefinitionFields<Definition> {
    const snapshot = {
      id: this.id,
      kind: this.kind,
      isDirty: this.isDirty,
    } as {
      id: ItemId;
      kind: DefinitionKind<Definition>;
      isDirty: boolean;
    } & DefinitionFields<Definition>;

    // Snapshot generation is generic so simple item definitions do not need to
    // repeat the same `.get()` ceremony for every field.
    for (const key of getFieldKeys(this.definition)) {
      (snapshot as Record<string, unknown>)[key] = (
        this as unknown as Record<string, BoundAtom<Atom<unknown>>>
      )[key].get();
    }

    return snapshot;
  }

  getCursorState(): string | null {
    return this.definition.getCursorState?.(this.context) ?? null;
  }
}

function getFieldKeys<Definition extends AnyItemDefinition>(
  definition: Definition
): FieldKeys<Definition>[] {
  return Object.keys(definition.fields) as FieldKeys<Definition>[];
}

function getDefaultValue<Value>(defaultValue: Value | (() => Value)): Value {
  return typeof defaultValue === "function"
    ? (defaultValue as () => Value)()
    : defaultValue;
}

function atomizeFieldValue<Value>(
  scene: Scene3D,
  value: Value | BoundAtom<Atom<Value>>,
  mode: AtomizeMode
): BoundAtom<Atom<Value>> {
  // Reuse an existing scene-bound atom as-is so field identity is preserved.
  if (isBoundAtom(value)) {
    return value as BoundAtom<Atom<Value>>;
  }

  // Function-valued fields need explicit "treat as value" handling so they do
  // not get confused with Jotai's derived-atom function signature.
  if (mode === "value" && typeof value === "function") {
    return scene.atom(() => value) as BoundAtom<Atom<Value>>;
  }

  return scene.atom(value) as BoundAtom<Atom<Value>>;
}

export function createRuntimeItem<
  Definition extends AnyItemDefinition,
  Opts extends {
    [K in keyof DefinitionFields<Definition>]?: DefinitionFields<Definition>[K] | BoundAtom<Atom<DefinitionFields<Definition>[K]>>;
  },
>(
  scene: Scene3D,
  definition: Definition,
  options: Opts
): ItemHandleFromDefinition<
  Definition,
  Opts
> {
  const state = (definition.state?.() ?? {}) as ItemDefinitionState<Definition>;
  const item = new DefinedItem(definition, state) as ItemHandleFromDefinition<
    Definition,
    Opts
  >;

  for (const key of getFieldKeys(definition)) {
    const spec = definition.fields[key];
    const value =
      key in options
        ? options[key]
        : getDefaultValue(spec.defaultValue);

    (item as Record<string, unknown>)[key] = atomizeFieldValue(
      scene,
      value as DefinitionFields<Definition>[typeof key] | BoundAtom<Atom<DefinitionFields<Definition>[typeof key]>>,
      spec.atomize
    ) as ItemHandleFields<
      DefinitionFields<Definition>,
      Opts
    >[typeof key];

    item.addAtomFields(
      (item as Record<string, BoundAtom<Atom<unknown>>>)[key]
    );
  }

  return item;
}
