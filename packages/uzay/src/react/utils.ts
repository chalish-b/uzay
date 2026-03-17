export { isBoundAtom } from "../core/atom-wrapper";

// Shallow-equal for plain objects/arrays so that inline values like
// `vec3(1,2,3)` or `[-8, 8]` don't reset atoms every render.
export function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.is((a as any)[key], (b as any)[key])) return false;
  }
  return true;
}
