import type { Atom } from "jotai";
import {
  isBoundAtom,
  type AtomLikeOptions,
  type BoundAtom,
  type SceneAtomFunction,
} from "./atom-wrapper";
import type { AtomizeMode } from "./item-definition";
import type {
  AnyItemDefinition,
  DefinitionFields,
  DefinitionKind,
  DefinitionEventMap,
  ItemContext,
  ItemHandleFromDefinition,
  ItemHandleFields,
  ItemDefinitionState,
  RuntimeFields,
} from "./item-definition";
import type { ItemId } from "./types/ids";
import type {
  AnyEventMap,
  InteractionEventType,
} from "./types/interaction-events-base";

// Minimal scene contract that BaseItem / createRuntimeItem need.
// Both Scene2D and Scene3D structurally satisfy this.
export type SceneLike = {
  atom: SceneAtomFunction;
};

export abstract class BaseItem<
  T,
  K extends string,
  EventMap extends AnyEventMap = AnyEventMap,
> {
  abstract kind: K;
  id: ItemId = crypto.randomUUID();
  isDirty: boolean = false;
  // Bumped on every field change. Views compare it against the version they
  // last applied (held in their previous snapshot) to decide what to redraw,
  // so several views of one scene each track their own progress independently.
  version: number = 0;
  invalidateScene: () => void = () => { };

  // Event handlers for interaction events (drag, click, hover)
  eventHandlers: Map<InteractionEventType, (e: any) => void> = new Map();

  markDirty() {
    this.isDirty = true;
    this.invalidateScene();
  }

  // These atom fields drive item invalidation.
  // Definition-built items register their fields during runtime item creation.
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
        this.version++;
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
    handler: (e: EventMap[E]) => void
  ): void {
    if (this.eventHandlers.has(event)) {
      console.warn(`Overwriting existing "${event}" handler on item ${this.id}`);
    }
    this.eventHandlers.set(event, handler as (e: any) => void);
  }

  off(event: InteractionEventType): void {
    this.eventHandlers.delete(event);
  }

  getHandler<E extends InteractionEventType>(
    event: E
  ): ((e: EventMap[E]) => void) | undefined {
    return this.eventHandlers.get(event) as ((e: EventMap[E]) => void) | undefined;
  }

  // Returns the cursor to show when hovering over this item.
  // Runtime item definitions can override this to provide custom behavior.
  getCursorState(): string | null {
    return null;
  }

  // Default interaction handlers. Runtime item definitions can override these.
  // These are called when no custom handler is set via on().
  handleDrag?(event: EventMap["drag"]): void;
  handleClick?(event: EventMap["click"]): void;
  handleHover?(event: EventMap["hover"]): void;

  // Each runtime item must expose a plain snapshot for the renderer layer.
  abstract getItemSnapshot(): {
    id: ItemId;
    kind: K;
    isDirty: boolean;
    version: number;
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
  DefinitionKind<Definition>,
  DefinitionEventMap<Definition>
> {
  kind: DefinitionKind<Definition>;
  private definition: Definition;
  private context: ItemContext<
    DefinitionKind<Definition>,
    DefinitionFields<Definition>,
    ItemDefinitionState<Definition>,
    DefinitionEventMap<Definition>
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
        DefinitionKind<Definition>,
        DefinitionEventMap<Definition>
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
    version: number;
  } & DefinitionFields<Definition> {
    const snapshot = {
      id: this.id,
      kind: this.kind,
      isDirty: this.isDirty,
      version: this.version,
    } as {
      id: ItemId;
      kind: DefinitionKind<Definition>;
      isDirty: boolean;
      version: number;
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
  scene: SceneLike,
  value: Value | BoundAtom<Atom<Value>>,
  mode: AtomizeMode
): BoundAtom<Atom<Value>> {
  // Reuse an existing scene-bound atom as-is so field identity is preserved.
  if (isBoundAtom(value)) {
    return value as BoundAtom<Atom<Value>>;
  }

  // Value-mode fields should share the exact same atomization rules as the
  // public scene.atom API, including writable function-valued atoms.
  if (mode === "value") {
    return scene.atom(value, { mode: "value" }) as BoundAtom<Atom<Value>>;
  }

  return scene.atom(value) as BoundAtom<Atom<Value>>;
}

export function createRuntimeItem<
  Definition extends AnyItemDefinition,
  const Opts extends object,
>(
  scene: SceneLike,
  definition: Definition,
  options: AtomLikeOptions<DefinitionFields<Definition>> & Opts
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
