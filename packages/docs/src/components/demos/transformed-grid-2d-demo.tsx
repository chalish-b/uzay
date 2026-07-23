"use client";

import { transformedGrid2D, vec2, type WritableBoundAtom } from "uzay";
import { Scene2DView, useAtomState } from "uzay/react";
import { DemoFrame } from "./demo-frame";
import { useDemoScene2D } from "./use-demo-scene";

// A swirl: rotate each point around the origin by an angle that grows with
// its distance, so circles stay circles but radial lines wind up.
const swirl = (x: number, y: number) => {
  const a = 0.55 * Math.hypot(x, y);
  return vec2(x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a));
};

export default function TransformedGrid2DDemo() {
  const { scene, camera, morph } = useDemoScene2D((scene, t) => {
    const camera = scene.create("camera2d", { center: vec2(0, 0), zoom: 1.1 });

    // Faint reference: the untransformed source plane.
    scene.create("grid2d", {
      rangeX: true,
      rangeY: true,
      gap: "auto",
      color: t("grid"),
      opacity: t("gridOpacity"),
    });

    const morph = scene.atom(1);
    const mapAtom = scene.atom((get) => {
      const s = get(morph);
      return (x: number, y: number) => vec2(x, y).lerp(swirl(x, y), s);
    });

    transformedGrid2D(scene, {
      map: mapAtom,
      rangeX: [-4, 4],
      rangeY: [-4, 4],
      gap: 0.5,
      thickness: 1,
      colorX: t("primary"),
      colorY: t("secondary"),
      opacity: 1,
    });

    return { camera, morph };
  });

  return (
    <DemoFrame
      hint="Slide to morph the plane into the swirl"
      sourceFile="transformed-grid-2d-demo.tsx"
      controls={<MorphSlider morph={morph} />}
    >
      <Scene2DView
        scene={scene}
        camera={camera}
        style={{ width: "100%", height: "100%" }}
      />
    </DemoFrame>
  );
}

function MorphSlider({ morph }: { morph: WritableBoundAtom<number> }) {
  const [value, setValue] = useAtomState(morph);
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(event) => setValue(parseFloat(event.target.value))}
        className="w-full accent-fd-primary"
        aria-label="Morph between the identity and the swirl map"
      />
      <span className="w-16 shrink-0 text-right text-xs text-fd-muted-foreground tabular-nums">
        t = {value.toFixed(2)}
      </span>
    </div>
  );
}
