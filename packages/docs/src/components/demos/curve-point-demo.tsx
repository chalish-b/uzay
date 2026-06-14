"use client";

import { curvePoint, vec2, vec3 } from "uzay";
import { Scene3DView } from "uzay/react";
import { DemoFrame } from "./demo-frame";
import { overlayStyles } from "./theme";
import { useDemoScene3D } from "./use-demo-scene";

// The same helix as the code blocks on the page, centered on the origin so
// the camera can sit still while the point travels the whole range.
function helix(t: number) {
  return vec3(Math.cos(t), Math.sin(t), t * 0.3);
}

const T_START = -Math.PI * 2;
const T_END = Math.PI * 2;

export default function CurvePointDemo() {
  const { scene, camera } = useDemoScene3D((scene, t) => {
    const camera = scene.create("camera3d", {
      position: vec3(3.5, 2.5, 5.5),
      lookAt: vec3(0, 0, 0),
      fov: 42,
    });

    scene.create("grid3d", {
      plane: "xz",
      range1: [-3, 3],
      range2: [-3, 3],
      offset: -2,
      gap: 1,
      color: t("grid"),
      opacity: t("gridOpacity"),
      pointerEvents: "none",
    });

    scene.create("axes3d", {
      x: [-2, 2],
      y: [-2, 2],
      z: [-3, 3],
      color: t("axes"),
      thickness: 0.6,
      pointerEvents: "none",
    });

    scene.create("parametricfunction3d", {
      f: helix,
      tStart: T_START,
      tEnd: T_END,
      samples: 250,
      color: t("primary"),
      thickness: 1.2,
      pointerEvents: "none",
    });

    // The construction: a point constrained to the helix. Dragging it only
    // ever moves t, so the point snaps to the nearest spot on the curve.
    const p = curvePoint(scene, {
      f: helix,
      tStart: T_START,
      tEnd: T_END,
      t: 1.0,
      color: t("accent"),
    });
    p.point.radius.set(3);

    // The construction's payload is the t atom; show it live next to the point.
    scene.create("overlay3d", {
      position: p.point.coords,
      content: scene.atom((get) => `t = ${get(p.t).toFixed(2)}`),
      format: "latex",
      anchor: "bottom-left",
      offset: vec2(10, -12),
      className: overlayStyles.label,
    });

    return { camera };
  });

  return (
    <DemoFrame
      hint="Drag the point along the helix"
      sourceFile="curve-point-demo.tsx"
    >
      <Scene3DView
        scene={scene}
        camera={camera}
        style={{ width: "100%", height: "100%" }}
      />
    </DemoFrame>
  );
}
