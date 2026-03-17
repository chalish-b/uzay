# Item Type System

Internal reference for the item and scene type system. Not for public docs.

The concrete example used throughout is `scene.create("point3d", { coords: vec3(1,2,3) })`.

---

## 1. `scene.create` signature

```ts
create<K extends ItemKind, Opts extends ItemOptions<K>>(
    kind: K,
    options: Opts
): ItemInstance<K, Opts>
```

TypeScript infers `K = "point3d"` from the first argument. Now it needs to resolve the constraint on `Opts`.

---

## 2. Resolving `ItemOptions<"point3d">`

```ts
ItemOptions<K> = AtomLikeOptions<ItemFieldsMap[K]>
```

`ItemFieldsMap` maps each kind to its plain fields type:

```ts
ItemFieldsMap = {
  [K in ItemKind]: DefinitionFields<(typeof itemDefinitions)[K]>;
};
```

`DefinitionFields` is a conditional type that pulls the `Fields` parameter out of an `ItemDefinition<Kind, Fields, State>`:

```ts
DefinitionFields<Definition> = Definition extends ItemDefinition<any, infer Fields, any>
  ? Fields : never;
```

`point3dDefinition` was created by `defineItem<"point3d", Point3DFields, Point3DState>(...)`, so its type is `ItemDefinition<"point3d", Point3DFields, Point3DState>`. The conditional matches and extracts:

```
DefinitionFields<typeof point3dDefinition> = Point3DFields
```

Which is:

```ts
{
  tags: ItemTags;          // string[]
  coords: Vec3;            // [number, number, number]
  draggable: PointDraggableDir;  // "x"|"y"|"z"|"xy"|"xz"|"yz"|"xyz"|"none"
  color: Color;            // string
  radius: number;
  visible: boolean;
  pointerEvents: PointerEvents;  // "auto"|"none"
}
```

Now `AtomLikeOptions` makes every field optional, and each field accepts either the plain value OR a `BoundAtom`:

```ts
AtomLikeOptions<T> = { [K in keyof T]?: T[K] | BoundAtom<Atom<T[K]>> }
```

So:

```ts
ItemOptions<"point3d"> = {
  tags?:          ItemTags | BoundAtom<Atom<ItemTags>>;
  coords?:        Vec3     | BoundAtom<Atom<Vec3>>;
  draggable?:     PointDraggableDir | BoundAtom<Atom<PointDraggableDir>>;
  color?:         Color    | BoundAtom<Atom<Color>>;
  radius?:        number   | BoundAtom<Atom<number>>;
  visible?:       boolean  | BoundAtom<Atom<boolean>>;
  pointerEvents?: PointerEvents | BoundAtom<Atom<PointerEvents>>;
}
```

We passed `{ coords: vec3(1,2,3) }`, which is `{ coords: Vec3 }`. That satisfies this constraint, so:

```
Opts = { coords: Vec3 }
```

---

## 3. The return type: `ItemInstance` -> `ItemHandleFromDefinition` -> `ItemHandle`

```ts
ItemInstance<K, Opts> = ItemHandleFromDefinition<(typeof itemDefinitions)[K], Opts>
```

Just swaps from "kind string + opts" to "definition object + opts":

```
ItemInstance<"point3d", { coords: Vec3 }>
  = ItemHandleFromDefinition<typeof point3dDefinition, { coords: Vec3 }>
```

One more hop:

```ts
ItemHandleFromDefinition<Definition, Opts> = ItemHandle<
  DefinitionKind<Definition>,    // extracts Kind from ItemDefinition<Kind, Fields, State>
  DefinitionFields<Definition>,  // extracts Fields
  Opts
>
```

`DefinitionKind` works like `DefinitionFields` but pulls the first parameter:

```
DefinitionKind<typeof point3dDefinition> = "point3d"
```

So:

```
ItemHandleFromDefinition<typeof point3dDefinition, { coords: Vec3 }>
  = ItemHandle<"point3d", Point3DFields, { coords: Vec3 }>
```

And `ItemHandle` is where the two halves meet:

```ts
ItemHandle<Kind, Fields, Opts> = BaseItem<Fields, Kind> & ItemHandleFields<Fields, Opts>
```

So the return type is:

```
BaseItem<Point3DFields, "point3d"> & ItemHandleFields<Point3DFields, { coords: Vec3 }>
```

The left side (`BaseItem`) gives you `id`, `kind`, `isDirty`, `markDirty()`, `on()`, `off()`, `getItemSnapshot()`, etc. The right side gives you the actual field properties. See the next section for how those resolve.

---

## 4. `ItemHandleFields` and `ResolveField` — the core of the type system

