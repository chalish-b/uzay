<!--
  MEDIA TO RECORD (drop files at these exact paths; they're referenced by absolute
  raw.githubusercontent.com URLs so they render on GitHub *and* on npm):

    assets/hero.png / hero.mp4          Hero. ~15-20s, 16:9. The combined showcase scene
                                        (drag a point, watch the curve + overlay update) or the
                                        tangent-line demo. For an autoplaying video, drag-drop the
                                        .mp4 into this README in GitHub's web editor (that produces a
                                        github.com/user-attachments/... URL) and paste it in place of
                                        the poster <img> below. assets/hero.png is the still fallback.
    assets/showcase-surface-normal.gif  3D surface with a normal vector tracking a moving point.
    assets/showcase-function-area.gif   2D area under a curve; drag the bounds.
    assets/showcase-vectors.gif         Dragging a vector's tip; dependents follow.
    assets/showcase-tangent-line.gif    Point sliding along a curve; the tangent updates.
    assets/hello-world.png              Still of the Quick Start scene's result.

  Keep GIFs small (short loop, ~720p, optimized palette):
    ffmpeg -i clip.mov -vf "fps=20,scale=720:-1:flags=lanczos,palettegen" palette.png
    ffmpeg -i clip.mov -i palette.png -lavfi "fps=20,scale=720:-1:flags=lanczos,paletteuse" out.gif
-->

<div align="center">

# Uzay

**Reactive 3D &amp; 2D math visualizations for the web.**

