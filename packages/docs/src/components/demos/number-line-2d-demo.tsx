"use client";

import { vec2, type Vec2 } from "uzay";
import { Scene2DView } from "uzay/react";
import { DemoFrame } from "./demo-frame";
import { overlayStyles } from "./theme";
import { useDemoScene2D } from "./use-demo-scene";

// The line's frame: value 0 at POSITION, values increasing along ANGLE,
// one value unit taking SCALE world units. A value v lands at
// POSITION + DIR · SCALE · v; a world point projects back to a value with
// the dot product.
const POSITION = vec2(-0.5, -0.5);
const ANGLE = Math.PI / 7;
const SCALE = 1.1;
const DIR = vec2(Math.cos(ANGLE), Math.sin(ANGLE));

const valueToWorld = (value: number) => POSITION.add(DIR.scale(SCALE * value));
const worldToValue = (point: Vec2) => point.sub(POSITION).dot(DIR) / SCALE;

export default function NumberLine2DDemo() {
  const { scene, camera } = useDemoScene2D((scene, t) => {
    const camera = scene.create("camera2d", {
      center: vec2(0, 0.6),
      zoom: 1.25,
    });

    scene.create("grid2d", {
      rangeX: true,
      rangeY: true,
      gap: "auto",
      color: t("grid"),
      opacity: t("gridOpacity"),
    });

    // The number line: a coordinate system of its own, placed at an angle in
    // the plane. Its labels are values, not world coordinates.
    scene.create("numberline2d", {
      position: POSITION,
      angle: ANGLE,
      scale: SCALE,
      range: [-3, 3],
      color: t("primary"),
      thickness: 2,
      labelClassName: "text-xs text-fd-muted-foreground",
    });

    // A free point projecting onto the line: worldToValue reads the value
    // under the projection, valueToWorld places the foot.
    const freePoint = scene.atom(vec2(0.8, 1.9));
    const projectedValue = scene.atom((get) => worldToValue(get(freePoint)));
    const foot = scene.atom((get) => valueToWorld(get(projectedValue)));

    scene.create("line2d", {
      start: freePoint,
      end: foot,
      color: t("neutral"),
      thickness: 1.5,
      dashed: true,
      opacity: 0.6,
      pointerEvents: "none",
    });
    scene.create("point2d", {
      coords: foot,
      draggable: "none",
      color: t("secondary"),
      radius: 5,
      pointerEvents: "none",
    });
    scene.create("overlay2d", {
      position: foot,
      content: scene.atom(
        (get) => `\\text{value} = ${get(projectedValue).toFixed(2)}`,
      ),
      format: "latex",
      anchor: "top-left",
      offset: vec2(10, 10),
      className: `${overlayStyles.boardLabel} text-sm text-fd-foreground`,
    });
    scene.create("point2d", {
      coords: freePoint,
      draggable: "xy",
      color: t("accent"),
      radius: 6,
    });

    return { camera };
  });

  return (
    <DemoFrame
      hint="Drag the point, its projection reads a value off the line"
      sourceFile="number-line-2d-demo.tsx"
    >
      <Scene2DView
        scene={scene}
        camera={camera}
        style={{ width: "100%", height: "100%" }}
      />
    </DemoFrame>
  );
}
