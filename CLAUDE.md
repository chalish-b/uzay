## Project Overview

Reactive 3D mathematical visualization library built with TypeScript, React, Three.js, and Jotai. All item properties are Jotai atoms, enabling automatic re-rendering when state changes.

## Commands

```bash
bun run dev          # Start Vite dev server for playground
bun run build        # Vite library build for uzay
```

No test framework is configured.

## Monorepo Structure

Bun workspaces with three packages:

- `packages/uzay` — Core library (`uzay`), published to npm
- `packages/playground` — Development playground with demos (`uzay-playground`, private)
- `packages/docs` — Documentation site (Next.js + Fumadocs, static export)

## Architecture

### Core Abstractions (`packages/uzay/src/core/`)

**Scene3D** (`scene3d.ts`) — Central state container. Owns a Jotai store, manages all items, provides `scene.create(kind, options)` factory API and `scene.atom()` for creating reactive atoms. Triggers invalidation on changes.

**View3D** (`view3d.ts`) — Rendering orchestrator. Manages Three.js renderer/camera/OrbitControls, runs a reconciliation algorithm (React-like diffing of item snapshots), and handles the interaction system (drag/click/hover via raycasting).

**BaseItem** (`item.ts`) — Abstract base class for all scene items. Each item has reactive atom fields, dirty-checking, event handlers, and lifecycle management. Items must be registered in the item registry.

**BoundAtom** (`atom-wrapper.ts`) — Wrapper around Jotai atoms with `.get()`, `.set()`, `.sub()` bound to the scene's store. The `AtomLikeOptions` type allows API consumers to pass plain values or atoms for any field.

### Item ↔ Renderer Pattern

Each item type has two files:

- `items/<kind>.ts` — Data model
- `renderers/<kind>.ts` — Three.js rendering (create/update/dispose lifecycle)

Renderers never access items directly; they receive immutable **snapshots** (`ItemSnapshot<K>`). The renderer contract is `create()`, `update()`, `dispose()`.

### Key Patterns

- **Reactive atoms**: All item fields are atoms. Changes mark the item dirty and trigger scene invalidation.
- **Snapshot reconciliation**: View3D diffs old vs new snapshots to determine creates/updates/removes.
- **Drag constraints**: Points support axis/plane-constrained dragging (x/y/z/xy/xz/yz/xyz/none) via ray-plane and ray-axis intersection math.
- **Event system**: Items support `on('drag'|'click'|'hover', handler)` with typed event objects including ray info.

## Other notes

- After implementing a feature, if it's testable in a demo, edit demo1.tsx (sandbox demo in `packages/playground/src/demos/`) to create a test scenario for it, to see whether all features work. You can tear down the existing demo1.tsx, make it a demo where we can test all the different features and edge cases of a newly implemented feature.
- After finishing a documentation or write up, do another pass to replace all instances of em dashes with something more natural (commas, colons, or just restructure the sentence to flow better). No em dashes.
