"use client";

import { functionArea2D, vec2 } from "uzay";
import { Scene2DView } from "uzay/react";
import { DemoFrame } from "./demo-frame";
import { useDemoScene2D } from "./use-demo-scene";

// The same parabola as the code blocks on the page, shaded against a function
// baseline: a tilted line g. The curves cross inside the initial interval, so
// the region splits into lobes right away and the readout can go negative.
function f(x: number) {
  return 0.25 * x * x - 0.5;
}
function g(x: number) {
  return 0.3 * x + 0.2;
}

// Lifts on-board text off the grid lines: a light glow in light mode, a dark
// one in dark mode. Mirrors what the playground integral demo settled on.
const boardTextShadow =
  "[text-shadow:0_1px_0_rgba(255,255,255,0.9),0_0_5px_rgba(255,255,255,0.9)] " +
  "dark:[text-shadow:0_1px_2px_black,0_0_6px_black]";

export default function FunctionAreaDemo() {
  const { scene, camera } = useDemoScene2D((scene, t) => {
    const camera = scene.create("camera2d", {
      center: vec2(0, 1),
      zoom: 1.4,
    });

    scene.create("grid2d", {
      rangeX: true,
      rangeY: true,
      gap: "auto",
      color: t("grid"),
      opacity: t("gridOpacity"),
    });

    scene.create("axes2d", {
      x: true,
      y: true,
      color: t("axes"),
      thickness: 1.1,
      tickmarks: true,
      tickStep: "auto",
      labels: true,
      // Tick labels are DOM; a class drops the library's default look and
      // lets the site CSS theme them, same as overlays.
      labelClassName: "text-xs text-fd-muted-foreground",
      arrows: true,
    });

    // The bounds: two handles draggable along the x axis. Their x coordinates
    // drive both the construction and the integral readout.
    const aCoords = scene.atom(vec2(-2, 0));
    const bCoords = scene.atom(vec2(2, 0));
    const aAtom = scene.atom((get) => get(aCoords).x);
    const bAtom = scene.atom((get) => get(bCoords).x);

    // The construction: the filled region between f and the function baseline
    // g. colorBelow tints the lobes where f dips under g, so the negative part
    // of the signed area reads at a glance.
    const area = functionArea2D(scene, {
      f,
      a: aAtom,
      b: bAtom,
      baseline: g,
      samples: 160,
      color: t("secondary"),
      colorBelow: t("accent"),
      strokeColor: t("secondary"),
      strokeColorBelow: t("accent"),
      strokeOpacity: 0.6,
      strokeThickness: 1.5,
    });

    scene.create("function2d", {
      f,
      domain: "infinite",
      color: t("primary"),
      thickness: 3,
      pointerEvents: "none",
    });

    // The baseline drawn as its own curve, quieter than f.
    scene.create("function2d", {
      f: g,
      domain: "infinite",
      color: t("neutral"),
      thickness: 2.5,
      pointerEvents: "none",
    });

    scene.create("overlay2d", {
      position: vec2(-3, f(-3)),
      content: "f",
      format: "latex",
      anchor: "bottom",
      offset: vec2(0, -8),
      className: `pointer-events-none text-sm text-fd-muted-foreground ${boardTextShadow}`,
    });
    scene.create("overlay2d", {
      position: vec2(-3, g(-3)),
      content: "g",
      format: "latex",
      anchor: "bottom",
      offset: vec2(0, -8),
      className: `pointer-events-none text-sm text-fd-muted-foreground ${boardTextShadow}`,
    });

    const aPoint = scene.create("point2d", {
      coords: aCoords,
      color: t("accent"),
      radius: 6,
      draggable: "x",
    });

    const bPoint = scene.create("point2d", {
      coords: bCoords,
      color: t("accent"),
      radius: 6,
      draggable: "x",
    });

    scene.create("overlay2d", {
      position: aPoint.coords,
      content: "a",
      format: "latex",
      anchor: "top",
      offset: vec2(0, 10),
      className: `pointer-events-none text-sm text-fd-muted-foreground ${boardTextShadow}`,
    });

    scene.create("overlay2d", {
      position: bPoint.coords,
      content: "b",
      format: "latex",
      anchor: "top",
      offset: vec2(0, 10),
      className: `pointer-events-none text-sm text-fd-muted-foreground ${boardTextShadow}`,
    });

    // The readout comes straight from the construction's signedArea atom, so
    // the number always matches the drawn region, lobe splits and all. It sits
    // above the curves, following the interval's midpoint. No chip background:
    // bare display-style math with a glow reads as part of the board.
    scene.create("overlay2d", {
      position: scene.atom((get) => {
        const mid = (get(aAtom) + get(bAtom)) / 2;
        return vec2(mid, 3.2);
      }),
      content: scene.atom((get) => {
        const value = get(area.signedArea);
        return `\\displaystyle\\int_a^b \\big(f(x)-g(x)\\big)\\,dx = ${value.toFixed(2)}`;
      }),
      format: "latex",
      anchor: "center",
      className: `pointer-events-none text-base text-fd-foreground ${boardTextShadow}`,
    });

    return { camera };
  });

  return (
    <DemoFrame
      hint="Drag a and b, the area between the curves follows"
      sourceFile="function-area-demo.tsx"
    >
      <Scene2DView
        scene={scene}
        camera={camera}
        style={{ width: "100%", height: "100%" }}
      />
    </DemoFrame>
  );
}
