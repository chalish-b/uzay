import { useMemo } from "react";
import { Scene2D, vec2, type OverlayAnchor, type WritableBoundAtom } from "uzay";
import { Scene2DView, useAtomState } from "uzay/react";

// labelAnchor sandbox for axes2d and numberline2d, threejs and svg side by
// side (shared camera, so pan/zoom stays in sync for comparison).
//
// - center axes: tick labels on, anchors driven by the two toggle sliders.
//   x flips between "top" (labels below the axis, the default) and "bottom"
//   (above); y flips between "right" (labels left of the axis, the default)
//   and "left" (right). Both are atoms, so flipping must restyle in place.
// - left pair: two vertical number lines sharing a range. The first keeps
//   labelAnchor "auto", which lands labels on the line's clockwise side
//   (screen right for an upward line); the second sets "right", the chart
//   y-axis case, labels to the left.
// - bottom line: a horizontal number line with "bottom", labels above the
//   line instead of the default below.
// - diagonal line: angle and anchor both driven by sliders. On "auto" the
//   labels ride the rotating normal and stay clear of the line at any angle;
//   an explicit anchor keeps them on a fixed screen side while the line
//   rotates under them.
// - edge cases to try: pan/zoom (labels are HTML, they must track their
//   ticks), rotating the diagonal through vertical, toggling anchors while
//   zoomed, arrows swallowing end ticks.

type SliderSpec = {
  label: string;
  atom: WritableBoundAtom<number>;
  min: number;
  max: number;
  step: number;
  display?: (value: number) => string;
};

const DIAGONAL_ANCHORS = ["auto", "bottom", "top", "left", "right"] as const;

const CAPTION_STYLE =
  "color:#888;font-size:11px;font-family:monospace;white-space:nowrap";

function buildScene() {
  const scene = new Scene2D();
  const camera = scene.create("camera2d", {
    center: vec2(0, 0),
    zoom: 0.8,
  });

  scene.create("grid2d", {
    rangeX: [-14, 14],
    rangeY: [-10, 10],
    gap: 1,
    color: "white",
    opacity: 0.08,
  });

  const xFlip = scene.atom(0);
  const yFlip = scene.atom(0);
  const diagonalAngle = scene.atom(0.6);
  const diagonalAnchorIndex = scene.atom(0);

  // The axes: label anchors from the toggles, restyled reactively.
  scene.create("axes2d", {
    x: true,
    y: true,
    color: "white",
    thickness: 1,
    arrows: "none",
    tickmarks: true,
    tickStep: 1,
    labels: true,
    labelAnchor: scene.atom((get) => ({
      x: (get(xFlip) > 0.5 ? "bottom" : "top") as OverlayAnchor,
      y: (get(yFlip) > 0.5 ? "left" : "right") as OverlayAnchor,
    })),
  });

  const caption = (position: ReturnType<typeof vec2>, content: string) => {
    scene.create("overlay2d", {
      position,
      content,
      format: "text",
      anchor: "top",
      offset: vec2(0, 6),
      style: CAPTION_STYLE,
    });
  };

  // Two vertical lines: "auto" labels land on the right, "right" moves them
  // to the left side, the chart y-axis case.
  scene.create("numberline2d", {
    position: vec2(-6.5, -3.5),
    angle: Math.PI / 2,
    range: [0, 7],
    color: "orange",
    thickness: 1.5,
    tickStep: 1,
    arrows: "end",
  });
  caption(vec2(-6.5, -3.7), "auto");

  scene.create("numberline2d", {
    position: vec2(-4, -3.5),
    angle: Math.PI / 2,
    range: [0, 7],
    color: "cyan",
    thickness: 1.5,
    tickStep: 1,
    arrows: "end",
    labelAnchor: "right",
  });
  caption(vec2(-4, -3.7), '"right"');

  // A horizontal line with labels above instead of the default below.
  scene.create("numberline2d", {
    position: vec2(0.5, -3.5),
    angle: 0,
    range: [0, 6],
    color: "lime",
    thickness: 1.5,
    tickStep: 1,
    arrows: "end",
    labelAnchor: "bottom",
  });
  caption(vec2(3.5, -4), '"bottom" (labels above)');

  // The rotating line: compare "auto" following the normal against an
  // explicit anchor holding a fixed screen side.
  scene.create("numberline2d", {
    position: vec2(3, 0.5),
    angle: diagonalAngle,
    range: [0, 5],
    color: "hotpink",
    thickness: 1.5,
    tickStep: 1,
    arrows: "end",
    labelAnchor: scene.atom(
      (get) => DIAGONAL_ANCHORS[Math.round(get(diagonalAnchorIndex))]
    ),
  });
  caption(vec2(3, 0.3), "rotating");

  const sliders: SliderSpec[] = [
    {
      label: "axes x labels",
      atom: xFlip,
      min: 0,
      max: 1,
      step: 1,
      display: (v) => (v > 0.5 ? '"bottom" (above)' : '"top" (below)'),
    },
    {
      label: "axes y labels",
      atom: yFlip,
      min: 0,
      max: 1,
      step: 1,
      display: (v) => (v > 0.5 ? '"left" (right)' : '"right" (left)'),
    },
    {
      label: "diagonal angle",
      atom: diagonalAngle,
      min: 0,
      max: Math.PI,
      step: 0.01,
    },
    {
      label: "diagonal anchor",
      atom: diagonalAnchorIndex,
      min: 0,
      max: DIAGONAL_ANCHORS.length - 1,
      step: 1,
      display: (v) => DIAGONAL_ANCHORS[Math.round(v)],
    },
  ];

  return { scene, camera, sliders };
}

function Slider({ spec }: { spec: SliderSpec }) {
  const [value, setValue] = useAtomState(spec.atom);
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#999" }}>
      <span style={{ width: 150, flexShrink: 0 }}>
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
          width: 340,
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
          labelAnchor sandbox
        </span>
        {sliders.map((spec) => (
          <Slider key={spec.label} spec={spec} />
        ))}
      </div>
    </div>
  );
}
