"use client";

import { vec2 } from "uzay";
import { Scene2DView } from "uzay/react";
import { DemoFrame } from "./demo-frame";
import { overlayStyles } from "./theme";
import { useDemoScene2D } from "./use-demo-scene";

export default function Vectors2DDemo() {
  const { scene, camera } = useDemoScene2D((scene, t) => {
    const camera = scene.create("camera2d", {
      center: vec2(1, 1),
      zoom: 1.2,
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

    // Two draggable vectors chained tip to tail. b's origin IS a's vector atom
    // (a starts at the origin, so a.vector is also a's tip), so dragging a
    // carries the whole chain along. No drag handlers, just shared atoms.
    const a = scene.create("vector2d", {
      origin: vec2(0, 0),
      vector: vec2(3, 0.5),
      color: t("accent"),
      thickness: 2,
    });

    const b = scene.create("vector2d", {
      origin: a.vector,
      vector: vec2(-1, 2.5),
      color: t("accent"),
      thickness: 2,
    });

    // The payoff: the resultant a + b, drawn from the origin straight to the
    // end of the chain. Derived, so it follows every drag but isn't draggable.
    const sum = scene.atom((get) => get(a.vector).add(get(b.vector)));

    scene.create("vector2d", {
      origin: vec2(0, 0),
      vector: sum,
      color: t("primary"),
      thickness: 2,
      draggable: "none",
    });

    // A faint copy of b drawn from the origin: same vector, different origin,
    // since vectors are position-independent. It also opens the parallelogram
    // that the line below closes (its missing edge is a translated copy of a).
    scene.create("vector2d", {
      origin: vec2(0, 0),
      vector: b.vector,
      color: t("neutral"),
      thickness: 1.2,
      draggable: "none",
      pointerEvents: "none",
    });

    scene.create("line2d", {
      start: b.vector,
      end: sum,
      color: t("neutral"),
      thickness: 1.2,
      opacity: 0.5,
      pointerEvents: "none",
    });

    // Name tags at each arrow's midpoint, so the scene reads as the equation.
    scene.create("overlay2d", {
      position: scene.atom((get) => get(a.vector).scale(0.5)),
      content: "\\vec{a}",
      format: "latex",
      className: `${overlayStyles.boardLabel} text-sm text-fd-foreground`,
    });

    scene.create("overlay2d", {
      position: scene.atom((get) =>
        get(a.vector).add(get(b.vector).scale(0.5)),
      ),
      content: "\\vec{b}",
      format: "latex",
      className: `${overlayStyles.boardLabel} text-sm text-fd-foreground`,
    });

    scene.create("overlay2d", {
      position: scene.atom((get) => get(sum).scale(0.5)),
      content: "\\vec{a} + \\vec{b}",
      format: "latex",
      className: `${overlayStyles.boardLabel} text-sm text-fd-foreground`,
    });

    return { camera };
  });

  return (
    <DemoFrame
      hint="Drag either pink arrow, the indigo sum follows"
      sourceFile="vectors-2d-demo.tsx"
    >
      <Scene2DView
        scene={scene}
        camera={camera}
        style={{ width: "100%", height: "100%" }}
      />
    </DemoFrame>
  );
}
