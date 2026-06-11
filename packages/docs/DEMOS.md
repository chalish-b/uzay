# Writing interactive demos for the docs

Every item and construction page opens with one interactive demo: the intro paragraph says what the thing is, the demo immediately shows it. This doc explains the system. The live reference implementation is `src/components/demos/points-demo.tsx`, embedded in `content/docs/items/points.mdx`.

## The shape of a demo

One client component per page, in `src/components/demos/<topic>-demo.tsx`:

```tsx
"use client";

import { vec3 } from "uzay";
import { Scene3DView } from "uzay/react";
import { DemoFrame } from "./demo-frame";
import { overlayStyles } from "./theme";
import { useDemoScene3D } from "./use-demo-scene";

export default function SpheresDemo() {
  const { scene, camera } = useDemoScene3D((scene, t) => {
    const camera = scene.create("camera3d", { ... });
    scene.create("sphere3d", { color: t("primary"), ... });
    return { camera };
  });

  return (
    <DemoFrame hint="Drag the sphere" sourceFile="spheres-demo.tsx">
      <Scene3DView scene={scene} camera={camera} style={{ width: "100%", height: "100%" }} />
    </DemoFrame>
  );
}
```

`sourceFile` is the demo's own file name. It renders a quiet "Source" link in the corner of the canvas pointing at the file on GitHub (master branch), so curious readers can see how the demo is built. Always pass it, and keep it in sync if a demo file is ever renamed.

Then in the page's `.mdx`, right after the intro paragraph or bullet list:

```mdx
import SpheresDemo from "@/components/demos/spheres-demo";

<SpheresDemo />

One short sentence explaining what to look at and which property drives what.
```

`useDemoScene2D` works identically for 2D pages.

## Theming: the one rule

**If it renders to canvas, use `t()`. If it's HTML, use CSS.**

- Canvas items (points, lines, surfaces, grids, axes) end up in three.js materials. CSS cannot reach them, so their colors come from the token helper: `color: t("accent")`. This returns a derived atom; when the site theme flips, the canvas restyles in place. Never hardcode a color string on a canvas item.
- Overlays (`overlay2d` / `overlay3d`) are real DOM. Theme them with classes, not atoms: use `overlayStyles.label` from `theme.ts`, or plain Tailwind `dark:` variants. The fd-* colors (`bg-fd-popover`, `border-fd-border`, ...) are the site's own theme variables and are preferred over raw palette classes.

The token palette lives in `src/components/demos/theme.ts`. It is deliberately small (primary, secondary, accent, neutral, point, plus grid/axes scaffolding). Pick the role that matches the element's job: `accent` for the draggable handle the user should touch, `primary` for the main curve or object, `secondary` for a derived or contrasting series, `neutral` for projections and helper lines.

- Need a one-off color that no token covers? Use the escape hatch: `t.pick({ light: "#...", dark: "#..." })`. If the same pair shows up in a second demo, promote it to a token instead.
- Do not add tokens speculatively, and do not add `overlayStyles` variants until a demo actually needs one.

## Mechanics worth knowing

- `useDemoScene*` creates the scene exactly once (`useMemo`) and plants a mode atom in it. A theme flip only writes that atom; the scene, the camera, and any in-progress drag survive. Do not recreate scenes on theme change.
- `DemoFrame` provides the card chrome: fd-background canvas (so it matches the page in both modes), optional `hint` line in the corner, optional `controls` strip below the canvas for sliders (see the landing page's `home-surface-demo.tsx` for a controls example).
- React state binding for readouts and sliders: `useAtomValue` / `useAtomState` from `uzay/react`.
- The library itself has no theming support, by design. All of this is docs-side. Do not add theme concepts to `packages/uzay`.
- You can also use other items like sliders or buttons from the DOM, or display live values in the corner of the frame if you can showcase a more interesting behavior.
- Simple but interesting demos.

## Content guidelines

- One demo per page, at the top, after the intro. Resist adding more mid-page; code blocks carry the rest.
- Showcase the page's item with one or two of its interesting properties, ideally including the reactive angle (a derived atom following a draggable one reads instantly).
- Keep the hint text to one short imperative sentence.
- The caption sentence under the demo in the MDX should name the item kinds involved (`point3d`, `overlay3d`) so the demo connects to the code blocks below it.
