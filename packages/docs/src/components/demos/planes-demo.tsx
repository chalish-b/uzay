"use client";

import { vec3, Vec3 } from "uzay";
import { Scene3DView, useAtomState } from "uzay/react";
import { DemoFrame } from "./demo-frame";
import { overlayStyles } from "./theme";
import { useDemoScene3D } from "./use-demo-scene";

export default function PlanesDemo() {
  const { scene, camera, sizeAtom } = useDemoScene3D((scene, t) => {
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

    // Three free handles. None of them knows about the plane.
    const a = scene.create("point3d", {
      coords: vec3(-2, 0.5, -1),
      color: t("accent"),
      radius: 2.5,
    });

    const b = scene.create("point3d", {
      coords: vec3(0.5, 1.5, 1.5),
      color: t("accent"),
      radius: 2.5,
    });

    const c = scene.create("point3d", {
      coords: vec3(2, 0, -1.5),
      color: t("accent"),
      radius: 2.5,
    });

    // The construction itself: the center is the centroid of the three points
    // and the normal is the cross product of two triangle edges. "Three points
    // define a plane" with no constraint code, just two derived atoms.
    const centroidAtom = scene.atom((get) =>
      Vec3.scaled(Vec3.add(get(a.coords), get(b.coords), get(c.coords)), 1 / 3),
    );

    const normalAtom = scene.atom((get) =>
      Vec3.cross(
        Vec3.subtract(get(b.coords), get(a.coords)),
        Vec3.subtract(get(c.coords), get(a.coords)),
      ),
    );

    // Zero when the points are dragged collinear: the one configuration that
    // does not define a plane.
    const unitNormalAtom = scene.atom((get) => {
      const n = get(normalAtom);
      const len = Vec3.length(n);
      return len < 1e-9 ? Vec3.ZERO : Vec3.scaled(n, 1 / len);
    });

    const sizeAtom = scene.atom(5);

    // The star. pointerEvents off so the handles stay grabbable through it.
    scene.create("plane3d", {
      point: centroidAtom,
      normal: normalAtom,
      width: sizeAtom,
      height: sizeAtom,
      color: t("primary"),
      opacity: 0.35,
      pointerEvents: "none",
    });

    // The triangle the points span, so the eye connects them to the plane.
    const edges = [
      [a, b],
      [b, c],
      [c, a],
    ] as const;
    for (const [from, to] of edges) {
      scene.create("line3d", {
        start: from.coords,
        end: to.coords,
        color: t("neutral"),
        thickness: 0.6,
        pointerEvents: "none",
      });
    }

    // The derived normal made visible: a fixed-length arrow from the centroid,
    // with the live unit normal readout floating past its tip.
    scene.create("vector3d", {
      origin: centroidAtom,
      vector: scene.atom((get) => Vec3.scaled(get(unitNormalAtom), 1.6)),
      color: t("secondary"),
      pointerEvents: "none",
    });

    scene.create("overlay3d", {
      position: scene.atom((get) =>
        Vec3.add(get(centroidAtom), Vec3.scaled(get(unitNormalAtom), 2)),
      ),
      content: scene.atom((get) => {
        const n = get(unitNormalAtom);
        if (Vec3.equals(n, Vec3.ZERO)) return String.raw`\text{collinear!}`;
        return `\\hat{n} = (${n.x.toFixed(2)}, ${n.y.toFixed(2)}, ${n.z.toFixed(2)})`;
      }),
      format: "latex",
      className: overlayStyles.label,
    });

    return { camera, sizeAtom };
  });

  const [size, setSize] = useAtomState(sizeAtom);

  return (
    <DemoFrame
      hint="Drag any of the three points to reorient the plane"
      sourceFile="planes-demo.tsx"
      controls={
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={2}
            max={8}
            step={0.1}
            value={size}
            onChange={(event) => setSize(parseFloat(event.target.value))}
            className="w-full accent-fd-primary"
            aria-label="Change the plane's size"
          />
          <span className="w-24 shrink-0 text-right text-xs text-fd-muted-foreground tabular-nums">
            size = {size.toFixed(1)}
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
