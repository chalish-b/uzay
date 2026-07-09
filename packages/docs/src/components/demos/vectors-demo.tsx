"use client";

import { vec3 } from "uzay";
import { Scene3DView } from "uzay/react";
import { DemoFrame } from "./demo-frame";
import { overlayStyles } from "./theme";
import { useDemoScene3D } from "./use-demo-scene";

export default function VectorsDemo() {
  const { scene, camera } = useDemoScene3D((scene, t) => {
    const camera = scene.create("camera3d", {
      position: vec3(6, 4.5, 9),
      lookAt: vec3(0, 0.5, 0),
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

    // Two draggable vectors chained tip to tail. b's origin IS a's vector
    // atom (a starts at the origin, so a.vector is also a's tip), so dragging
    // a carries the whole chain along. No drag handlers, just shared atoms.
    const a = scene.create("vector3d", {
      origin: vec3(0, 0, 0),
      vector: vec3(2.5, 0.5, -1.5),
      color: t("accent"),
      thickness: 1,
    });

    const b = scene.create("vector3d", {
      origin: a.vector,
      vector: vec3(-1, 2, -0.5),
      color: t("accent"),
      thickness: 1,
    });

    // The payoff: the resultant a + b, drawn from the origin straight to the
    // end of the chain. Derived, so it follows every drag but isn't draggable.
    const sum = scene.atom((get) => get(a.vector).add(get(b.vector)));

    scene.create("vector3d", {
      origin: vec3(0, 0, 0),
      vector: sum,
      color: t("primary"),
      thickness: 1,
      draggable: "none",
    });

    // A faint copy of b drawn from the origin: same vector, different origin,
    // since vectors are position-independent. It also opens the parallelogram
    // that the line below closes (its missing edge is a translated copy of a).
    scene.create("vector3d", {
      origin: vec3(0, 0, 0),
      vector: b.vector,
      color: t("neutral"),
      thickness: 0.6,
      draggable: "none",
      pointerEvents: "none",
    });

    scene.create("line3d", {
      start: b.vector,
      end: sum,
      color: t("neutral"),
      thickness: 0.6,
      opacity: 0.5,
      pointerEvents: "none",
    });

    // Name tags at each arrow's midpoint, so the scene reads as the equation.
    scene.create("overlay3d", {
      position: scene.atom((get) => get(a.vector).scale(0.5)),
      content: "\\vec{a}",
      format: "latex",
      className: overlayStyles.label,
    });

    scene.create("overlay3d", {
      position: scene.atom((get) =>
        get(a.vector).add(get(b.vector).scale(0.5)),
      ),
      content: "\\vec{b}",
      format: "latex",
      className: overlayStyles.label,
    });

    scene.create("overlay3d", {
      position: scene.atom((get) => get(sum).scale(0.5)),
      content: "\\vec{a} + \\vec{b}",
      format: "latex",
      className: overlayStyles.label,
    });

    return { camera };
  });

  return (
    <DemoFrame
      hint="Drag either pink arrow, the indigo sum follows"
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
