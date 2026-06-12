"use client";

import { surfacePoint, vec2, vec3 } from "uzay";
import { Scene3DView } from "uzay/react";
import { DemoFrame } from "./demo-frame";
import { overlayStyles } from "./theme";
import { useDemoScene3D } from "./use-demo-scene";

// The same surface as the code blocks on the page, over a range tight enough
// that the hills stay readable from a fixed camera.
function f(x: number, z: number) {
  return Math.sin(x) * Math.cos(z);
}

const X_RANGE: [number, number] = [-4, 4];
const Z_RANGE: [number, number] = [-4, 4];

export default function SurfacePointDemo() {
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

    // The construction: a point constrained to the surface. Dragging it only
    // ever moves the (x, z) pair, so the point glides over the hills.
    const sp = surfacePoint(scene, {
      f,
      xRange: X_RANGE,
      zRange: Z_RANGE,
      initialXZ: vec2(1, 1),
      color: t("accent"),
    });
    sp.point.radius.set(3);

    // The construction's payload is the xz atom; show it live next to the
    // point. Vec2's y field maps to the z axis.
    scene.create("overlay3d", {
      position: sp.point.coords,
      content: scene.atom((get) => {
        const xz = get(sp.xz);
        return `(x, z) = (${xz.x.toFixed(1)},\\ ${xz.y.toFixed(1)})`;
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
      hint="Drag the point across the surface"
      sourceFile="surface-point-demo.tsx"
    >
      <Scene3DView
        scene={scene}
        camera={camera}
        style={{ width: "100%", height: "100%" }}
      />
    </DemoFrame>
  );
}
