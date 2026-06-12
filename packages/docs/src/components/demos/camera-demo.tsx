"use client";

import { useState } from "react";
import { vec3 } from "uzay";
import type { Camera3D } from "uzay";
import { Scene3DView, useAtomState } from "uzay/react";
import { DemoFrame } from "./demo-frame";
import { useDemoScene3D } from "./use-demo-scene";

// CAD-style named views: one free perspective camera, two locked orthographic
// cameras. Each camera is a scene item with its own configuration, switching
// just changes which one the view renders through.
const VIEWS = [
  { key: "orbit", label: "Orbit" },
  { key: "top", label: "Top" },
  { key: "front", label: "Front" },
] as const;
type ViewKey = (typeof VIEWS)[number]["key"];

export default function CameraDemo() {
  const { scene, cameras } = useDemoScene3D((scene, t) => {
    const cameras: Record<ViewKey, Camera3D> = {
      orbit: scene.create("camera3d", {
        position: vec3(6, 4.5, 9),
        lookAt: vec3(0, 0, 0),
        fov: 42,
      }),
      // Tiny z offset so the straight-down view doesn't fight the camera's up vector
      top: scene.create("camera3d", {
        position: vec3(0, 14, 0.02),
        lookAt: vec3(0, 0, 0),
        projection: "orthographic",
        fov: 36,
        enableOrbit: false,
      }),
      front: scene.create("camera3d", {
        position: vec3(0, 0, 14),
        lookAt: vec3(0, 0, 0),
        projection: "orthographic",
        fov: 36,
        enableOrbit: false,
      }),
    };

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

    // The subject: a helix. A genuinely 3D shape whose orthographic
    // projections are famous flat curves, a circle from the top and a
    // cosine wave from the front.
    scene.create("parametricfunction3d", {
      f: (u: number) => vec3(2.5 * Math.cos(u), 0.27 * u, 2.5 * Math.sin(u)),
      tStart: -Math.PI * 3,
      tEnd: Math.PI * 3,
      samples: 400,
      color: t("primary"),
      thickness: 1.4,
      pointerEvents: "none",
    });

    return { cameras };
  });

  const [active, setActive] = useState<ViewKey>("orbit");
  const camera = cameras[active];
  const [fov, setFov] = useAtomState(camera.fov);

  return (
    <DemoFrame
      hint="Switch views: the helix is a circle from the top, a wave from the front"
      sourceFile="camera-demo.tsx"
      controls={
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {VIEWS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActive(key)}
                aria-pressed={active === key}
                className={
                  active === key
                    ? "rounded-md border border-fd-primary bg-fd-primary px-2.5 py-1 text-xs text-fd-primary-foreground"
                    : "rounded-md border border-fd-border px-2.5 py-1 text-xs text-fd-muted-foreground hover:text-fd-foreground"
                }
              >
                {label}
              </button>
            ))}
          </div>
          <input
            type="range"
            min={15}
            max={80}
            step={1}
            value={fov}
            onChange={(event) => setFov(parseFloat(event.target.value))}
            className="w-full accent-fd-primary"
            aria-label="Change the active camera's field of view"
          />
          <span className="w-20 shrink-0 text-right text-xs text-fd-muted-foreground tabular-nums">
            fov = {fov.toFixed(0)}°
          </span>
        </div>
      }
    >
      <Scene3DView
        scene={scene}
        camera={camera}
        style={{ width: "100%", height: "100%" }}
      />
    </DemoFrame>
  );
}
