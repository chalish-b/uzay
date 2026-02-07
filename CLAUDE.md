# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Reactive 3D mathematical visualization library built with TypeScript, React, Three.js, and Jotai. All item properties are Jotai atoms, enabling automatic re-rendering when state changes.

## Commands

```bash
bun run dev          # Start Vite dev server for @mathlib/core
bun run build        # TypeScript check + Vite build for @mathlib/core
bun run lint         # ESLint across all workspaces
```

No test framework is configured.

## Monorepo Structure

Bun workspaces with two packages:
- `packages/mathlib` — Core library (`@mathlib/core`)
- `packages/docs` — Documentation site (Next.js + Fumadocs, static export)

## Architecture

### Core Abstractions (`packages/mathlib/src/core/`)

**Scene3D** (`scene3d.ts`) — Central state container. Owns a Jotai store, manages all items, provides `scene.create(kind, options)` factory API and `scene.atom()` for creating reactive atoms. Triggers invalidation on changes.

**View3D** (`view3d.ts`) — Rendering orchestrator. Manages Three.js renderer/camera/OrbitControls, runs a reconciliation algorithm (React-like diffing of item snapshots), and handles the interaction system (drag/click/hover via raycasting).

**BaseItem** (`item.ts`) — Abstract base class for all scene items. Each item has reactive atom fields, dirty-checking, event handlers, and lifecycle management. Items must be registered in the item registry.

**BoundAtom** (`atom-wrapper.ts`) — Wrapper around Jotai atoms with `.get()`, `.set()`, `.sub()` bound to the scene's store. The `AtomLikeOptions` type allows API consumers to pass plain values or atoms for any field.

### Item ↔ Renderer Pattern

Each item type has two files:
- `items/<kind>.ts` — Data model (fields, options, snapshot generation)
- `renderers/<kind>.ts` — Three.js rendering (create/update/dispose lifecycle)

Renderers never access items directly; they receive immutable **snapshots** (`ItemSnapshot<K>`). The renderer contract is `create()`, `update()`, `dispose()`.

Current item types: `point3d`, `line3d`, `parametricfunction3d`, `sphere3d`, `axes3d`, `grid3d`, `camera3d` (camera is data-only, no renderer file).

### Adding a New Item Type

1. Create `items/<kind>.ts` with fields, options, and class extending `BaseItem`
2. Create `renderers/<kind>.ts` implementing the renderer contract
3. Register in `common-types/item-registry.ts` (add to `ItemKind` union, `ItemFieldsMap`, `itemFactory`, and `ItemInstance` conditional type)
4. Register renderer in `renderers/index.ts`

### Key Patterns

- **Reactive atoms**: All item fields are atoms. Changes mark the item dirty and trigger scene invalidation.
- **Snapshot reconciliation**: View3D diffs old vs new snapshots to determine creates/updates/removes.
- **Drag constraints**: Points support axis/plane-constrained dragging (x/y/z/xy/xz/yz/xyz/none) via ray-plane and ray-axis intersection math.
- **Event system**: Items support `on('drag'|'click'|'hover', handler)` with typed event objects including ray info.

## TypeScript

Strict mode with `noUnusedLocals` and `noUnusedParameters` enabled. React Compiler (babel-plugin-react-compiler) is active via Vite.
