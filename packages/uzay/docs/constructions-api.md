# Constructions API Design

Internal reference for the construction layer's API conventions. Not for public docs.

Constructions are functions that compose primitives (items) into higher-level mathematical objects. A tangent line is a construction: it's a point + a line, wired together with derived atoms. The engine doesn't need to know what a "tangent line" is. It just sees items and atoms.

---

## Why constructions exist

The engine provides low-level primitives: point, line, vector, parametric curve, surface, etc. These are the things that need custom renderers and can't be built from other items.

But nobody wants to write "create a point, create two more points for the tangent endpoints, compute the derivative numerically, wire up derived atoms for the positions" every time they want a tangent line. Constructions package that wiring into reusable functions.

The key property: **constructions use the exact same public API that users have.** There's no privileged internal machinery. A user-written construction and a library-provided construction have identical power. This means:

- The construction layer is a proof that the primitive layer is expressive enough
- Users can inspect library constructions to learn patterns
- Users can build their own, and they compose naturally

---

## What should be a primitive vs. a construction

A thing should be an engine-level **primitive** (item) when:

1. It needs a fundamentally different renderer (surfaces need mesh geometry, not just lines/points)
2. It has unique interaction behavior that the engine needs to understand (point3d's constrained dragging)
3. It would hit performance bottlenecks as a composition (a vector field made of 500 individual vector items might need instanced rendering)

Everything else is a **construction**. Angle markers, tangent lines, drop lines, projections, labeled points, distance indicators, coordinate frames: all compositions of existing primitives wired together with atoms.

When in doubt, start as a construction. Promote to a primitive later if performance or interaction needs force it. This keeps the engine small and the construction layer is where the library's actual usability lives.

---

## Function signature convention

```ts
function tangentLine(scene: Scene3D, options: TangentLineOptions): TangentLineHandle;
```

- First argument is always `scene`
- Second argument is a single options object
- Returns a handle object

Constructions are standalone functions, not methods on Scene3D. This keeps Scene3D unpolluted, allows tree-shaking, and means third-party constructions work identically to built-in ones.

---

## Options: AtomLikeInput for everything

Every option field accepts either a plain value or a BoundAtom, using `AtomLikeInput<T>`. This is the same pattern items use, but constructions don't use `AtomLikeOptions<T>` as a single mapped type. Instead, the options type is written manually with required/optional fields and defaults handled naturally:

```ts
type TangentLineOptions = {
  f: AtomLikeInput<(t: number) => Vec3>;   // required
  t: AtomLikeInput<number>;                // required
  length?: AtomLikeInput<number>;          // optional, defaults to 2
  color?: AtomLikeInput<Color>;            // optional, defaults to "yellow"
  showPoint?: AtomLikeInput<boolean>;      // optional, defaults to true
};
```

This means:

```ts
// Plain values for everything (common case)
tangentLine(scene, { f: myFunc, t: 0.5, color: "yellow" });

// Atom for the parameter (reactive, very common)
tangentLine(scene, { f: myFunc, t: tAtom });

// Atom for color too (rare but supported)
tangentLine(scene, { f: myFunc, t: tAtom, color: colorAtom });
```

### Atomization inside constructions

Constructions use `ensureAtom()` to normalize inputs before using them in derived atoms:

```ts
const tAtom = ensureAtom(scene.atom, options.t);
const colorAtom = ensureAtom(scene.atom, options.color ?? "yellow");
```

`ensureAtom` passes through existing BoundAtoms and wraps plain values in new primitive atoms.

For **function-valued fields** (like a parametric function), use the `"value"` mode so Jotai doesn't misinterpret the function as a derived atom reader:

```ts
const fAtom = ensureAtom(scene.atom, options.f, "value");
```

This mirrors how item definitions mark function-valued fields with `atomize: "value"`. The construction author knows which fields are function-valued and marks them accordingly.

### What to expose as options

- **Mathematical inputs** that define the construction's behavior: always expose. These are the things users are most likely to pass atoms for (`f`, `t`, `origin`, `direction`, etc.)
- **Common style knobs** that apply to the construction as a whole: expose with sensible defaults (`color`, `length`, `opacity`). One `color` option that applies to all sub-items is better than `pointColor`, `lineColor`, `labelColor`.
- **Fine-grained style props** for individual sub-items: don't expose as options. Users access the returned item handles instead (`tangent.point.radius.set(5)`).

The rule of thumb: if you'd need more than ~8-10 options to cover everything, you're exposing too much. Keep the options object small, let item handles be the escape hatch for fine-tuning.

### Fields not exposed as options

Anything the construction doesn't expose as an option gets an internal default. The user can still change it after creation through the returned item handles (e.g. `tangent.point.radius.set(5)`). Since the scene isn't rendered until a View is created, users can freely tweak item fields before anything shows up on screen.

This can't make the field reactively derived after the fact, but a workaround exists: set up a `.sub()` on a source atom and call `.set()` on the item's field inside the callback. It's manual but possible. If users do this often for the same field, that's a signal to promote it to an option.

---

## Return value: the handle

A construction returns a handle with:

1. **Every item it created**, by name. Users can tweak properties, attach event handlers, or use them in further constructions.
2. **Atoms created by the construction** that are useful for the user to read or control.
3. **`dispose()`** to remove all items from the scene.

```ts
// tangentLine returns:
{
  point,          // the Point3D on the curve
  line,           // the Line3D for the tangent
  tangent,        // derived atom: the tangent vector at t (read-only)
  dispose(),      // removes all items from scene
}
```

### Atom ownership and writability

There are two kinds of atoms in a construction:

**User-passed atoms** (from options) go through `ensureAtom`, which erases writability at the type level. The construction can only read them. This is intentional: the construction is a consumer of its inputs, not an owner. The user controls these atoms from outside.

**Construction-owned atoms** are created internally with `scene.atom()`. These can be either derived (read-only) or writable. If the construction returns a writable atom, the user can call `.set()` on it to control the construction's behavior from outside. The reactive graph propagates the change through the construction's derived atoms, updating items automatically.

```ts
function someConstruction(scene, options) {
  // Writable internal state: user can .set() this to control the construction
  const expandedAtom = scene.atom(false);

  // Derived internal state: read-only, computed from other atoms
  const areaAtom = scene.atom((get) => computeArea(get(...)));

  return {
    expanded: expandedAtom,  // writable, user can call .set()
    area: areaAtom,          // read-only, user can read or derive from
    dispose: () => { ... },
  };
}
```

### What NOT to return

**Don't return atoms from options.** If the user passed a plain value for `color`, they don't get an atom back for it. If they wanted reactive control, they should have passed an atom in the first place. They can still access the value through the returned items (e.g. `tangent.line.color`), since all item fields are atoms regardless of how they were created.

**Don't return internal wiring atoms.** Things like `startAtom` and `endAtom` (the computed endpoints of the tangent line) are internal to the construction. Return atoms that a user would plausibly want to read, write, derive from, or bind to another construction.

---

## Summary of conventions

| Aspect | Convention | Rationale |
|---|---|---|
| Function shape | `construction(scene, options)` | Standalone for tree-shaking, third-party parity |
| Options fields | `AtomLikeInput<T>` per field | Plain values or atoms, required/optional set explicitly |
| Function-valued fields | `ensureAtom(scene.atom, value, "value")` | Prevents Jotai from misinterpreting functions as derived atoms |
| Required vs optional | Math inputs required, style optional with defaults | Users always have a specific function/point/direction |
| Style granularity | One `color` for the whole construction, not per-sub-item | Keep options small, use item handles for fine-tuning |
| Return: items | All items, by name | Users can tweak fields, attach handlers, compose further |
| Return: atoms | Construction-owned atoms (writable or derived), not option atoms | Users access option values via item fields; construction atoms are new state or computed values |
| Return: dispose | Always | Cleanup for all items the construction created |
| No privileged API | Constructions use public `scene.create()` and `scene.atom()` | User constructions and library constructions are equal |
