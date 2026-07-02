"use client";

import { functionPoint2D, vec2 } from "uzay";
import { Scene2DView } from "uzay/react";
import { DemoFrame } from "./demo-frame";
import { overlayStyles } from "./theme";
import { useDemoScene2D } from "./use-demo-scene";

// An ordinary function graph, the everyday 2D case functionPoint2D is for. The
// same f drives the drawn curve and the handle riding it.
function f(x: number) {
  return Math.sin(x);
}

export default function FunctionPoint2DDemo() {
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

    // domain "infinite" refills the curve across the viewport, so the handle has
    // graph to ride however far it is dragged.
    scene.create("function2d", {
      f,
      domain: "infinite",
      color: t("primary"),
      thickness: 2.5,
      pointerEvents: "none",
    });

    // The construction: a point pinned to the graph of f, dragged with the same
    // function that drew the curve. No bounds, so it slides anywhere along it.
    const p = functionPoint2D(scene, {
      f,
      x: 1,
      color: t("accent"),
    });
    p.point.radius.set(6);

    // The payload is the x atom; read it and f(x) live next to the point.
    scene.create("overlay2d", {
      position: p.point.coords,
      content: scene.atom((get) => {
        const x = get(p.x);
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
      hint="Drag the point along the curve"
      sourceFile="function-point-2d-demo.tsx"
    >
      <Scene2DView
        scene={scene}
        camera={camera}
        style={{ width: "100%", height: "100%" }}
      />
    </DemoFrame>
  );
}
