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

One whole-construction knob is part of the convention itself, the options-side counterpart of `dispose()`:

- **`visible?: AtomLikeInput<boolean>`**, defaulting to `true`. Every construction accepts it and applies it to every item it creates. It must be an option rather than something set through returned item handles, because a construction may bind internal visibility logic to its items (angleMark2D swaps an arc and a right-angle square through derived visibility atoms); those bindings are read-only from outside, so the user's intent has to be ANDed in. It also composes with narrower toggles: tangentLine's point shows only when both `visible` and `showPoint` are true.

Note that when an option drives several sub-items, they are bound to the same atom. Setting that field through one item's handle (`tangent.line.color.set("red")`) writes the shared atom, so the other items follow, including an atom the caller passed in. Accepted, not defended against: control such fields through the option, and if per-item control keeps coming up, add a dedicated option (the way `showPoint` covers the tangent point).

The rule of thumb: if you'd need more than ~8-10 options to cover everything, you're exposing too much. Keep the options object small, let item handles be the escape hatch for fine-tuning.

### Read inputs vs. writable state

Two kinds of option, split by **who reads and who writes**.

**Read inputs** are values the construction only consumes: `f`, `tStart`, `color`. Type them `AtomLikeInput<T>` so the user can pass a plain value or any atom, including a derived one (the construction never writes back). Normalize with `ensureAtom`, then read through `get()` in derived atoms.

**Writable state** is the construction's own parameter, the thing it reads *and* writes and returns in the handle: a curve point's `t`, a surface point's `xz`. Type it `WritableInput<T>` (which is `T | WritableBoundAtom<T>`) and resolve it with `ensureWritableAtom`:

- Pass a plain value and the construction creates and owns the atom (**uncontrolled**), seeded from that value.
- Pass a writable atom and the caller owns it; the construction reads and writes it (**controlled**). The same atom can be handed to several constructions, so dragging any one drives them all.

A read-only atom is rejected at the call site by the type, so there is no runtime writability check and no silent-write surprise. This is React's controlled/uncontrolled split: a plain value is `defaultValue`, a writable atom is `value`.

```ts
type CurvePointOptions = {
  f: AtomLikeInput<ParametricFunc>;   // read input, accepts any atom
  tStart?: AtomLikeInput<number>;     // read input, accepts any atom
  tEnd?: AtomLikeInput<number>;       // read input, accepts any atom
  t?: WritableInput<number>;          // writable state: owned (value) or shared (atom)
  color?: AtomLikeInput<Color>;       // read input, accepts any atom
};

function curvePoint(scene, options) {
  const tAtom = ensureWritableAtom(scene.atom, options.t ?? 0);
  // ...
  return { point, t: tAtom, dispose };
}
```

`ensureWritableAtom` is the writable counterpart of `ensureAtom`: a writable atom passes through unchanged (so the shared case just works), a plain value is wrapped in a new writable primitive atom the construction owns. Both helpers are public, so user-written constructions resolve their state the same way, with no internal machinery.

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

Three kinds of atoms in a construction:

**Read inputs** (from `AtomLikeInput` options) go through `ensureAtom`, which erases writability at the type level. The construction only reads them and never writes back. The user controls them from outside.

**Writable state** (from `WritableInput` options) goes through `ensureWritableAtom`. When the user passes a plain value the construction owns the atom; when they pass a writable atom the caller owns it and the construction drives it. Either way it is returned in the handle, and `.set()` from anywhere propagates through the construction's derived atoms, updating items automatically.

**Derived atoms** are created internally with `scene.atom((get) => ...)`. These are read-only computed values, like a tangent direction or an area. Return the ones a user would plausibly read or bind to; keep internal wiring atoms private.

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

## Open case: writing back through derived atoms

Controlled inputs (above) cover the common need: sharing a writable parameter across constructions, like one `t` driving several curve points. The case they do not cover is writing back through a *derived* atom to a consumed input.

Consider a `dropLine(scene, { coords })` that derives a ground point from `coords` (a read input). If you want the ground dot draggable, writing back up to `coords`, the construction cannot express it: `coords` came in through `ensureAtom` (read-only), and the derived ground atom is not writable. Constructions fix the reactive topology at creation time, so you cannot rewire which atoms drive which items after the fact.

The structural fix is usually to own the source at the caller and pass it as the writable state of whatever writes it, rather than deriving-then-writing-back inside one construction. When that does not fit, the open direction is a runtime-writability check on the derived atom: make it writable, and write back to the source if the source is writable, the way items already disable drag on a derived `coords`. That is not implemented; for now, wire those cases with primitives. If the pattern recurs, that's the signal to revisit it.

---

## Summary of conventions

| Aspect | Convention | Rationale |
|---|---|---|
| Function shape | `construction(scene, options)` | Standalone for tree-shaking, third-party parity |
| Read inputs | `AtomLikeInput<T>` per field, resolved with `ensureAtom` | Plain value or any atom (including derived); construction only reads, never writes back |
| Writable state | `WritableInput<T>` per field, resolved with `ensureWritableAtom` | Plain value: construction owns it (uncontrolled). Writable atom: caller owns and shares it (controlled). Returned in the handle. |
| Function-valued fields | `ensureAtom(scene.atom, value, "value")` | Prevents Jotai from misinterpreting functions as derived atoms |
| Required vs optional | Math inputs required, style optional with defaults | Users always have a specific function/point/direction |
| Style granularity | One `color` for the whole construction, not per-sub-item | Keep options small, use item handles for fine-tuning |
| Visibility | `visible?: AtomLikeInput<boolean>` on every construction, default `true`, applied to all its items | Whole-construction toggle; composes with internally derived visibility, which item handles can't override |
| Return: items | All items, by name | Users can tweak fields, attach handlers, compose further |
| Return: atoms | Construction-owned atoms (writable or derived), not option atoms | Users access option values via item fields; construction atoms are new state or computed values |
| Return: dispose | Always | Cleanup for all items the construction created |
| No privileged API | Constructions use public `scene.create()` and `scene.atom()` | User constructions and library constructions are equal |
