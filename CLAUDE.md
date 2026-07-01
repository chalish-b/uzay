## Project Overview

Reactive 3D mathematical visualization library built with TypeScript, React, Three.js, and Jotai. All item properties are Jotai atoms, enabling automatic re-rendering when state changes.

2D scenes render through one of two swappable backends, selected per view via `{ renderer: "threejs" | "svg" }` (default threejs). The scene/item layer is renderer-agnostic; backend implementations live in `packages/uzay/src/core/2d/backends/{three,svg}/`, behind the `ViewBackend2D` seam in `core/2d/backend.ts`. Pure geometry/tick/sampling math shared by both backends lives in `core/2d/math/`. When adding or changing a 2D item, implement/update its renderer in BOTH backends and keep them visually equivalent (the playground Sandbox demo, `demo1.tsx`, is the side-by-side check for this).

## Monorepo Structure

Bun workspaces with three packages:

- `packages/uzay` — Core library (`uzay`), published to npm
- `packages/playground` — Development playground with demos (`uzay-playground`, private)
- `packages/docs` — Documentation site (Next.js + Fumadocs, static export)

## Docs demos

Item and construction pages in `packages/docs` open with an interactive demo. Before writing or editing one, read `packages/docs/DEMOS.md`: it covers the demo component recipe, the docs-side theming system (`useDemoScene`, the `t()` token helper, `overlayStyles`), and the content guidelines. The reference implementation is `src/components/demos/points-demo.tsx`.

## Other notes

- After implementing a feature, if it's testable in a demo, edit demo1.tsx (sandbox demo in `packages/playground/src/demos/`) to create a test scenario for it, to see whether all features work. You can tear down the existing demo1.tsx, make it a demo where we can test all the different features and edge cases of a newly implemented feature.
- After finishing a documentation or write up, do another pass to replace all instances of em dashes with something more natural (commas, colons, or just restructure the sentence to flow better). No em dashes.
