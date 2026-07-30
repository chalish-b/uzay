import { useMemo } from "react";
import { Scene2D, vec2, type WritableBoundAtom } from "uzay";
import { Scene2DView, useAtomState } from "uzay/react";

// Dashed function2d / parametricfunction2d sandbox, threejs and svg side by
// side (shared camera, so pan/zoom stays in sync for comparison).
//
// - orange curve: a·sin(x) on an infinite domain. The dashed toggle, thickness
//   and opacity sliders drive it; amplitude changes the function itself, so
//   every geometry rebuild recomputes the dash distances. Pan and zoom to
//   check the dash rhythm stays pixel-constant while the curve resamples.
// - cyan curve: 1/(x − 2) with a discontinuity at x = 2, always dashed. The
//   dash pattern must not bleed across the asymptote gap, and the two branches
//   each read as cleanly dashed.
// - lime curve: a finite domain [−6, −1] with a closed start and open end
//   marker, always dashed. The endpoint markers stay solid (a filled disc and
//   a ring), only the stroke dashes.
// - hotpink curve: a parametric spiral, following the same dashed toggle. The
//   turns slider changes f while dashed, same rebuild check as amplitude.
// - edge cases to try: thickness at 0.5 (dash floor of 4px/3px kicks in),
//   thickness at 6 (long dashes), deep zoom in/out on the infinite curve
//   (resampling under a constant on-screen pattern), toggling dashed while
//   zoomed (solid and dashed must agree on geometry).

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
    zoom: 0.8,
  });

  scene.create("grid2d", {
    rangeX: [-14, 14],
    rangeY: [-10, 10],
    gap: 1,
    color: "white",
    opacity: 0.1,
  });
  scene.create("axes2d", {
    x: true,
    y: true,
    color: "white",
    thickness: 1,
    arrows: "none",
  });

  const dashedNum = scene.atom(1);
  const thickness = scene.atom(2);
  const opacity = scene.atom(1);
  const amplitude = scene.atom(2);
  const turns = scene.atom(3);

  const dashed = scene.atom((get) => get(dashedNum) > 0.5);

  // The main curve: infinite domain, all sliders wired.
  scene.create("function2d", {
    f: scene.atom((get) => {
      const a = get(amplitude);
      return (x: number) => a * Math.sin(x);
    }),
    domain: "infinite",
    color: "orange",
    thickness,
    opacity,
    dashed,
  });

  // Dashes across an asymptote break.
  scene.create("function2d", {
    f: (x) => 1 / (x - 2),
    domain: "infinite",
    discontinuities: [2],
    color: "cyan",
    thickness: 1.5,
    dashed: true,
  });

  // Dashes with endpoint markers on a finite domain.
  scene.create("function2d", {
    f: (x) => 0.25 * (x + 3.5) * (x + 3.5) - 4,
    domain: [-6, -1],
    endpoints: { start: "closed", end: "open" },
    color: "lime",
    thickness: 2,
    dashed: true,
  });

  // The parametric counterpart: a spiral, sharing the dashed toggle.
  scene.create("parametricfunction2d", {
    f: scene.atom((get) => {
      const k = get(turns);
      return (t: number) => {
        const th = t * k * Math.PI * 2;
        const r = 0.4 + 3 * t;
        return vec2(7 + r * Math.cos(th), 3 + r * Math.sin(th));
      };
    }),
    tStart: 0,
    tEnd: 1,
    color: "hotpink",
    thickness,
    dashed,
  });

  const sliders: SliderSpec[] = [
    {
      label: "dashed",
      atom: dashedNum,
      min: 0,
      max: 1,
      step: 1,
      display: (v) => (v > 0.5 ? "on" : "off"),
    },
    { label: "thickness", atom: thickness, min: 0.5, max: 6, step: 0.1 },
    { label: "opacity", atom: opacity, min: 0.1, max: 1, step: 0.01 },
    { label: "amplitude", atom: amplitude, min: 0.5, max: 4, step: 0.01 },
    { label: "spiral turns", atom: turns, min: 1, max: 6, step: 0.01 },
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
          dashed curves sandbox
        </span>
        {sliders.map((spec) => (
          <Slider key={spec.label} spec={spec} />
        ))}
      </div>
    </div>
  );
}
