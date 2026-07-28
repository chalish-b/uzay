import { useMemo } from "react";
import { Scene2D, vec2, type WritableBoundAtom } from "uzay";
import type { ArrowEnds } from "uzay";
import { Scene2DView, useAtomState } from "uzay/react";

// axes2d origin + arrows sandbox, threejs and svg side by side (shared
// camera, so pan/zoom stays in sync for comparison).
//
// - white axes: the main pair, viewport-backed (x: true, y: true) with ticks
//   and labels. The ox / oy sliders move its origin live: lines, ticks,
//   labels and arrowheads must all shift together, and the tick under the
//   crossing point must stay skipped (watch it hop as ox/oy pass integers).
//   The arrows slider cycles none / start / end / both on BOTH axes.
// - skyblue row: a lone x-axis number line at origin (0, 4), range [-8, 8],
//   arrows "end" only. The head must sit at the max side.
// - orange row: number line at origin (2, 6), range [-4, 8], arrows "both".
//   Its origin.x is 2, so the tick and label at x = 2 are skipped even
//   though no y-axis crosses there (current crossing-skip semantics).
// - mediumseagreen column: a lone y-axis at origin (-7, 0), range [-3, 7],
//   arrows "both". Tests the vertical offset path; the y = 0 tick is
//   skipped (crossing = origin.y = 0).
// - edge cases to try: drag the origin far off screen (viewport-backed
//   ranges must keep covering the view), zoom in/out (tick re-stepping and
//   pixel-sized arrowheads/ticks at offset positions), pan while zoomed.

const ARROW_MODES: ArrowEnds[] = ["none", "start", "end", "both"];

type SliderSpec = {
  label: string;
  atom: WritableBoundAtom<number>;
  min: number;
  max: number;
  step: number;
  display?: (value: number) => string;
};

function buildScene() {
  const scene = new Scene2D();
  const camera = scene.create("camera2d", {
    center: vec2(0, 2),
    zoom: 0.55,
  });

  scene.create("grid2d", {
    rangeX: [-14, 14],
    rangeY: [-10, 12],
    gap: 1,
    color: "white",
    opacity: 0.12,
  });

  const originX = scene.atom(0);
  const originY = scene.atom(0);
  const arrowMode = scene.atom(3);

  // The main axes: viewport-backed, origin and arrows fully reactive.
  scene.create("axes2d", {
    x: true,
    y: true,
    origin: scene.atom((get) => vec2(get(originX), get(originY))),
    color: "white",
    thickness: 1.2,
    tickmarks: true,
    tickStep: 1,
    labels: true,
    arrows: scene.atom((get) => ARROW_MODES[Math.round(get(arrowMode))]),
  });

  // Number line rows: lone x-axes at fixed off-origin positions.
  scene.create("axes2d", {
    x: [-8, 8],
    y: false,
    origin: vec2(0, 4),
    color: "skyblue",
    thickness: 1.2,
    tickmarks: true,
    tickStep: 1,
    labels: true,
    arrows: "end",
  });
  scene.create("axes2d", {
    x: [-4, 8],
    y: false,
    origin: vec2(2, 6),
    color: "orange",
    thickness: 1.2,
    tickmarks: true,
    tickStep: 1,
    labels: true,
    arrows: "both",
  });

  // A lone y-axis column, offset horizontally.
  scene.create("axes2d", {
    x: false,
    y: [-3, 7],
    origin: vec2(-7, 0),
    color: "mediumseagreen",
    thickness: 1.2,
    tickmarks: true,
    tickStep: 1,
    labels: true,
    arrows: "both",
  });

  const sliders: SliderSpec[] = [
    { label: "origin x", atom: originX, min: -5, max: 5, step: 0.01 },
    { label: "origin y", atom: originY, min: -5, max: 5, step: 0.01 },
    {
      label: "arrows",
      atom: arrowMode,
      min: 0,
      max: ARROW_MODES.length - 1,
      step: 1,
      display: (value) => ARROW_MODES[Math.round(value)],
    },
  ];

  return { scene, camera, sliders };
}

function Slider({ spec }: { spec: SliderSpec }) {
  const [value, setValue] = useAtomState(spec.atom);
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#999" }}>
      <span style={{ width: 110, flexShrink: 0 }}>
        {spec.label}:{" "}
        {spec.display
          ? spec.display(value)
          : value.toFixed(spec.step >= 1 ? 0 : 2)}
      </span>
      <input
        type="range"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={value}
        onChange={(e) => setValue(parseFloat(e.target.value))}
        style={{ width: "100%" }}
      />
    </label>
  );
}

function PaneLabel({ text }: { text: string }) {
  return (
    <span
      style={{
        position: "absolute",
        top: 8,
        left: 10,
        fontSize: 11,
        color: "#888",
        fontFamily: "monospace",
        pointerEvents: "none",
      }}
    >
      {text}
    </span>
  );
}

export default function Demo1() {
  const { scene, camera, sliders } = useMemo(buildScene, []);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        backgroundColor: "#141414",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ position: "relative", width: "50%", height: "100%", borderRight: "1px solid #2a2a2a" }}>
        <Scene2DView scene={scene} camera={camera} renderer="threejs" style={{ width: "100%", height: "100%" }} />
        <PaneLabel text="threejs" />
      </div>
      <div style={{ position: "relative", width: "50%", height: "100%" }}>
        <Scene2DView scene={scene} camera={camera} renderer="svg" style={{ width: "100%", height: "100%" }} />
        <PaneLabel text="svg" />
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          width: 320,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: 12,
          borderRadius: 6,
          backgroundColor: "rgba(22, 22, 22, 0.9)",
          border: "1px solid #2a2a2a",
        }}
      >
        <span style={{ fontSize: 11, color: "#ccc", fontWeight: "bold" }}>
          axes2d origin + arrows sandbox
        </span>
        {sliders.map((spec) => (
          <Slider key={spec.label} spec={spec} />
        ))}
      </div>
    </div>
  );
}
