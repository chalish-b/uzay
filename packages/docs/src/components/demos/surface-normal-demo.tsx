"use client";

import { surfaceNormal, surfacePoint, vec2, vec3 } from "uzay";
import { Scene3DView } from "uzay/react";
import { DemoFrame } from "./demo-frame";
import { overlayStyles } from "./theme";
import { useDemoScene3D } from "./use-demo-scene";

// Same scene as the surface-point demo on purpose: this page's construction
// is the previous one plus a normal vector, and the repetition shows it.
function f(x: number, z: number) {
  return Math.sin(x) * Math.cos(z);
}

const X_RANGE: [number, number] = [-4, 4];
const Z_RANGE: [number, number] = [-4, 4];

export default function SurfaceNormalDemo() {
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

    scene.create("surface3d", {
      f,
      xRange: X_RANGE,
      zRange: Z_RANGE,
      samples: 72,
      color: t("primary"),
      opacity: 0.85,
      pointerEvents: "none",
    });

    // The draggable handle; its xz atom drives the normal below.
    const sp = surfacePoint(scene, {
      f,
      xRange: X_RANGE,
      zRange: Z_RANGE,
      initialXZ: vec2(1, 1),
      color: t("accent"),
    });
    sp.point.radius.set(3);

    // The construction: unit normal at the dragged point, scaled up a bit so
    // the arrow stays legible against the surface.
    const sn = surfaceNormal(scene, {
      f,
      xz: sp.xz,
      color: t("secondary"),
      scale: 1.5,
    });

    // This construction's payload is the normal atom; show the unit normal
    // live. Its y component peaks on flat spots and dips on steep slopes.
    scene.create("overlay3d", {
      position: sp.point.coords,
      content: scene.atom((get) => {
        const { x, y, z } = get(sn.normal);
        return `\\hat{n} = (${x.toFixed(2)},\\ ${y.toFixed(2)},\\ ${z.toFixed(2)})`;
      }),
      format: "latex",
      anchor: "bottom-left",
      offset: vec2(10, -12),
      className: overlayStyles.label,
    });

    return { camera };
  });

  return (
    <DemoFrame
      hint="Drag the point, the normal follows"
      sourceFile="surface-normal-demo.tsx"
    >
      <Scene3DView
        scene={scene}
        camera={camera}
        style={{ width: "100%", height: "100%" }}
      />
    </DemoFrame>
  );
}
