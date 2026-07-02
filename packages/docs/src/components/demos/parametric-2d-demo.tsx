"use client";

import { vec2 } from "uzay";
import { Scene2DView, useAtomState } from "uzay/react";
import { DemoFrame } from "./demo-frame";
import { Tex } from "../tex";
import { overlayStyles } from "./theme";
import { useDemoScene2D } from "./use-demo-scene";

// A Lissajous figure x = sin(k t), y = sin((k+1) t). k is the reactive knob:
// f is rebuilt whenever k changes, so the whole woven shape reshapes live.
// Integer k closes the curve into a classic Lissajous; in between it morphs
// continuously through the family.
function lissajous(k: number) {
  return (t: number) => vec2(Math.sin(k * t), Math.sin((k + 1) * t));
}

const K_MIN = 1;
const K_MAX = 5;

export default function Parametric2DDemo() {
  const { scene, camera, kAtom } = useDemoScene2D((scene, t) => {
    const camera = scene.create("camera2d", {
      center: vec2(0, 0),
      zoom: 3,
    });

    scene.create("grid2d", {
      rangeX: true,
      rangeY: true,
      gap: "auto",
      color: t("grid"),
      opacity: t("gridOpacity"),
    });

    scene.create("axes2d", {
      x: true,
      y: true,
      color: t("axes"),
      thickness: 1.1,
      tickmarks: true,
      tickStep: "auto",
      labels: true,
      labelClassName: "text-xs text-fd-muted-foreground",
      arrows: true,
    });

    // The slider drives k; reading it inside the f atom rebuilds the function,
    // so the curve is redrawn for the new frequency on every change.
    const kAtom = scene.atom(3);

    scene.create("parametricfunction2d", {
      f: scene.atom((get) => lissajous(get(kAtom))),
      tStart: 0,
      tEnd: Math.PI * 2,
      color: t("primary"),
      thickness: 2.5,
      pointerEvents: "none",
    });

    return { camera, kAtom };
  });

  const [k, setK] = useAtomState(kAtom);

  return (
    <DemoFrame
      hint="Drag the slider, the curve reshapes as k changes"
      sourceFile="parametric-2d-demo.tsx"
      controls={
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={K_MIN}
            max={K_MAX}
            step={0.01}
            value={k}
            onChange={(event) => setK(parseFloat(event.target.value))}
            className="w-full accent-fd-primary"
            aria-label="Frequency of the Lissajous curve"
          />
          <span className="w-16 shrink-0 text-right text-xs text-fd-muted-foreground tabular-nums">
            k = {k.toFixed(2)}
          </span>
        </div>
      }
    >
      <Scene2DView
        scene={scene}
        camera={camera}
        style={{ width: "100%", height: "100%" }}
      />
      {/* Pinned to the corner so it stays put through pan and zoom, with k
          substituted in so the reactive part reads at a glance. */}
      <Tex
        display
        tex={String.raw`\begin{aligned} x &= \sin(${k.toFixed(2)}\,t) \\ y &= \sin(${(k + 1).toFixed(2)}\,t) \end{aligned}`}
        className={`absolute left-3 top-3 text-sm text-fd-foreground [&_.katex-display]:my-0! ${overlayStyles.boardLabel}`}
      />
    </DemoFrame>
  );
}
