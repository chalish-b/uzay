## Project Overview

Reactive 3D mathematical visualization library built with TypeScript, React, Three.js, and Jotai. All item properties are Jotai atoms, enabling automatic re-rendering when state changes.

## Monorepo Structure

Bun workspaces with three packages:

- `packages/uzay` — Core library (`uzay`), published to npm
- `packages/playground` — Development playground with demos (`uzay-playground`, private)
- `packages/docs` — Documentation site (Next.js + Fumadocs, static export)

## Other notes

- After implementing a feature, if it's testable in a demo, edit demo1.tsx (sandbox demo in `packages/playground/src/demos/`) to create a test scenario for it, to see whether all features work. You can tear down the existing demo1.tsx, make it a demo where we can test all the different features and edge cases of a newly implemented feature.
- After finishing a documentation or write up, do another pass to replace all instances of em dashes with something more natural (commas, colons, or just restructure the sentence to flow better). No em dashes.
