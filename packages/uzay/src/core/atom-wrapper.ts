import {
  atom as jotaiAtom,
  type Atom,
  type PrimitiveAtom,
  type WritableAtom,
} from "jotai";

import { type createStore } from "jotai/vanilla";

export type Store = ReturnType<typeof createStore>;

// Copied from Jotai source code since these are not public
type Getter = <Value>(atom: Atom<Value>) => Value;
type Setter = <Value, Args extends unknown[], Result>(
  atom: WritableAtom<Value, Args, Result>,
  ...args: Args
) => Result;
type AnyAtom = Atom<unknown>;
type SetAtom<Args extends unknown[], Result> = <A extends Args>(
  ...args: A
) => Result;
type Read<Value, SetSelf = never> = (
  get: Getter,
  options: {
    readonly signal: AbortSignal;
    readonly setSelf: SetSelf;
  }
) => Value;
type Write<Args extends unknown[], Result> = (
  get: Getter,
  set: Setter,
  ...args: Args
) => Result;
type WithInitialValue<Value> = {
  init: Value;
};
const BOUND_ATOM_SYMBOL = Symbol("uzay.boundAtom");

// Wrapper that binds a Jotai atom to a specific store
export type BoundAtom<A extends AnyAtom> = A & {
  get: () => A extends Atom<infer V> ? V : never;
  sub: (listener: () => void) => () => void;
  readonly [BOUND_ATOM_SYMBOL]: true;
} & (A extends WritableAtom<any, infer Args, infer Result>
    ? { set: (...args: Args) => Result }
    : {});

export function createSceneAtom(store: Store) {
  // Overloads mirroring Jotai's atom, but returning SceneAtom<...>

  function sceneAtom<Value, Args extends unknown[], Result>(
    read: Read<Value, SetAtom<Args, Result>>,
    write: Write<Args, Result>
  ): BoundAtom<WritableAtom<Value, Args, Result>>;

  function sceneAtom<Value>(read: Read<Value>): BoundAtom<Atom<Value>>;

  function sceneAtom<Value, Args extends unknown[], Result>(
    initialValue: Value,
    write: Write<Args, Result>
  ): BoundAtom<WritableAtom<Value, Args, Result> & WithInitialValue<Value>>;

  function sceneAtom<Value>(): BoundAtom<
    PrimitiveAtom<Value | undefined> & WithInitialValue<Value | undefined>
  >;

  function sceneAtom<Value>(
    initialValue: Value
  ): BoundAtom<PrimitiveAtom<Value> & WithInitialValue<Value>>;

  // Single implementation
  function sceneAtom(...args: any[]): any {
    // This is the real jotai atom
    // @ts-expect-error
    const a = jotaiAtom(...(args as any));

    // Treat it as a BoundAtom and attach helpers
    const bound = a as BoundAtom<typeof a>;

    (bound as any)[BOUND_ATOM_SYMBOL] = true;
    (bound as any).get = () => store.get(a as any);
    // Expose .set only for writable atoms so runtime behavior matches the type-level API.
    if (typeof (a as any).write === "function") {
      (bound as any).set = (...setArgs: any[]) => store.set(a as any, ...setArgs);
    }
    (bound as any).sub = (listener: () => void) =>
      store.sub(a as any, listener);

    return bound;
  }

  return sceneAtom;
}

// Types
// Convenience type for the scene's bound atom factory.
export type SceneAtomFunction = ReturnType<typeof createSceneAtom>;

export type SceneAtom<T> = BoundAtom<Atom<T>>;
type WritableBoundAtom<V> = BoundAtom<WritableAtom<V, [V], unknown>>;

// Use a symbol brand so the rest of the codebase can reliably recognize
// scene-bound atoms without repeating fragile Jotai duck-typing checks.
export function isBoundAtom(value: unknown): value is BoundAtom<Atom<unknown>> {
  return (
    value !== null &&
    typeof value === "object" &&
    (value as BoundAtom<Atom<unknown>>)[BOUND_ATOM_SYMBOL] === true
  );
}

export function isWritableBoundAtom<V>(
  atom: BoundAtom<Atom<V>>
): atom is WritableBoundAtom<V> {
  return (
    typeof (atom as any).write === "function" &&
    typeof (atom as any).set === "function"
  );
}

export function setBoundAtomIfWritable<V>(
  atom: BoundAtom<Atom<V>>,
  value: V
): boolean {
  if (!isWritableBoundAtom(atom)) return false;
  atom.set(value);
  return true;
}

// Convert all fields in an object to be AtomLike and optional
export type AtomLikeInput<V> = V | BoundAtom<Atom<V>>;

export type AtomLikeOptions<T extends object> = {
  [K in keyof T]?: AtomLikeInput<T[K]>;
};
