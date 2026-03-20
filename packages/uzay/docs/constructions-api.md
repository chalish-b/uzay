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
- Second argument is a single options object (mirrors `scene.create(kind, options)`)
- Returns a handle object

Constructions are standalone functions, not methods on Scene3D. This keeps Scene3D unpolluted, allows tree-shaking, and means third-party constructions work identically to built-in ones.

---

## Options: AtomLikeOptions for everything

Construction options use the same `AtomLikeOptions` pattern that items use. Every field can accept either a plain value or a BoundAtom:

```ts
type TangentLineFields = {
  f: (t: number) => Vec3;
  t: number;
  color: Color;
  lineLength: number;
};

type TangentLineOptions = AtomLikeOptions<TangentLineFields>;
```

This means:

```ts
// Plain values for everything (common case)
tangentLine(scene, { f: myFunc, t: 0.5, color: "yellow" });

// Atom for the parameter (reactive, very common)
tangentLine(scene, { f: myFunc, t: tAtom });

// Atom for color too (rare but supported, no special handling needed)
tangentLine(scene, { f: myFunc, t: tAtom, color: colorAtom });
```

Inside the construction, atomize each input (wrap plain values, pass through existing atoms), then use those atoms when creating the underlying items. The existing atomization machinery handles this.

### What to expose as options

- **Mathematical inputs** that define the construction's behavior: always expose. These are the things users are most likely to pass atoms for (`f`, `t`, `origin`, `direction`, etc.)
- **Common style knobs** that apply to the construction as a whole: expose with sensible defaults (`color`, `lineLength`, `opacity`). One `color` option that applies to all sub-items is better than `pointColor`, `lineColor`, `labelColor`.
- **Fine-grained style props** for individual sub-items: don't expose. Users access the returned item handles instead (`tangent.point.radius.set(5)`).

The rule of thumb: if you'd need more than ~8-10 options to cover everything, you're exposing too much. Keep the options object small, let item handles be the escape hatch.

### Fields not exposed as options

Anything the construction doesn't expose as an option gets an internal default. The user can still change it after creation through the returned item handles (e.g. `tangent.point.radius.set(5)`).

This can't make the field reactively derived after the fact, but a workaround exists: create a writable atom, pass it in as the option, and `.sub()` on whatever you want to derive from. It's manual but possible. If users do this often for the same field, that's a signal to promote it to an option.

---

## Return value: the handle

A construction returns a handle with:

1. **Every item it created**, by name. Users can tweak properties, attach event handlers, or use them in further constructions.
2. **Mathematically meaningful derived atoms**, so users can build on top of the construction's computations without redoing them.
3. **`dispose()`** to remove all items from the scene.

```ts
type TangentLineHandle = {
  point: Point3D;           // the point sitting on the curve
  line: Line3D;             // the tangent line
  slope: BoundAtom<Vec3>;   // derived: the tangent vector, exposed for further use
  dispose: () => void;      // removes all items from scene
};
```

Don't return atoms for things that are just internal wiring. Return atoms that a user would plausibly want to display, derive from, or bind to another construction.

---

## Summary of conventions

| Aspect | Convention | Rationale |
|---|---|---|
| Function shape | `construction(scene, options)` | Mirrors `scene.create()`, standalone for tree-shaking |
| Options type | `AtomLikeOptions<Fields>` | Same pattern as items: plain values or atoms everywhere |
| Required vs optional | Math inputs required, style optional with defaults | Users always have a specific function/point/direction, rarely care about exact line thickness |
| Style granularity | One `color` for the whole construction, not per-sub-item | Keep options small, use item handles for fine-tuning |
| Return type | `{ ...items, ...atoms, dispose() }` | Full access to sub-items, useful derived values, cleanup |
| No privileged API | Constructions use public `scene.create()` and `scene.atom()` | User constructions and library constructions are equal |
