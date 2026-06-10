"use client";

import { vec2, vec3, Vec3 } from "uzay";
import { Scene3DView } from "uzay/react";
import { DemoFrame } from "./demo-frame";
import { overlayStyles } from "./theme";
import { useDemoScene3D } from "./use-demo-scene";

export default function VectorsDemo() {
  const { scene, camera } = useDemoScene3D((scene, t) => {
    const camera = scene.create("camera3d", {
      position: vec3(6, 5, 9),
      lookAt: vec3(0, 1.2, 0),
      fov: 42,
    });

    // Grid sits at the origin's level, so it reads as the floor the vector
    // stands on and the horizontal component lies flat against.
    scene.create("grid3d", {
      plane: "xz",
      range1: [-5, 5],
      range2: [-5, 5],
      offset: 0,
      gap: 1,
      color: t("grid"),
      opacity: t("gridOpacity"),
      pointerEvents: "none",
    });

    // Only the +Y half is shown, the vector rises up out of the floor.
    scene.create("axes3d", {
      x: [-4, 4],
      y: [0, 4],
      z: [-4, 4],
      color: t("axes"),
      thickness: 0.6,
      pointerEvents: "none",
    });

    // The star: a vector whose tip is draggable. No point handle on the tip,
    // the vector's own drag does the work.
    const v = scene.create("vector3d", {
      origin: vec3(0, 0, 0),
      vector: vec3(3, 3, -2),
      color: t("accent"),
      thickness: 1,
    });

    // A derived vector: the horizontal (xz) component, lying flat on the floor
    // grid like a shadow. Its direction is read-only, so it follows the drag
    // but isn't draggable.
    scene.create("vector3d", {
      origin: vec3(0, 0, 0),
      vector: scene.atom((get) => {
        const { x, z } = get(v.vector);
        return vec3(x, 0, z);
      }),
      color: t("secondary"),
      thickness: 1,
      draggable: "none",
    });

    // Magnitude readout pinned halfway along the shaft.
    scene.create("overlay3d", {
      position: scene.atom((get) => Vec3.scaled(get(v.vector), 0.5)),
      content: scene.atom((get) => {
        const length = Vec3.length(get(v.vector));
        return `\\lvert v \\rvert = ${length.toFixed(2)}`;
      }),
      format: "latex",
      className: overlayStyles.label,
    });

    return { camera };
  });

  return (
    <DemoFrame
      hint="Drag the arrow tip, the teal floor shadow follows"
      sourceFile="vectors-demo.tsx"
    >
      <Scene3DView
        scene={scene}
        camera={camera}
        style={{ width: "100%", height: "100%" }}
      />
    </DemoFrame>
  );
}