```ts
ItemHandleFields<Fields, Opts> = {
  [K in keyof Fields]: ResolveField<Fields[K], OptOrDefault<Opts, K, Fields[K]>>;
};
```

For each field, two helper types do the work:

**`OptOrDefault`**: "Did the user explicitly pass this field in their options?"

```ts
OptOrDefault<Opts, K, DefaultValue> = K extends keyof Opts ? Opts[K] : DefaultValue
```

- If yes: use whatever type they passed (could be a plain value, could be a `BoundAtom`)
- If no: fall back to the plain value type from `Fields` (e.g. `Color`, `number`)

**`ResolveField`**: "Based on what was passed, is this field writable or potentially read-only?"

```ts
ResolveField<Value, Input> = Input extends BoundAtom<infer A>
  ? BoundAtom<A & Atom<Value>>        // preserves the atom they gave you (could be read-only)
  : BoundAtom<PrimitiveAtom<Value>>   // definitely writable
```

The key distinction: `PrimitiveAtom<V>` is Jotai's read-write atom (has `.set()`). Plain `Atom<V>` is the base, read-only type. This conditional is what makes the type system track writability per field.

Resolving each field for `Opts = { coords: Vec3 }`:

| Field | `OptOrDefault` result | Is it a BoundAtom? | `ResolveField` result |
|---|---|---|---|
| `coords` | `Vec3` (user passed it) | no | `BoundAtom<PrimitiveAtom<Vec3>>` |
| `color` | `Color` (not in opts, falls back) | no | `BoundAtom<PrimitiveAtom<Color>>` |
| `radius` | `number` (not in opts) | no | `BoundAtom<PrimitiveAtom<number>>` |
| *(all others)* | plain value (not in opts) | no | `BoundAtom<PrimitiveAtom<...>>` |

Every field is `BoundAtom<PrimitiveAtom<...>>` here because nothing was passed as an atom. All fields are writable.

**Contrast with:** `scene.create("point3d", { coords: myDerivedAtom })` where `myDerivedAtom: BoundAtom<Atom<Vec3>>` (a read-only derived atom):

| Field | `OptOrDefault` result | Is it a BoundAtom? | `ResolveField` result |
|---|---|---|---|
| `coords` | `BoundAtom<Atom<Vec3>>` (user passed it) | **yes**, `A = Atom<Vec3>` | `BoundAtom<Atom<Vec3> & Atom<Vec3>>` = `BoundAtom<Atom<Vec3>>` |

Now `coords` is `BoundAtom<Atom<Vec3>>` instead of `BoundAtom<PrimitiveAtom<Vec3>>`. It has `.get()` but no `.set()`. That's why `isWritableBoundAtom(item.coords)` returns false inside the drag handler, and dragging is rejected at runtime. The type system encodes which fields are writable based on what you passed in.

---

## 5. `RuntimeFields` vs `ItemHandleFields` — why both exist

These look similar but serve different audiences.

**`ItemHandleFields<Fields, Opts>`** is what the **caller** (user code) sees. It knows `Opts`, so it can track which fields are `PrimitiveAtom` (writable) vs `Atom` (maybe read-only). This is the return type of `scene.create()`.

**`RuntimeFields<Fields>`** is what the **definition hooks** (`handleDrag`, `getCursorState`) see:

```ts
RuntimeFields<Fields> = { [K in keyof Fields]: BoundAtom<Atom<Fields[K]>> }
```

Every field is just `BoundAtom<Atom<V>>`. No `PrimitiveAtom` anywhere. The definition code doesn't know what `Opts` is. A `point3d` definition is a singleton shared across all point instances — it doesn't know whether *this particular* point was created with a plain value or a derived atom for `coords`. It has to assume the most general type and check writability at runtime with `isWritableBoundAtom()`.

`RuntimeFields` appears inside `ItemContext`:

```ts
ItemContext<"point3d", Point3DFields, Point3DState> = {
  item: BaseItem<Point3DFields, "point3d"> & RuntimeFields<Point3DFields>,
  state: Point3DState
}
```

So inside `handleDrag({ item, state }, event)`:

- `item.coords` is `BoundAtom<Atom<Vec3>>` — you can `.get()` it, but to set it you must guard with `isWritableBoundAtom()` / `setBoundAtomIfWritable()`
- `state` is `{ warnedReadOnly: boolean, dragOffset: Vec3 }` — plain mutable object, one instance per item, not reactive. Needed because the definition object is a singleton, so any per-instance mutable bookkeeping (like drag offset) has to live here.

---

## 6. Snapshot types

`getItemSnapshot()` returns `{ id, kind, isDirty } & DefinitionFields<Definition>`.

For point3d:

