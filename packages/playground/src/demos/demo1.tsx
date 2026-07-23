import { useMemo } from "react";
import { Scene2D, angleMark2D, vec2, type WritableBoundAtom } from "uzay";
import { Scene2DView, useAtomState } from "uzay/react";

// line2d arrows sandbox.
//
// Left column: one static line per arrows mode (none / start / end / both),
// labeled, to eyeball tip placement at both endpoints.
// Right: a line between two draggable handles, with every interacting option
// on sliders:
// - arrows cycles the four modes; heads must keep their tips exactly on the
//   endpoints while the handles drag
// - drag one handle onto the other: degenerate line, heads must hide
// - dashed + arrows combine; thickness and opacity restyle shaft and heads
//   together (heads follow the line's opacity)
// - visible hides shaft and heads as one
// Bottom left: an angleMark2D with arcArrows "both" next to a "both" line, to
// check the annotation heads match in size (shared ANNOTATION_HEAD constant).
//
// The scene renders in BOTH backends side by side (threejs left, svg right)
// with a shared camera, so pan/zoom stays in sync and any visual difference
// between the backends is immediately obvious.

type SliderSpec = {
  label: string;
  atom: WritableBoundAtom<number>;
  min: number;
  max: number;
  step: number;
};

const ARROW_MODES = ["none", "start", "end", "both"] as const;

function buildScene() {
  const scene = new Scene2D();
  const camera = scene.create("camera2d", { center: vec2(0, 0), zoom: 1.1 });

  scene.create("grid2d", {
    rangeX: true,
    rangeY: true,
    gap: "auto",
    color: "white",
    opacity: 0.06,
  });
  scene.create("axes2d", {
    x: true,
    y: true,
    color: "#666",
    thickness: 1,
    tickmarks: true,
    tickStep: "auto",
  });

  // The static mode column.
  ARROW_MODES.forEach((mode, i) => {
    const y = 2.6 - i * 0.7;
    scene.create("line2d", {
      start: vec2(-4.4, y),
      end: vec2(-2.2, y),
      color: "#38bdf8",
      thickness: 2,
      arrows: mode,
    });
    scene.create("overlay2d", {
      position: vec2(-2, y),
      content: mode,
      anchor: "left",
      className: "text-xs",
    });
  });

  // The draggable line, all options live.
  const arrowsSlider = scene.atom(3);
  const dashedToggle = scene.atom(0);
  const thicknessSlider = scene.atom(2);
  const opacitySlider = scene.atom(1);
  const visibleToggle = scene.atom(1);

  const a = scene.create("point2d", { coords: vec2(0.8, 1.6), color: "gold", radius: 6 });
  const b = scene.create("point2d", { coords: vec2(4, 0.4), color: "gold", radius: 6 });
  scene.create("line2d", {
    start: a.coords,
    end: b.coords,
    color: "#f472b6",
    thickness: thicknessSlider,
    opacity: opacitySlider,
    dashed: scene.atom((get) => get(dashedToggle) > 0.5),
    arrows: scene.atom((get) => ARROW_MODES[Math.round(get(arrowsSlider))]),
    visible: scene.atom((get) => get(visibleToggle) > 0.5),
    pointerEvents: "none",
  });

  // Size-consistency check: the arc's annotation heads next to a line's.
  const vertex = vec2(-3.2, -1.6);
  const armA = vec2(-1.7, -1.6);
  const armB = vec2(-3.2, -0.1);
  for (const arm of [armA, armB]) {
    scene.create("line2d", { start: vertex, end: arm, color: "#888", thickness: 1.5 });
  }
  angleMark2D(scene, {
    vertex,
    a: armA,
    b: armB,
    radius: 1.1,
    color: "#a78bfa",
    thickness: 2,
    arcArrows: "both",
    squareRightAngle: false,
  });
  scene.create("line2d", {
    start: vec2(-1.2, -2.6),
    end: vec2(1.8, -2.6),
    color: "#a78bfa",
    thickness: 2,
    arrows: "both",
  });

  const sliders: SliderSpec[] = [
    { label: "arrows", atom: arrowsSlider, min: 0, max: 3, step: 1 },
    { label: "dashed", atom: dashedToggle, min: 0, max: 1, step: 1 },
    { label: "thickness", atom: thicknessSlider, min: 1, max: 5, step: 0.5 },
    { label: "opacity", atom: opacitySlider, min: 0.1, max: 1, step: 0.05 },
    { label: "visible", atom: visibleToggle, min: 0, max: 1, step: 1 },
  ];

  return { scene, camera, sliders };
}

function Slider({ spec }: { spec: SliderSpec }) {
  const [value, setValue] = useAtomState(spec.atom);
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#999" }}>
      <span style={{ width: 72, flexShrink: 0 }}>
        {spec.label}:{" "}
        {spec.label === "arrows"
          ? ARROW_MODES[Math.round(value)]
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

function ViewPane({
  scene,
  camera,
  renderer,
}: {
  scene: Scene2D;
  camera: ReturnType<Scene2D["create"]>;
  renderer: "threejs" | "svg";
}) {
  return (
    <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
      <Scene2DView
        scene={scene}
        camera={camera}
        renderer={renderer}
        style={{ width: "100%", height: "100%" }}
      />
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 10,
          color: "#777",
          fontSize: 12,
          pointerEvents: "none",
        }}
      >
        {renderer}
      </div>
    </div>
  );
}

export default function Demo1() {
  const { scene, camera, sliders } = useMemo(buildScene, []);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        <ViewPane scene={scene} camera={camera} renderer="threejs" />
        <div style={{ width: 1, backgroundColor: "#2a2a2a" }} />
        <ViewPane scene={scene} camera={camera} renderer="svg" />
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          width: 260,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: 12,
          borderRadius: 6,
          backgroundColor: "rgba(22, 22, 22, 0.9)",
          border: "1px solid #2a2a2a",
        }}
      >
        {sliders.map((spec) => (
          <Slider key={spec.label} spec={spec} />
        ))}
      </div>
    </div>
  );
}
