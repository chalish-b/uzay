"use client";

import { vec2 } from "uzay";
import { Scene2DView } from "uzay/react";
import { DemoFrame } from "./demo-frame";
import { overlayStyles } from "./theme";
import { useDemoScene2D } from "./use-demo-scene";

// A plain JS function is all function2d needs. Sine makes the infinite domain
// obvious: pan sideways and there is always more wave to draw.
function f(x: number) {
  return Math.sin(x);
}

export default function Functions2DDemo() {
  const { scene, camera } = useDemoScene2D((scene, t) => {
    const camera = scene.create("camera2d", {
      center: vec2(0, 0),
      zoom: 2,
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

    // domain "infinite" re-samples across the viewport on every pan and zoom,
    // so the graph always fills the board.
    scene.create("function2d", {
      f,
      domain: "infinite",
      color: t("primary"),
      thickness: 2.5,
      pointerEvents: "none",
    });

    // The input: a handle dragged along the x axis. Its x is the value we feed
    // to f.
    const handleCoords = scene.atom(vec2(2, 0));
    const xAtom = scene.atom((get) => get(handleCoords).x);

    // The output point, pinned to (x, f(x)) on the curve.
    const curveCoords = scene.atom((get) => {
      const x = get(xAtom);
      return vec2(x, f(x));
    });

    // A faint stem from the axis up to the curve, tying input to output.
    scene.create("line2d", {
      start: scene.atom((get) => vec2(get(xAtom), 0)),
      end: curveCoords,
      color: t("neutral"),
      thickness: 1,
      opacity: 0.5,
      pointerEvents: "none",
    });

    scene.create("point2d", {
      coords: handleCoords,
      color: t("accent"),
      radius: 6,
      draggable: "x",
    });

    scene.create("point2d", {
      coords: curveCoords,
      color: t("secondary"),
      radius: 5,
      pointerEvents: "none",
    });

    scene.create("overlay2d", {
      position: curveCoords,
      content: scene.atom((get) => {
        const x = get(xAtom);
        return `f(${x.toFixed(2)}) = ${f(x).toFixed(2)}`;
      }),
      format: "latex",
      anchor: "bottom-left",
      offset: vec2(10, -10),
      className: `${overlayStyles.boardLabel} text-sm text-fd-foreground`,
    });

    return { camera };
  });

  return (
    <DemoFrame
      hint="Drag the handle along the x-axis, or pan to refill the curve"
      sourceFile="functions-2d-demo.tsx"
    >
      <Scene2DView
        scene={scene}
        camera={camera}
        style={{ width: "100%", height: "100%" }}
      />
    </DemoFrame>
  );
}
