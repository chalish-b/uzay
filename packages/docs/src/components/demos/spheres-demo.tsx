"use client";

import { vec3, Vec3 } from "uzay";
import { Scene3DView, useAtomState } from "uzay/react";
import { DemoFrame } from "./demo-frame";
import { overlayStyles } from "./theme";
import { useDemoScene3D } from "./use-demo-scene";

export default function SpheresDemo() {
  const { scene, camera, opacityAtom } = useDemoScene3D((scene, t) => {
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

    // Two free handles: the sphere's center, and a point the sphere must
    // pass through. Neither knows about the sphere.
    const center = scene.create("point3d", {
      coords: vec3(0, 0.5, 0),
      color: t("accent"),
      radius: 2.5,
    });

    const rim = scene.create("point3d", {
      coords: vec3(2, 1.5, 1),
      color: t("accent"),
      radius: 2.5,
    });

    const opacityAtom = scene.atom(0.35);

    // The star: radius is derived as the distance between the handles, so the
    // sphere always passes through the rim point. That's the definition of a
    // sphere (all points at distance r from the center) with no constraint
    // code at all. pointerEvents off so the handles stay grabbable inside it.
    scene.create("sphere3d", {
      center: center.coords,
      radius: scene.atom((get) =>
        Vec3.length(Vec3.subtract(get(rim.coords), get(center.coords))),
      ),
      color: t("primary"),
      opacity: opacityAtom,
      pointerEvents: "none",
    });

    // The radius made visible: a thin spoke from center to rim, with the
    // live r readout at its midpoint.
    scene.create("line3d", {
      start: center.coords,
      end: rim.coords,
      color: t("neutral"),
      thickness: 0.6,
      pointerEvents: "none",
    });

    scene.create("overlay3d", {
      position: scene.atom((get) =>
        Vec3.scaled(Vec3.add(get(center.coords), get(rim.coords)), 0.5),
      ),
      content: scene.atom((get) => {
        const r = Vec3.length(
          Vec3.subtract(get(rim.coords), get(center.coords)),
        );
        return `r = ${r.toFixed(2)}`;
      }),
      format: "latex",
      className: overlayStyles.label,
    });

    return { camera, opacityAtom };
  });

  const [opacity, setOpacity] = useAtomState(opacityAtom);

  return (
    <DemoFrame
      hint="Drag a point: one moves the sphere, the other resizes it"
      sourceFile="spheres-demo.tsx"
      controls={
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.01}
            value={opacity}
            onChange={(event) => setOpacity(parseFloat(event.target.value))}
            className="w-full accent-fd-primary"
            aria-label="Change the sphere's opacity"
          />
          <span className="w-24 shrink-0 text-right text-xs text-fd-muted-foreground tabular-nums">
            opacity = {opacity.toFixed(2)}
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
