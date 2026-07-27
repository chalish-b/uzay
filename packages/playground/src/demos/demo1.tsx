import { useMemo } from "react";
import { Scene2D, functionArea2D, vec2, type WritableBoundAtom } from "uzay";
import type { FunctionArea2DBaseline, SceneAtom } from "uzay";
import { Scene2DView, useAtomState, useAtomValue } from "uzay/react";

// functionArea2D baseline sandbox, threejs and svg side by side (shared
// camera, so pan/zoom stays in sync for comparison).
//
// - dodgerblue curve: f(x) = amp·sin(1.1x) + 0.5, amp reactive via slider.
// - orange curve: the baseline. The mode slider swaps what the SAME baseline
//   atom holds: the number 0, the number c, a line 0.4x + c, or a parabola
//   0.25x² + c − 3. Switching number ↔ function live must restyle the fill
//   with no rebuild; c morphs both the numeric and function baselines.
// - fill: green lobes where f is above the baseline, tomato below, white
//   stroke outlining every lobe. Lobes must split exactly at each crossing,
//   for function baselines too.
// - signed / absolute area readouts (bottom panel) must track every slider:
//   signed = ∫(f − baseline), absolute = lobes summed unsigned. With the
//   region fully one-sided the two must agree up to sign.
// - edge cases to try: drag a past b (bounds swap, area unchanged), a = b
//   (zero width, both areas 0, nothing drawn, no crash), amp = 0 with mode
//   "constant c" and c = 0.5 (f coincides with the baseline: everything
//   vanishes, areas 0), samples = 1 (clamps to 2, coarse but alive).

const BASELINE_MODES = ["0", "constant c", "line 0.4x + c", "parabola"] as const;

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

  const boundA = scene.atom(-5);
  const boundB = scene.atom(5);
  const amp = scene.atom(1.6);
  const baselineMode = scene.atom(3);
  const baselineC = scene.atom(0);
  const samples = scene.atom(128);

  // Reactive f: the closure is rebuilt whenever amp changes.
  const f = scene.atom((get) => {
    const a = get(amp);
    return (x: number) => a * Math.sin(1.1 * x) + 0.5;
  });

  // The baseline atom holds a number OR a function depending on the mode, so
  // the union reactivity is exercised in one place.
  const baseline = scene.atom((get): FunctionArea2DBaseline => {
    const mode = Math.round(get(baselineMode));
    const c = get(baselineC);
    switch (mode) {
      case 0:
        return 0;
      case 1:
        return c;
      case 2:
        return (x: number) => 0.4 * x + c;
      default:
        return (x: number) => 0.25 * x * x + c - 3;
    }
  });

  const area = functionArea2D(scene, {
    f,
    a: boundA,
    b: boundB,
    baseline,
    samples,
    color: "mediumseagreen",
    colorBelow: "tomato",
    opacity: 0.4,
    strokeColor: "white",
    strokeOpacity: 0.5,
    strokeThickness: 1,
  });

  scene.create("function2d", {
    f,
    domain: "infinite",
    color: "dodgerblue",
    thickness: 2.5,
  });

  // The baseline drawn as a curve, normalized to a function so the numeric
  // modes show as a horizontal line.
  scene.create("function2d", {
    f: scene.atom((get) => {
      const b = get(baseline);
      return typeof b === "number" ? () => b : b;
    }),
    domain: "infinite",
    color: "orange",
    thickness: 1.5,
    opacity: 0.8,
  });

  const sliders: SliderSpec[] = [
    { label: "a", atom: boundA, min: -8, max: 8, step: 0.01 },
    { label: "b", atom: boundB, min: -8, max: 8, step: 0.01 },
    { label: "f amplitude", atom: amp, min: 0, max: 3, step: 0.01 },
    {
      label: "baseline",
      atom: baselineMode,
      min: 0,
      max: BASELINE_MODES.length - 1,
      step: 1,
      display: (value) => BASELINE_MODES[Math.round(value)],
    },
    { label: "baseline c", atom: baselineC, min: -3, max: 3, step: 0.01 },
    { label: "samples", atom: samples, min: 1, max: 300, step: 1 },
  ];

  return {
    scene,
    camera,
    sliders,
    signedArea: area.signedArea,
    absoluteArea: area.absoluteArea,
  };
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

function AreaReadout({
  signedArea,
  absoluteArea,
}: {
  signedArea: SceneAtom<number>;
  absoluteArea: SceneAtom<number>;
}) {
  const signed = useAtomValue<number>(signedArea);
  const absolute = useAtomValue<number>(absoluteArea);
  return (
    <span style={{ fontSize: 11, color: "#ccc", fontFamily: "monospace" }}>
      signed = {signed.toFixed(3)} · absolute = {absolute.toFixed(3)}
    </span>
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
  const { scene, camera, sliders, signedArea, absoluteArea } = useMemo(
    buildScene,
    []
  );

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
          functionArea2D baseline sandbox
        </span>
        {sliders.map((spec) => (
          <Slider key={spec.label} spec={spec} />
        ))}
        <AreaReadout signedArea={signedArea} absoluteArea={absoluteArea} />
      </div>
    </div>
  );
}
