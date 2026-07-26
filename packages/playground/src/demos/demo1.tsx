import { useMemo } from "react";
import { Scene2D, vec2, type WritableBoundAtom } from "uzay";
import type { Function2DDiscontinuity } from "uzay";
import { Scene2DView, useAtomState } from "uzay/react";

// function2d endpoint-marker sandbox, threejs and svg side by side (shared
// camera, so pan/zoom stays in sync for comparison).
//
// - dodgerblue: piecewise jump at x = a (slider). Left side open, right side
//   closed; the swap toggle flips them. Dragging a moves the jump and the
//   markers must track it. Near a ≈ 1.62 the two branches meet and the ring
//   and dot coincide (different styles are not deduped, the dot covers the
//   ring).
// - orange: removable hole, both sides open. The two coincident rings must
//   dedupe into a single ring, with the grid visible through its interior
//   and the line trimmed back to the ring edge on both sides.
// - violet: finite domain, closed start dot and open end ring. Pan the
//   domain edge off screen and back; markers must survive plan rebuilds.
// - tomato: deliberate misuse, open markers declared on a vertical
//   asymptote. Both one-sided limits diverge, so the curve must break with
//   NO markers drawn.
// - markerRadius / thickness / opacity sliders apply to all four curves.
//   Zoom in and out: marker sizes and ring strokes are CSS pixel sizes and
//   must stay visually constant, with the curve never poking into a ring's
//   hollow interior.

const SHOW_STYLES = ["open/closed", "closed/open"] as const;

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
    center: vec2(0, 0),
    zoom: 0.9,
  });

  scene.create("grid2d", {
    rangeX: [-14, 14],
    rangeY: [-10, 10],
    gap: 1,
    color: "white",
    opacity: 0.12,
  });
  scene.create("axes2d", {
    x: [-13, 13],
    y: [-9, 9],
    color: "white",
    thickness: 1.2,
    tickmarks: true,
    tickStep: 2,
    arrows: true,
  });

  const jumpX = scene.atom(1);
  const swapStyles = scene.atom(0);
  const markerRadius = scene.atom(4);
  const thickness = scene.atom(2);
  const opacity = scene.atom(1);

  // Piecewise jump: x + 1 below a, x^2 above it.
  scene.create("function2d", {
    f: scene.atom((get) => {
      const a = get(jumpX);
      return (x: number) => (x < a ? x + 1 : x * x);
    }),
    domain: [-7, 3.5],
    discontinuities: scene.atom((get): Function2DDiscontinuity[] => {
      const swapped = get(swapStyles) > 0.5;
      return [
        {
          x: get(jumpX),
          left: swapped ? "closed" : "open",
          right: swapped ? "open" : "closed",
        },
      ];
    }),
    markerRadius,
    color: "dodgerblue",
    thickness,
    opacity,
  });

  // Removable hole at (3, -1): both sides open, dedupes to one ring.
  scene.create("function2d", {
    f: (x: number) => (0.5 * (x * x - 9)) / (x - 3) - 4,
    domain: [-2, 8],
    discontinuities: [{ x: 3, left: "open", right: "open" }],
    markerRadius,
    color: "orange",
    thickness,
    opacity,
  });

  // Finite domain with a closed start and an open end.
  scene.create("function2d", {
    f: (x: number) => 2 * Math.sqrt(x + 12) - 8,
    domain: [-12, -4],
    endpoints: { start: "closed", end: "open" },
    markerRadius,
    color: "violet",
    thickness,
    opacity,
  });

  // Misuse case: open markers declared on a vertical asymptote.
  scene.create("function2d", {
    f: (x: number) => 1 / (x - 6) + 4,
    domain: [4, 12],
    discontinuities: [{ x: 6, left: "open", right: "open" }],
    markerRadius,
    color: "tomato",
    thickness,
    opacity,
  });

  const sliders: SliderSpec[] = [
    { label: "jump x", atom: jumpX, min: -2, max: 3, step: 0.01 },
    {
      label: "jump styles",
      atom: swapStyles,
      min: 0,
      max: 1,
      step: 1,
      display: (value) => SHOW_STYLES[Math.round(value)],
    },
    { label: "markerRadius", atom: markerRadius, min: 1, max: 10, step: 0.5 },
    { label: "thickness", atom: thickness, min: 1, max: 6, step: 0.5 },
    { label: "opacity", atom: opacity, min: 0.2, max: 1, step: 0.05 },
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
          function2d endpoint markers sandbox
        </span>
        {sliders.map((spec) => (
          <Slider key={spec.label} spec={spec} />
        ))}
      </div>
    </div>
  );
}
