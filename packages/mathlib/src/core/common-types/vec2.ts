// I'm not making this a class. The Vec2 objects should just be simple containers.
// We are also using them in atoms, so it shouldn't be complicated.
export type Vec2 = { x: number; y: number };

// This is just a convenience function to create vectors easily,
// without the new keyword: vec2(1, 2)
export function vec2(x: number, y: number): Vec2 {
  // TODO: Should we freeze this object?
  // Should vectors be immutable?
  return { x, y };
}

// Updates are basically done like this, which is clean imo.
// Jotai requires us to create a new object for the update, so we can't mutate the vector directly.
// set(posAtom, (prev) => Vec2(prev.x + 1, prev.y));

// Vec2 namespace functions return new objects instead of modifying the vector diretly.
// set(posAtom, (prev) => Vec2.normalized(prev));
export namespace Vec2 {
  export const ZERO = Object.freeze(vec2(0, 0));
  export const ONE = Object.freeze(vec2(1, 1));

  export function add(...vectors: Vec2[]): Vec2 {
    const result = vec2(0, 0);
    for (const vec of vectors) {
      result.x += vec.x;
      result.y += vec.y;
    }
    return result;
  }

  export function subtract(a: Vec2, b: Vec2): Vec2 {
    return vec2(a.x - b.x, a.y - b.y);
  }

  export function normalized(vec: Vec2): Vec2 {
    const length = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
    if (length === 0) return vec2(0, 0);
    return vec2(vec.x / length, vec.y / length);
  }

  export function scaled(vec: Vec2, scalar: number): Vec2 {
    return vec2(vec.x * scalar, vec.y * scalar);
  }

  export function dot(a: Vec2, b: Vec2): number {
    return a.x * b.x + a.y * b.y;
  }

  export function cross(a: Vec2, b: Vec2): number {
    return a.x * b.y - a.y * b.x;
  }

  export function distance(a: Vec2, b: Vec2): number {
    return Math.sqrt(distanceSquared(a, b));
  }

  export function distanceSquared(a: Vec2, b: Vec2): number {
    return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
  }
}

// ==================================

// Or maybe, we should make it a class, but make its components atoms:
// { x: Atom<number>, y: Atom<number> } instead of Atom<{x: number, y: number}>
// Idk which one is better. Currently I'm going with the simpler approach Atom<{...}>
// but it might be worse for performance. We'll worry about it later.

// I think we can create our own stuff like ReactiveVec2 (or Vec2Value) and
// ReactiveScalar that are simple atom wrappers. This would kind of limit the user
// though since they can't use any arbitrary atoms. There are also function atoms
// to consider.

// NOTE: Conclusion: Start with Atom<Vec2> with simple objects. But in the future,
// we'll probably create our own wrappers for performance. Those wrappers will be
// mutable and mutate the vector coordinates directly for performance (the coords
// are still atoms, just scalar atoms instead of vectors).
