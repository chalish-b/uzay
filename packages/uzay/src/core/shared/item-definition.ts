import type { Atom, PrimitiveAtom } from "jotai";
import type { BoundAtom } from "./atom-wrapper";
import type { BaseItem } from "./item";
import type { AnyEventMap } from "./types/interaction-events-base";

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
  any,
  any
>
  ? Fields
  : never;

export type DefinitionKind<Definition> = Definition extends ItemDefinition<
  infer Kind,
  any,
  any,
  any
>
  ? Kind
  : never;

type DefinitionState<Definition> = Definition extends ItemDefinition<any, any, infer State, any>
  ? State
  : never;

export type DefinitionEventMap<Definition> = Definition extends ItemDefinition<
  any,
  any,
  any,
  infer EventMap
>
  ? EventMap
  : never;

type BoundAtomPart<Value, Input> = Extract<Input, BoundAtom<Atom<Value>>>;
type PlainInputPart<Value, Input> = Exclude<Input, BoundAtom<Atom<Value>>>;

type ResolveField<Value, Input> =
  ([BoundAtomPart<Value, Input>] extends [never]
    ? never
    : BoundAtomPart<Value, Input>) |
  ([PlainInputPart<Value, Input>] extends [never]
    ? never
    : BoundAtom<PrimitiveAtom<Value>>);

type ResolveFieldFromOptions<
  Fields extends object,
  Opts extends object,
  K extends keyof Fields
> = K extends keyof Opts
  ? ResolveField<Fields[K], Opts[K]>
  : BoundAtom<PrimitiveAtom<Fields[K]>>;

export type ItemHandleFields<
  Fields extends object,
  Opts extends object
> = {
  [K in keyof Fields]: ResolveFieldFromOptions<Fields, Opts, K>;
};

export type RuntimeFields<Fields extends object> = {
  [K in keyof Fields]: BoundAtom<Atom<Fields[K]>>;
};

export type ItemHandle<
  Kind extends string,
  Fields extends object,
  Opts extends object,
  EventMap extends AnyEventMap = AnyEventMap,
> = BaseItem<Fields, Kind, EventMap> & ItemHandleFields<Fields, Opts>;

export type ItemHandleFromDefinition<
  Definition extends ItemDefinition<any, any, any, any>,
  Opts extends object
> = ItemHandle<
  DefinitionKind<Definition>,
  DefinitionFields<Definition>,
  Opts,
  DefinitionEventMap<Definition>
>;

export type ItemContext<
  Kind extends string,
  Fields extends object,
  State extends object,
  EventMap extends AnyEventMap = AnyEventMap,
> = {
  item: BaseItem<Fields, Kind, EventMap> & RuntimeFields<Fields>;
  state: State;
};

export type ItemDefinition<
  Kind extends string,
  Fields extends object,
  State extends object = {},
  EventMap extends AnyEventMap = AnyEventMap,
> = {
  kind: Kind;
  fields: FieldsSpec<Fields>;
  state?: () => State;
  getCursorState?: (ctx: ItemContext<Kind, Fields, State, EventMap>) => string | null;
  handleDrag?: (ctx: ItemContext<Kind, Fields, State, EventMap>, event: EventMap["drag"]) => void;
  handleClick?: (ctx: ItemContext<Kind, Fields, State, EventMap>, event: EventMap["click"]) => void;
  handleHover?: (ctx: ItemContext<Kind, Fields, State, EventMap>, event: EventMap["hover"]) => void;
};

export type AnyItemDefinition = ItemDefinition<any, any, any, any>;

// Generic factory. Per-dimension wrappers (defineItem3D, defineItem2D) bake in
// their own EventMap so item authors don't have to spell it out.
export function defineItem<
  Kind extends string,
  Fields extends object,
  State extends object = {},
  EventMap extends AnyEventMap = AnyEventMap,
>(definition: ItemDefinition<Kind, Fields, State, EventMap>) {
  return definition;
}

export type ItemDefinitionState<
  Definition extends ItemDefinition<any, any, any, any>,
> = DefinitionState<Definition>;
