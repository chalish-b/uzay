"use client";

import { vec2, Vec2 } from "uzay";
import { Scene2DView } from "uzay/react";
import { DemoFrame } from "./demo-frame";
import { overlayStyles } from "./theme";
import { useDemoScene2D } from "./use-demo-scene";

export default function Lines2DDemo() {
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

    // Two draggable endpoints. The line is the star, so the handles are kept
    // small and the segment between them carries the primary color.
    const p1 = scene.create("point2d", {
      coords: vec2(-3, -1),
      color: t("accent"),
      radius: 6,
    });

    const p2 = scene.create("point2d", {
      coords: vec2(3, 2),
      color: t("accent"),
      radius: 6,
    });

    // Endpoint atoms passed straight in, so the segment tracks both drags.
    scene.create("line2d", {
      start: p1.coords,
      end: p2.coords,
      color: t("primary"),
      thickness: 2.5,
    });

    // Length readout pinned to the segment's midpoint, recomputed live.
    const midpoint = scene.atom((get) =>
      Vec2.scaled(Vec2.add(get(p1.coords), get(p2.coords)), 0.5),
    );

    scene.create("overlay2d", {
      position: midpoint,
      content: scene.atom((get) => {
        const length = Vec2.length(Vec2.subtract(get(p2.coords), get(p1.coords)));
        return `d = ${length.toFixed(2)}`;
      }),
      format: "latex",
      anchor: "bottom-left",
      offset: vec2(8, -8),
      className: `${overlayStyles.boardLabel} text-sm text-fd-foreground`,
    });

    return { camera };
  });

  return (
    <DemoFrame
      hint="Drag either endpoint, the segment and length follow"
      sourceFile="lines-2d-demo.tsx"
    >
      <Scene2DView
        scene={scene}
        camera={camera}
        style={{ width: "100%", height: "100%" }}
      />
    </DemoFrame>
  );
}
