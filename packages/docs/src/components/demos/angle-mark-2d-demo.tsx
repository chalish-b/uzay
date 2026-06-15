"use client";

import { vec2, angleMark2D } from "uzay";
import { Scene2DView, useAtomValue } from "uzay/react";
import { DemoFrame } from "./demo-frame";
import { Tex } from "../tex";
import { overlayStyles } from "./theme";
import { useDemoScene2D } from "./use-demo-scene";

const VERTEX = vec2(0, 0);

export default function AngleMark2DDemo() {
  const { scene, camera, measure } = useDemoScene2D((scene, t) => {
    const camera = scene.create("camera2d", { center: vec2(0, 0), zoom: 1.6 });

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

    // Two draggable arms from a fixed vertex.
    const armA = scene.create("point2d", { coords: vec2(2.4, 0), color: t("accent"), radius: 7 });
    const armB = scene.create("point2d", { coords: vec2(1.1, 2.1), color: t("accent"), radius: 7 });

    scene.create("point2d", { coords: VERTEX, draggable: "none", color: t("point"), radius: 5 });
    scene.create("line2d", { start: VERTEX, end: armA.coords, color: t("primary"), thickness: 2.5, pointerEvents: "none" });
    scene.create("line2d", { start: VERTEX, end: armB.coords, color: t("primary"), thickness: 2.5, pointerEvents: "none" });

    const mark = angleMark2D(scene, {
      vertex: VERTEX,
      a: armA.coords,
      b: armB.coords,
      radius: 0.6,
      color: t("secondary"),
      thickness: 2.5,
    });

    return { camera, measure: mark.measure };
  });

  const radians = useAtomValue<number>(measure);
  const degrees = ((radians * 180) / Math.PI).toFixed(1);

  return (
    <DemoFrame
      hint="Drag either arm, the marked angle follows"
      sourceFile="angle-mark-2d-demo.tsx"
    >
      <Scene2DView
        scene={scene}
        camera={camera}
        style={{ width: "100%", height: "100%" }}
      />
      <Tex
        tex={`\\angle = ${degrees}^\\circ`}
        className={`absolute left-3 top-3 text-base text-fd-foreground ${overlayStyles.boardLabel}`}
      />
    </DemoFrame>
  );
}
