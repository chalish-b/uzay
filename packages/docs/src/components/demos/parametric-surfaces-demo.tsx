"use client";

import { vec3 } from "uzay";
import { Scene3DView, useAtomState } from "uzay/react";
import { DemoFrame } from "./demo-frame";
import { useDemoScene3D } from "./use-demo-scene";

// The helicoid-catenoid family: one surface bending into the other through
// isometries, the classic parametric showcase. theta = 0 is the helicoid,
// theta = pi/2 the catenoid.
const SCALE = 0.6;

export default function ParametricSurfacesDemo() {
  const { scene, camera, morphAtom } = useDemoScene3D((scene, t) => {
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

    const morphAtom = scene.atom(0);

    scene.create("parametricsurface3d", {
      f: scene.atom((get) => {
        const theta = (get(morphAtom) * Math.PI) / 2;
        const ct = Math.cos(theta);
        const st = Math.sin(theta);
        return (u: number, v: number) =>
          vec3(
            SCALE * (ct * Math.sinh(v) * Math.sin(u) + st * Math.cosh(v) * Math.cos(u)),
            SCALE * (ct * u + st * v),
            SCALE * (-ct * Math.sinh(v) * Math.cos(u) + st * Math.cosh(v) * Math.sin(u))
          );
      }),
      uRange: [-Math.PI, Math.PI],
      vRange: [-1.2, 1.2],
      samples: [96, 24],
      // The surface only joins up along u at the catenoid end of the morph.
      closedU: scene.atom((get) => get(morphAtom) >= 1),
      color: t("primary"),
      pointerEvents: "none",
    });

    return { camera, morphAtom };
  });

  const [morph, setMorph] = useAtomState(morphAtom);

  return (
    <DemoFrame
      hint="Slide between the helicoid and the catenoid"
      sourceFile="parametric-surfaces-demo.tsx"
      controls={
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={morph}
            onChange={(event) => setMorph(parseFloat(event.target.value))}
            className="w-full accent-fd-primary"
            aria-label="Morph between the helicoid and the catenoid"
          />
          <span className="w-40 shrink-0 text-right text-xs text-fd-muted-foreground tabular-nums">
            {morph === 0
              ? "helicoid"
              : morph === 1
                ? "catenoid"
                : `morph = ${morph.toFixed(2)}`}
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
