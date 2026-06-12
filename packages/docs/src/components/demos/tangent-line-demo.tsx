"use client";

import { curvePoint, tangentLine, vec2, vec3 } from "uzay";
import { Scene3DView } from "uzay/react";
import { DemoFrame } from "./demo-frame";
import { overlayStyles } from "./theme";
import { useDemoScene3D } from "./use-demo-scene";

// Same scene as the curve-point demo on purpose: this page's construction is
// the previous one plus a tangent line, and the repetition shows it.
function helix(t: number) {
  return vec3(Math.cos(t), Math.sin(t), t * 0.3);
}

const T_START = -Math.PI * 2;
const T_END = Math.PI * 2;

export default function TangentLineDemo() {
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

    // The draggable handle; its t atom drives the tangent line below.
    const p = curvePoint(scene, {
      f: helix,
      tStart: T_START,
      tEnd: T_END,
      initialT: 1.0,
      color: t("accent"),
    });
    p.point.radius.set(3);

    // The construction: tangent at the dragged point. curvePoint already
    // draws the point, so showPoint stays off.
    const tl = tangentLine(scene, {
      f: helix,
      t: p.t,
      length: 3,
      color: t("secondary"),
      showPoint: false,
    });

    // This construction's payload is the tangent atom; show the derivative
    // live. On a helix the z component never moves while x and y swing.
    scene.create("overlay3d", {
      position: p.point.coords,
      content: scene.atom((get) => {
        const { x, y, z } = get(tl.tangent);
        return `f'(t) = (${x.toFixed(2)},\\ ${y.toFixed(2)},\\ ${z.toFixed(2)})`;
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
      hint="Drag the point, the tangent follows"
      sourceFile="tangent-line-demo.tsx"
    >
      <Scene3DView
        scene={scene}
        camera={camera}
        style={{ width: "100%", height: "100%" }}
      />
    </DemoFrame>
  );
}
