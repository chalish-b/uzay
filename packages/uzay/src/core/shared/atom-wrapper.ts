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
type ValueModeAtom<Value> = WritableAtom<Value, [Value], void> & WithInitialValue<Value>;
export type SceneAtomOptions = {
  mode: "value";
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
  function bindAtom<A extends AnyAtom>(atom: A): BoundAtom<A> {
    // Bind store helpers once so callers can interact with scene atoms without
    // repeating the scene's get/set/sub ceremony.
    const bound = atom as BoundAtom<A>;

    (bound as any)[BOUND_ATOM_SYMBOL] = true;
    (bound as any).get = () => store.get(atom as any);

    // Only writable atoms receive .set so the runtime API matches the exposed type.
    if (typeof (atom as any).write === "function") {
      (bound as any).set = (...setArgs: any[]) => store.set(atom as any, ...setArgs);
    }

    (bound as any).sub = (listener: () => void) =>
      store.sub(atom as any, listener);

    return bound;
  }

  function isSceneAtomOptions(value: unknown): value is SceneAtomOptions {
    return (
      value !== null &&
      typeof value === "object" &&
      (value as SceneAtomOptions).mode === "value"
    );
  }

  function createValueModeAtom<Value>(
    initialValue: Value
  ): BoundAtom<ValueModeAtom<Value>> {
    // Plain values can use Jotai's primitive atom directly.
    if (typeof initialValue !== "function") {
      return bindAtom(
        jotaiAtom(initialValue) as ValueModeAtom<Value>
      );
    }

    // Function values must be boxed so Jotai does not mistake them for atom logic.
    const boxedAtom = jotaiAtom<{ value: Value }>({
      value: initialValue as Value,
    });
    const valueAtom = jotaiAtom(
      (get) => get(boxedAtom).value,
      (_get, set, nextValue: Value) => {
        set(boxedAtom, { value: nextValue as Value });
      }
    ) as ValueModeAtom<Value>;

    valueAtom.init = initialValue as Value;
    return bindAtom(valueAtom);
  }

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

  function sceneAtom<Value>(
    initialValue: Value,
    options: SceneAtomOptions
  ): BoundAtom<ValueModeAtom<Value>>;

  function sceneAtom<Value>(): BoundAtom<
    PrimitiveAtom<Value | undefined> & WithInitialValue<Value | undefined>
  >;

  function sceneAtom<Value>(
    initialValue: Value
  ): BoundAtom<PrimitiveAtom<Value> & WithInitialValue<Value>>;

  // Single implementation
  function sceneAtom(...args: any[]): any {
    // Value mode keeps the public API explicit while routing function values
    // through a boxed writable atom under the hood.
    if (args.length === 2 && isSceneAtomOptions(args[1])) {
      return createValueModeAtom(args[0]);
    }

    // Fall back to Jotai's normal atom overloads for derived atoms and other
    // standard writable atom forms.
    // @ts-expect-error
    const atom = jotaiAtom(...(args as any));
    return bindAtom(atom);
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

// Resolve an AtomLikeInput to a BoundAtom. If the value is already a BoundAtom,
// return it as-is. Otherwise, wrap it in a new primitive atom via scene.atom().
// This is the minimal utility constructions need to read user inputs inside
// derived atoms (via `get()`).
//
// Use mode: "value" for function-valued fields so Jotai doesn't misinterpret
// them as derived atom read functions. This mirrors the atomize: "value" option
// in item field definitions.
export function ensureAtom<V>(
  sceneAtom: SceneAtomFunction,
  value: AtomLikeInput<V>,
  mode?: "value"
): BoundAtom<Atom<V>> {
  if (isBoundAtom(value)) return value as BoundAtom<Atom<V>>;
  if (mode === "value") {
    return sceneAtom(value, { mode: "value" }) as BoundAtom<Atom<V>>;
  }
  return sceneAtom(value) as BoundAtom<Atom<V>>;
}
