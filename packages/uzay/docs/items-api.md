# Items API Design

Internal reference for designing an item's field list. Not for public docs. Companion to `constructions-api.md` (the composition layer above items) and `item-type-system.md` (the type machinery underneath).

---

## The invariant: one atom per field

Every field is a single atom holding the field's whole value. Options accept a plain value or an atom of the full field type (`AtomLikeOptions`), and that is the only place reactivity plugs in. Field values never contain atoms inside them.

This is what keeps the API predictable: `ensureAtom` stays flat, snapshots resolve in one step, and there is exactly one way to make anything reactive.

"But I only want one part of a compound field reactive" already has an idiom, used by every demo that drives one coordinate of a `Vec2`: a derived atom that rebuilds the whole value from the reactive part.

```ts
labelAnchor: scene.atom((get) => ({ x: get(flip) ? "bottom" : "top" }))
coords: scene.atom((get) => vec2(get(x), 0))
```

For write-back (a drag that should update only one part), a writable derived atom covers it, same as the `coords` getter/setter pattern the drag handles use.

Do not "improve" this by accepting atom-likes inside a field value (`{ x: atomOrValue }`). It reads convenient but makes atom resolution recursive, nests the option types, and creates two ways to express the same thing.

---

## Flat field or compound value?

The test: **is it one decision or several?**

1. **Compound the parts that form one decision.** If users essentially always set the parts together, and a torn intermediate state (one part updated, the other not yet) is meaningless, they are one value. `position`, `range`, `endpoints`, `labelAnchor`: you never want the x anchor from one state and the y anchor from another.
2. **Keep independently-varying knobs flat.** `color` and `thickness` are separate fields, not a `style` record, because you routinely animate or theme one without touching the other. If a part plausibly gets its own atom in real scenes, it wants to be its own field.
3. **One level deep, value semantics.** A compound field is an immutable value you replace, never mutate. No records of records; if a design seems to need nesting, the field is probably trying to be two fields.
4. **Renderers must key on content, not identity.** A derived atom mints a fresh object on every recompute, so `===` checks on compound values rebuild spuriously. Include the field in the layout-key `JSON.stringify` like the existing renderers do.

Accepted price of a compound: partial writes through the handle need a spread (`item.labelAnchor.set({ ...current, x: "bottom" })`), where a flat field would be a plain `.set`. If that write path is something scenes realistically do per part, that is criterion 2 telling you to keep the parts flat.

---

## Reuse vocabulary before inventing it

When a field needs a "which side / which ends / which step" value, look for an existing shared type first: `OverlayAnchor`, `ArrowEnds`, `TickStep`, `PlaneDir`. A user who has met the vocabulary once should be able to guess what it means on the next item. `labelAnchor` reuses `OverlayAnchor` (the anchor names the label-box edge pinned at the point) instead of introducing a new side enum. Mint a new union only when nothing existing says the thing.

The same goes for field names and conventions across items: same-named fields behave identically everywhere (`labelClassName` replaces the default look on every item that has it, `headLength`/`headWidth` are CSS pixels everywhere, `arrows` reads `"start"` as the range's min side).

---

## Pick the right default, not the compatible one

A field's default is a design decision on its own merits: it should be what a fresh user would expect the item to do with the field unset. When the best API contradicts how the item currently behaves, change the behavior and migrate the callers (playground, docs demos, consuming repos); do not keep a legacy default or a compat alias around. Consistency across the API is worth more than existing scenes rendering byte-identically.

A sentinel like `"auto"` has to earn its place the same way: it belongs when the built-in heuristic is genuinely what most scenes want (a number line placing labels clear of the line at any angle), not as a name for "whatever the old hardcoded behavior was".
