"use client";

import { vec2 } from "uzay";
import { Scene2DView, useAtomState } from "uzay/react";
import { DemoFrame } from "./demo-frame";
import { useDemoScene2D } from "./use-demo-scene";

const R_MIN = 0.5;
const R_MAX = 4;

export default function Circle2DDemo() {
  const { scene, camera, radiusAtom } = useDemoScene2D((scene, t) => {
    const camera = scene.create("camera2d", { center: vec2(0, 0), zoom: 1.6 });

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

    // The center rides a draggable handle: passing its coords as the circle's
    // `center` binds the two, so dragging the dot moves the whole circle.
    const handle = scene.create("point2d", {
      coords: vec2(0, 0),
      color: t("accent"),
      radius: 7,
    });

    // The slider drives the radius atom, so the circle resizes live.
    const radiusAtom = scene.atom(2);

    scene.create("circle2d", {
      center: handle.coords,
      radius: radiusAtom,
      color: t("primary"),
      opacity: 0.1,
      strokeColor: t("primary"),
      strokeOpacity: 1,
      strokeThickness: 2.5,
    });

    return { camera, radiusAtom };
  });

  const [radius, setRadius] = useAtomState(radiusAtom);

  return (
    <DemoFrame
      hint="Drag the center, slide for the radius"
      sourceFile="circle-2d-demo.tsx"
      controls={
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={R_MIN}
            max={R_MAX}
            step={0.01}
            value={radius}
            onChange={(event) => setRadius(parseFloat(event.target.value))}
            className="w-full accent-fd-primary"
            aria-label="Circle radius"
          />
          <span className="w-16 shrink-0 text-right text-xs text-fd-muted-foreground tabular-nums">
            r = {radius.toFixed(2)}
          </span>
        </div>
      }
    >
      <Scene2DView
        scene={scene}
        camera={camera}
        style={{ width: "100%", height: "100%" }}
      />
    </DemoFrame>
  );
}