[![npm](https://img.shields.io/npm/v/uzay.svg)](https://www.npmjs.com/package/uzay)
[![license](https://img.shields.io/npm/l/uzay.svg)](./LICENSE)
[![docs](https://img.shields.io/badge/docs-uzay.chalish.dev-3b82f6)](https://uzay.chalish.dev)

<!-- HERO: for an autoplaying video, drag-drop hero.mp4 into this README via GitHub's web
     editor and swap the URL below. The committed poster at assets/hero.png is the fallback. -->
<!-- <img src="https://raw.githubusercontent.com/chalish-b/uzay/master/assets/hero.png" alt="Uzay showcase" width="820" /> -->

</div>

Uzay (pronounced *oo-zai*, Turkish for *space*) is a TypeScript library for building interactive math figures, the kind you'd make in GeoGebra or Desmos, but as a composable, code-based part of your own app. Every value is a reactive atom: drag a point and the line, the label, and everything else derived from it update on their own. Inspired by Manim, scenes are defined in code, except they run live in the browser instead of being rendered to video.

<!-- <table> -->
<!--   <tr> -->
<!--     <td width="50%" align="center"> -->
<!--       <a href="https://uzay.chalish.dev/docs/constructions/surface-normal"> -->
<!--         <img src="https://raw.githubusercontent.com/chalish-b/uzay/master/assets/showcase-surface-normal.gif" alt="Surface normal tracking a point on a 3D surface" /> -->
<!--       </a> -->
<!--       <br /><sub><b>Surface normal</b>: a normal vector that tracks a point as it moves across a 3D surface.</sub> -->
<!--     </td> -->
<!--     <td width="50%" align="center"> -->
<!--       <a href="https://uzay.chalish.dev/docs/constructions/function-area-2d"> -->
<!--         <img src="https://raw.githubusercontent.com/chalish-b/uzay/master/assets/showcase-function-area.gif" alt="Area under a 2D curve, with draggable bounds" /> -->
<!--       </a> -->
<!--       <br /><sub><b>Area under a curve</b>: drag the bounds and the shaded region and its value recompute live.</sub> -->
<!--     </td> -->
<!--   </tr> -->
<!--   <tr> -->
<!--     <td width="50%" align="center"> -->
<!--       <a href="https://uzay.chalish.dev/docs/3d-items/vectors"> -->
<!--         <img src="https://raw.githubusercontent.com/chalish-b/uzay/master/assets/showcase-vectors.gif" alt="Dragging the tip of a 3D vector" /> -->
<!--       </a> -->
<!--       <br /><sub><b>Draggable vectors</b>: grab a vector's tip and anything derived from it follows.</sub> -->
<!--     </td> -->
<!--     <td width="50%" align="center"> -->
<!--       <a href="https://uzay.chalish.dev/docs/constructions/tangent-line"> -->
<!--         <img src="https://raw.githubusercontent.com/chalish-b/uzay/master/assets/showcase-tangent-line.gif" alt="Tangent line following a point along a curve" /> -->
<!--       </a> -->
<!--       <br /><sub><b>Tangent line</b>: slide a point along a curve and the tangent updates with it.</sub> -->
<!--     </td> -->
<!--   </tr> -->
<!-- </table> -->
<!--  -->
<!-- <sub>Each clip links to its live, interactive version in the docs.</sub> -->

## Installation

```bash
npm install uzay
# or
pnpm add uzay
# or
bun add uzay
```

**Requirements.** Uzay relies on React 19, Three.js, Jotai, and KaTeX as peer dependencies. npm, pnpm, and bun install these for you automatically; on Yarn, add them alongside `uzay`. If you use LaTeX labels, import the KaTeX stylesheet once in your app: `import "katex/dist/katex.min.css"`. See [Getting Started](https://uzay.chalish.dev/docs/getting-started) for details.

## Quick start

A scene with a camera, axes, a point, and a line that tracks the point:

```typescript
import { Scene3D, View3D, vec3 } from "uzay";

const scene = new Scene3D();

const camera = scene.create("camera3d", {
  position: vec3(5, 5, 5),
  lookAt: vec3(0, 0, 0),
});

scene.create("axes3d", { x: [-5, 5], y: [-5, 5], z: [-5, 5] });

const point = scene.create("point3d", {
  coords: vec3(2, 1, 0),
  color: "crimson",
  radius: 3,
});

// Passing point.coords as the endpoint makes the line track the point reactively.
scene.create("line3d", {
  start: vec3(0, 0, 0),
  end: point.coords,
  color: "crimson",
});

const container = document.getElementById("container")!;
const view = new View3D(scene, camera.id, container);
```

<!-- <div align="center"> -->
<!--   <img src="https://raw.githubusercontent.com/chalish-b/uzay/master/assets/hello-world.png" alt="The Quick Start scene" width="560" /> -->
<!-- </div> -->

Orbit by dragging the background, and the point is draggable. Drag it and the line follows. That is reactivity in Uzay: change an atom and everything derived from it updates.

### React

Scene construction is identical to vanilla. The only React-specific parts are `Scene3DView`, which mounts the scene, and `useAtomState`, which bridges a scene atom to a React control. The drag and the slider update the same atom:

```tsx
import { useMemo } from "react";
import { Scene3D, vec3 } from "uzay";
import { Scene3DView, useAtomState } from "uzay/react";

function createScene() {
  const scene = new Scene3D();

  const radius = scene.atom(2);

  const camera = scene.create("camera3d", {
    position: vec3(5, 5, 5),
    lookAt: vec3(0, 0, 0),
  });

  scene.create("axes3d", { x: [-5, 5], y: [-5, 5], z: [-5, 5] });
  scene.create("point3d", {
    coords: vec3(0, 0, 0),
    color: "cyan",
    radius,
    draggable: "xyz",
  });

  return { scene, camera, radius };
}

export function App() {
  const { scene, camera, radius } = useMemo(() => createScene(), []);
  const [r, setR] = useAtomState(radius);

  return (
    <div>
      <Scene3DView scene={scene} camera={camera} style={{ width: "100%", height: 400 }} />
      <input
        type="range"
        min="1"
        max="10"
        step="0.5"
        value={r}
        onChange={(e) => setR(parseFloat(e.target.value))}
      />
    </div>
  );
}
```

## Features

- **Reactive atoms**: every property is a Jotai atom. Update one and everything that depends on it re-renders automatically.
- **3D and 2D**: points, lines, vectors, surfaces, planes, spheres, and parametric curves in 3D, plus functions, regions, and area-under-curve in 2D.
- **Interactive by default**: points and vectors are draggable out of the box, with built-in drag, click, and hover events.
- **Composable constructions**: higher-level objects like tangent lines and points constrained to a surface are plain functions. Combine the built-ins or write your own.
- **Framework-agnostic**: the same imperative API in vanilla JS or React. The thin `uzay/react` layer handles mounting and UI binding.
- **TypeScript-first**: full type safety and autocomplete throughout.

## Documentation

Full docs live at **[uzay.chalish.dev](https://uzay.chalish.dev)**.

- [Getting Started](https://uzay.chalish.dev/docs/getting-started): installation and your first scene.
- [Core Concepts](https://uzay.chalish.dev/docs/core-concepts): scenes, views, atoms, and interactions.
- [3D Items](https://uzay.chalish.dev/docs/3d-items): points, lines, vectors, surfaces, and more.
- [2D Items](https://uzay.chalish.dev/docs/2d-items): points, functions, regions, and more.
- [Constructions](https://uzay.chalish.dev/docs/constructions): composable higher-level objects.
- [React Usage](https://uzay.chalish.dev/docs/react-usage): mounting scenes and wiring up UI.

## Status

> [!WARNING]
> Uzay is in early development. The API is unstable, features may be incomplete, and breaking changes can land at any time. It is great for experimentation and prototyping, but pin your version.

## Development

This is a Bun-workspaces monorepo:

- `packages/uzay`: the published library.
- `packages/playground`: development playground and demos.
- `packages/docs`: documentation site (powers [uzay.chalish.dev](https://uzay.chalish.dev)).

```bash
bun install      # install all workspaces
bun run dev      # start the playground (Vite)
bun run build    # build the library
```

Run the docs site with `bun run dev` inside `packages/docs`.

## License

MIT © chalish. See [LICENSE](./LICENSE).