```ts
{ id: string; kind: "point3d"; isDirty: boolean } & Point3DFields
// = { id, kind, isDirty, tags, coords, draggable, color, radius, visible, pointerEvents }
// all plain values (Vec3, string, number, boolean...), no atoms
```

This matches `ItemSnapshot<"point3d">` from the registry:

```ts
ItemSnapshot<K> = { id: ItemId; kind: K; isDirty: boolean } & ItemFields<K>
```

where `ItemFields<"point3d"> = ItemFieldsMap["point3d"] = Point3DFields`. Same shape, just derived from the registry side instead of the definition side.

---

## 7. The definition object

`point3dDefinition` has type `ItemDefinition<"point3d", Point3DFields, Point3DState>`:

```ts
ItemDefinition<Kind, Fields, State> = {
  kind: Kind;
  fields: FieldsSpec<Fields>;
  state?: () => State;
  getCursorState?: (ctx: ItemContext<Kind, Fields, State>) => string | null;
  handleDrag?: (ctx: ItemContext<Kind, Fields, State>, event: DragEvent<any>) => void;
  handleClick?: (ctx: ItemContext<Kind, Fields, State>, event: ClickEvent<any>) => void;
  handleHover?: (ctx: ItemContext<Kind, Fields, State>, event: HoverEvent<any>) => void;
}
```

`FieldsSpec<Point3DFields>` is `{ coords: FieldSpec<Vec3>, color: FieldSpec<Color>, ... }` where each `FieldSpec<T>` is `{ defaultValue: T | (() => T), atomize: AtomizeMode }`.

`defineItem()` doesn't transform anything. It's an identity function that only exists to get TypeScript to infer the three generic parameters (`Kind`, `Fields`, `State`) from the object literal, so you don't have to write them out manually.

---

## 8. The registry: how definitions become union types

`itemDefinitions` is a plain `as const` object mapping kind strings to definition objects. Everything else is derived from it:

- **`ItemKind`** = `keyof typeof itemDefinitions` = `"point3d" | "line3d" | "sphere3d" | ...`
- **`ItemFieldsMap`** = mapped type running `DefinitionFields<>` on each definition
- **`ItemInstance<K, Opts>`** = `ItemHandleFromDefinition<(typeof itemDefinitions)[K], Opts>` — same chain as above, looked up by kind
- **`Item`** (union of all possible items) = `ItemInstanceOf<ItemKind>`, which distributes across all kinds with `ItemOptions<K>` as the opts (most general — all fields are `BoundAtom<Atom<...>>` since the opts union covers both plain values and atoms)

To add a new item type, you add its definition to `itemDefinitions` and every derived type updates automatically.

---

## Type relationship map

```
User passes Opts  ─────────────────────────────────────────────┐
                                                                │
                                                                ▼
ItemDefinition<Kind, Fields, State>                   OptOrDefault per field
  │                                                     "did user pass this?"
  ├─ DefinitionKind<>    ──► Kind                            │
  ├─ DefinitionFields<>  ──► Fields                          ▼
  ├─ DefinitionState<>   ──► State                    ResolveField per field
  │                                                   "BoundAtom or plain value?"
  │                                                          │
  │                                            ┌─────────────┴──────────────┐
  │                                            ▼                            ▼
  │                                    BoundAtom<Atom<V>>        BoundAtom<PrimitiveAtom<V>>
  │                                    (passed an atom,           (passed plain value,
  │                                     maybe read-only)           definitely writable)
  │                                            │                            │
  │                                            └─────────┬─────────────────┘
  │                                                      ▼
  │                                            ItemHandleFields<Fields, Opts>
  │                                                      │
  │         ┌────────────────────────────────────────────┘
  │         ▼
  ├──► ItemHandle<Kind, Fields, Opts> = BaseItem<Fields, Kind> & ItemHandleFields
  │         ▲
  │         │
  │    ItemHandleFromDefinition<Definition, Opts>   (convenience alias)
  │         ▲
  │         │
  │    ItemInstance<K, Opts>                         (registry-level alias)
  │
  │
  ├──► RuntimeFields<Fields>                        (all fields as BoundAtom<Atom<V>>,
  │         │                                        used inside behavior hooks)
  │         ▼
  │    ItemContext<Kind, Fields, State> = { item: BaseItem & RuntimeFields, state: State }
  │
  │
  └──► ItemSnapshot<K> = { id, kind, isDirty } & Fields   (plain values, no atoms)
```

The whole point of having this many types is one split: the **caller** knows exactly which fields are writable (via `Opts`), while the **definition** code doesn't and must check at runtime. `ItemHandleFields` serves the caller; `RuntimeFields` serves the definition.
