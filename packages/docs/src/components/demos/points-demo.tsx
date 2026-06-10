"use client";

import { vec2, vec3 } from "uzay";
import { Scene3DView } from "uzay/react";
import { DemoFrame } from "./demo-frame";
import { overlayStyles } from "./theme";
import { useDemoScene3D } from "./use-demo-scene";

export default function PointsDemo() {
  const { scene, camera } = useDemoScene3D((scene, t) => {
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

    // The star of the page: a freely draggable point with a coordinate label.
    const point = scene.create("point3d", {
      coords: vec3(2, 1, 0),
      color: t("accent"),
      radius: 3,
    });

    scene.create("overlay3d", {
      position: point.coords,
      content: scene.atom((get) => {
        const { x, y, z } = get(point.coords);
        return `(${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`;
      }),
      anchor: "bottom-left",
      offset: vec2(10, -12),
      className: overlayStyles.label,
    });

    // A derived point: always mirrors the accent one across the origin. Its
    // coords are a read-only atom, so it is not draggable itself.
    scene.create("point3d", {
      coords: scene.atom((get) => {
        const { x, y, z } = get(point.coords);
        return vec3(-x, -y, -z);
      }),
      color: t("secondary"),
      radius: 2,
    });

    return { camera };
  });

  return (
    <DemoFrame
      hint="Drag the pink point, the teal one mirrors it"
      sourceFile="points-demo.tsx"
    >
      <Scene3DView
        scene={scene}
        camera={camera}
        style={{ width: "100%", height: "100%" }}
      />
    </DemoFrame>
  );
}
