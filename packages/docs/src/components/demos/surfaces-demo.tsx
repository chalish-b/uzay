"use client";

import { vec2, vec3 } from "uzay";
import { Scene3DView, useAtomState } from "uzay/react";
import { DemoFrame } from "./demo-frame";
import { overlayStyles } from "./theme";
import { useDemoScene3D } from "./use-demo-scene";

// Ripples spreading from a movable source. cos (not sin) so the source sits
// on a crest, and the handle point can ride it at a constant height.
const AMPLITUDE = 1.4;
const WAVE_K = 2.4;
const DECAY = 0.25;

function ripple(r: number) {
  return AMPLITUDE * Math.cos(WAVE_K * r) * Math.exp(-DECAY * r);
}

export default function SurfacesDemo() {
  const { scene, camera, wireframeAtom } = useDemoScene3D((scene, t) => {
    const camera = scene.create("camera3d", {
      position: vec3(6, 4.5, 9),
      lookAt: vec3(0, 0, 0),
      fov: 42,
    });

    scene.create("grid3d", {
      plane: "xz",
      range1: [-5, 5],
      range2: [-5, 5],
      offset: -3,
      gap: 1,
      color: t("grid"),
      opacity: t("gridOpacity"),
      pointerEvents: "none",
    });

    scene.create("axes3d", {
      x: [-4, 4],
      y: [-3, 3],
      z: [-4, 4],
      color: t("axes"),
      thickness: 0.6,
      pointerEvents: "none",
    });

    // The wave source: draggable in the xz-plane only, floating at crest
    // height so it always rides the central peak of the ripple.
    const source = scene.create("point3d", {
      coords: vec3(1.5, AMPLITUDE, -1),
      draggable: "xz",
      color: t("accent"),
      radius: 2.5,
    });

    const wireframeAtom = scene.atom(false);

    // The star: the surface's f is a derived atom of the source's coords.
    // Dragging the point swaps in a new (x, z) => y function every frame,
    // and the whole mesh re-evaluates around the new center.
    scene.create("surface3d", {
      f: scene.atom((get) => {
        const { x: cx, z: cz } = get(source.coords);
        return (x: number, z: number) => ripple(Math.hypot(x - cx, z - cz));
      }),
      xRange: [-4.5, 4.5],
      zRange: [-4.5, 4.5],
      samples: 72,
      color: t("primary"),
      wireframe: wireframeAtom,
      pointerEvents: "none",
    });

    // Readout of the two inputs f is centered on.
    scene.create("overlay3d", {
      position: source.coords,
      content: scene.atom((get) => {
        const { x, z } = get(source.coords);
        return `(${x.toFixed(1)},\\ ${z.toFixed(1)})`;
      }),
      format: "latex",
      anchor: "bottom-left",
      offset: vec2(10, -12),
      className: overlayStyles.label,
    });

    return { camera, wireframeAtom };
  });

  const [wireframe, setWireframe] = useAtomState(wireframeAtom);

  return (
    <DemoFrame
      hint="Drag the pink point, the ripples follow it"
      sourceFile="surfaces-demo.tsx"
      controls={
        <label className="flex w-fit items-center gap-2 text-xs text-fd-muted-foreground">
          <input
            type="checkbox"
            checked={wireframe}
            onChange={(event) => setWireframe(event.target.checked)}
            className="accent-fd-primary"
          />
          Wireframe
        </label>
      }
    >
      <Scene3DView
        scene={scene}
        camera={camera}
        style={{ width: "100%", height: "100%" }}
      />
    </DemoFrame>
  );
}
