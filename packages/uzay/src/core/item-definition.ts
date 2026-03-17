import type { Atom, PrimitiveAtom } from "jotai";
import type { BoundAtom, AtomLikeOptions } from "./atom-wrapper";
import type { BaseItem } from "./item";
import type {
  ClickEvent,
  DragEvent,
  HoverEvent,
} from "./common-types/interaction-events";

export type AtomizeMode = "auto" | "value";

export type FieldSpec<T> = {
  defaultValue: T | (() => T);
  atomize: AtomizeMode;
};

export function field<T>(
  defaultValue: T | (() => T),
  options?: { atomize?: AtomizeMode }
): FieldSpec<T> {
  return {
    defaultValue,
    atomize: options?.atomize ?? "auto",
  };
}

export type FieldsSpec<Fields extends object> = {
  [K in keyof Fields]: FieldSpec<Fields[K]>;
};

export type DefinitionFields<Definition> = Definition extends ItemDefinition<
  any,
  infer Fields,
  any
>
  ? Fields
  : never;

export type DefinitionKind<Definition> = Definition extends ItemDefinition<
  infer Kind,
  any,
  any
>
  ? Kind
  : never;

type DefinitionState<Definition> = Definition extends ItemDefinition<any, any, infer State>
  ? State
  : never;

type OptOrDefault<Opts, K extends PropertyKey, DefaultValue> = K extends keyof Opts
  ? Opts[K]
  : DefaultValue;

type ResolveField<Value, Input> = Input extends BoundAtom<infer A>
  ? BoundAtom<A & Atom<Value>>
  : BoundAtom<PrimitiveAtom<Value>>;

export type ItemHandleFields<
  Fields extends object,
  Opts extends AtomLikeOptions<Fields>
> = {
  [K in keyof Fields]: ResolveField<
    Fields[K],
    OptOrDefault<Opts, K, Fields[K]>
  >;
};

export type RuntimeFields<Fields extends object> = {
  [K in keyof Fields]: BoundAtom<Atom<Fields[K]>>;
};

export type ItemHandle<
  Kind extends string,
  Fields extends object,
  Opts extends AtomLikeOptions<Fields>
> = BaseItem<Fields, Kind> & ItemHandleFields<Fields, Opts>;

export type ItemHandleFromDefinition<
  Definition extends ItemDefinition<any, any, any>,
  Opts extends AtomLikeOptions<DefinitionFields<Definition>>
> = ItemHandle<
  DefinitionKind<Definition>,
  DefinitionFields<Definition>,
  Opts
>;

export type ItemContext<
  Kind extends string,
  Fields extends object,
  State extends object,
> = {
  item: BaseItem<Fields, Kind> & RuntimeFields<Fields>;
  fields: RuntimeFields<Fields>;
  state: State;
};

export type ItemDefinition<
  Kind extends string,
  Fields extends object,
  State extends object = {},
> = {
  kind: Kind;
  fields: FieldsSpec<Fields>;
  state?: () => State;
  getCursorState?: (ctx: ItemContext<Kind, Fields, State>) => string | null;
  handleDrag?: (ctx: ItemContext<Kind, Fields, State>, event: DragEvent<any>) => void;
  handleClick?: (ctx: ItemContext<Kind, Fields, State>, event: ClickEvent<any>) => void;
  handleHover?: (ctx: ItemContext<Kind, Fields, State>, event: HoverEvent<any>) => void;
};

export type AnyItemDefinition = ItemDefinition<any, any, any>;

// Keep item definitions as plain objects so item files only describe fields
// and behavior, while the shared runtime builder handles the repetitive wiring.
export function defineItem<
  Kind extends string,
  Fields extends object,
  State extends object = {},
>(definition: ItemDefinition<Kind, Fields, State>) {
  return definition;
}

export type ItemDefinitionState<
  Definition extends ItemDefinition<any, any, any>,
> = DefinitionState<Definition>;
