"use client";

import { vec2, vec3 } from "uzay";
import { Scene3DView, useAtomState } from "uzay/react";
import { DemoFrame } from "./demo-frame";
import { overlayStyles } from "./theme";
import { useDemoScene3D } from "./use-demo-scene";

// A (2,3) torus knot: t winds twice around the torus while bobbing three
// times through it, closing into a knot at t = 2π. One parameter, a genuinely
// three-dimensional path: exactly what the page is about.
function knot(t: number) {
  const r = 2.2 + Math.cos(3 * t);
  return vec3(r * Math.cos(2 * t), Math.sin(3 * t), r * Math.sin(2 * t));
}

const T_MAX = Math.PI * 2;

export default function ParametricDemo() {
  const { scene, camera, tEndAtom } = useDemoScene3D((scene, t) => {
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

    // The slider scrubs the end of the parameter range, so the knot draws
    // itself as t grows.
    const tEndAtom = scene.atom(4.4);

    // Faint preview of the full path, so the drawn part reads as progress
    // along a road that is already defined by f.
    scene.create("parametricfunction3d", {
      f: knot,
      tStart: 0,
      tEnd: T_MAX,
      samples: 300,
      color: t.pick({ light: "#d4d4d8", dark: "#3f3f46" }),
      thickness: 0.6,
      pointerEvents: "none",
    });

    // The star: the drawn portion of the curve. samples is derived from tEnd,
    // so the curve keeps a steady sampling density while it grows.
    scene.create("parametricfunction3d", {
      f: knot,
      tStart: 0,
      tEnd: tEndAtom,
      samples: scene.atom((get) => Math.max(16, Math.round(get(tEndAtom) * 48))),
      color: t("primary"),
      thickness: 1.4,
      pointerEvents: "none",
    });

    // The pen tip: a point pinned to f(tEnd), with the coordinates it maps to.
    const tipCoords = scene.atom((get) => knot(get(tEndAtom)));

    scene.create("point3d", {
      coords: tipCoords,
      color: t("accent"),
      radius: 2.5,
      pointerEvents: "none",
    });

    scene.create("overlay3d", {
      position: tipCoords,
      content: scene.atom((get) => {
        const { x, y, z } = get(tipCoords);
        return `(${x.toFixed(1)},\\ ${y.toFixed(1)},\\ ${z.toFixed(1)})`;
      }),
      format: "latex",
      anchor: "bottom-left",
      offset: vec2(10, -12),
      className: overlayStyles.label,
    });

    return { camera, tEndAtom };
  });

  const [tEnd, setTEnd] = useAtomState(tEndAtom);

  return (
    <DemoFrame
      hint="Scrub the slider, the knot draws itself"
      sourceFile="parametric-demo.tsx"
      controls={
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0.05}
            max={T_MAX}
            step={0.01}
            value={tEnd}
            onChange={(event) => setTEnd(parseFloat(event.target.value))}
            className="w-full accent-fd-primary"
            aria-label="Scrub the parameter range of the curve"
          />
          <span className="w-16 shrink-0 text-right text-xs text-fd-muted-foreground tabular-nums">
            t = {tEnd.toFixed(2)}
          </span>
        </div>
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
