import { useState, useEffect, useCallback } from "react";
import type { Atom, WritableAtom } from "jotai";
import type { BoundAtom } from "../core/atom-wrapper";

 // Subscribe to a BoundAtom's value in React.
 // Re-renders the component when the atom changes (from drags, other atoms, etc.).
export function useAtomValue<V>(atom: BoundAtom<Atom<V>>): V {
  const [value, setValue] = useState<V>(() => atom.get() as V);

  useEffect(() => {
    // Sync in case the atom changed between render and effect
    setValue(atom.get() as V);
    return atom.sub(() => setValue(atom.get() as V));
  }, [atom]);

  return value;
}

// Two-way binding between a writable BoundAtom and React state.
// Returns [value, setter] like useState, but backed by the scene atom.
// Writing calls atom.set(); atom changes (from any source) trigger re-render.
export function useAtomState<V, Args extends unknown[], R>(
  atom: BoundAtom<WritableAtom<V, Args, R>>
): [V, (value: V) => void] {
  const value = useAtomValue(atom);
  const set = useCallback((v: V) => (atom as any).set(v), [atom]);
  return [value, set];
}
