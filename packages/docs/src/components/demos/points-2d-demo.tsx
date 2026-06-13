"use client";

import { vec2 } from "uzay";
import { Scene2DView } from "uzay/react";
import { DemoFrame } from "./demo-frame";
import { overlayStyles } from "./theme";
import { useDemoScene2D } from "./use-demo-scene";

export default function Points2DDemo() {
  const { scene, camera } = useDemoScene2D((scene, t) => {
    const camera = scene.create("camera2d", {
      center: vec2(0, 0),
      zoom: 1.3,
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

    // The star of the page: a freely draggable point with a coordinate label.
    const point = scene.create("point2d", {
      coords: vec2(2, 1),
      color: t("accent"),
      radius: 7,
    });

    scene.create("overlay2d", {
      position: point.coords,
      content: scene.atom((get) => {
        const { x, y } = get(point.coords);
        return `(${x.toFixed(1)},\\ ${y.toFixed(1)})`;
      }),
      format: "latex",
      anchor: "bottom-left",
      offset: vec2(10, -10),
      className: `${overlayStyles.boardLabel} text-sm text-fd-foreground`,
    });

    // A derived point: always mirrors the accent one across the origin. Its
    // coords are a read-only atom, so it is not draggable itself.
    scene.create("point2d", {
      coords: scene.atom((get) => {
        const { x, y } = get(point.coords);
        return vec2(-x, -y);
      }),
      color: t("secondary"),
      radius: 6,
    });

    return { camera };
  });

  return (
    <DemoFrame
      hint="Drag the pink point, the teal one mirrors it"
      sourceFile="points-2d-demo.tsx"
    >
      <Scene2DView
        scene={scene}
        camera={camera}
        style={{ width: "100%", height: "100%" }}
      />
    </DemoFrame>
  );
}
