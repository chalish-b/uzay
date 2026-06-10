"use client";

import { vec2, vec3, Vec3 } from "uzay";
import { Scene3DView } from "uzay/react";
import { DemoFrame } from "./demo-frame";
import { overlayStyles } from "./theme";
import { useDemoScene3D } from "./use-demo-scene";

export default function LinesDemo() {
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

    // Two draggable endpoints. The line is the star, so the handles are kept
    // small and the segment between them carries the primary color.
    const p1 = scene.create("point3d", {
      coords: vec3(-3, -1, 1),
      color: t("accent"),
      radius: 2.5,
    });

    const p2 = scene.create("point3d", {
      coords: vec3(3, 2, -1),
      color: t("accent"),
      radius: 2.5,
    });

    // Endpoint atoms passed straight in, so the segment tracks both drags.
    scene.create("line3d", {
      start: p1.coords,
      end: p2.coords,
      color: t("primary"),
      thickness: 1.2,
    });

    // Length readout pinned to the segment's midpoint, recomputed live.
    const midpoint = scene.atom((get) =>
      Vec3.scaled(Vec3.add(get(p1.coords), get(p2.coords)), 0.5),
    );

    scene.create("overlay3d", {
      position: midpoint,
      content: scene.atom((get) => {
        const length = Vec3.length(Vec3.subtract(get(p2.coords), get(p1.coords)));
        return `d = ${length.toFixed(2)}`;
      }),
      format: "latex",
      className: overlayStyles.label,
    });

    return { camera };
  });

  return (
    <DemoFrame
      hint="Drag either endpoint, the segment and length follow"
      sourceFile="lines-demo.tsx"
    >
      <Scene3DView
        scene={scene}
        camera={camera}
        style={{ width: "100%", height: "100%" }}
      />
    </DemoFrame>
  );
}
