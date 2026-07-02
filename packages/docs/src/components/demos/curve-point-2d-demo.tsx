"use client";

import { curvePoint2D, vec2 } from "uzay";
import { Scene2DView } from "uzay/react";
import { DemoFrame } from "./demo-frame";
import { overlayStyles } from "./theme";
import { useDemoScene2D } from "./use-demo-scene";

// A limaçon r = 1 + 2cos(t): a closed curve with an inner loop, the kind of
// shape only a parametric curve can draw. The same curve drives the graph and
// the constrained point.
function f(t: number) {
  const r = 1 + 2 * Math.cos(t);
  return vec2(r * Math.cos(t), r * Math.sin(t));
}

const T_START = 0;
const T_END = Math.PI * 2;

export default function CurvePoint2DDemo() {
  const { scene, camera } = useDemoScene2D((scene, t) => {
    const camera = scene.create("camera2d", {
      center: vec2(1.2, 0),
      zoom: 2.2,
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

    scene.create("parametricfunction2d", {
      f,
      tStart: T_START,
      tEnd: T_END,
      color: t("primary"),
      thickness: 2.5,
      pointerEvents: "none",
    });

    // The construction: a point pinned to the curve. Dragging it only ever
    // moves t, so the point snaps to the nearest spot on the curve.
    const p = curvePoint2D(scene, {
      f,
      tStart: T_START,
      tEnd: T_END,
      t: 1,
      color: t("accent"),
    });
    p.point.radius.set(6);

    // The construction's payload is the t atom; show it live next to the point.
    scene.create("overlay2d", {
      position: p.point.coords,
      content: scene.atom((get) => `t = ${get(p.t).toFixed(2)}`),
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
      sourceFile="curve-point-2d-demo.tsx"
    >
      <Scene2DView
        scene={scene}
        camera={camera}
        style={{ width: "100%", height: "100%" }}
      />
    </DemoFrame>
  );
}
