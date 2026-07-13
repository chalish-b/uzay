import { useMemo } from "react";
import { Scene2D, angleMark2D, functionPoint2D, segmentMark2D, vec2, type WritableBoundAtom } from "uzay";
import { Scene2DView, useAtomState } from "uzay/react";

// Reactive mark options sandbox.
//
// Every construction option here is an atom: the sliders retarget marks live.
// - variant flips the segment mark between ticks and chevrons; count fans 1-3
// - marker cycles the green angle through none / tick / dot; its markers
//   reuse the count slider
// - sweep walks minor / major / ccw / cw on the green angle: the arc swaps
//   sides and grows through 180°
// - square toggles squareRightAngle on the red right angle
// - domain widens/narrows the purple curve handle's reach: drag it against
//   the bound
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

function buildScene() {
  const scene = new Scene2D();
  const camera = scene.create("camera2d", { center: vec2(0, 0), zoom: 1 });
  scene.create("grid2d", {
    rangeX: true,
    rangeY: true,
    gap: "auto",
    color: "white",
    opacity: 0.08,
  });
  scene.create("axes2d", {
    x: true,
    y: true,
    color: "#888",
    thickness: 1,
    tickmarks: true,
    tickStep: "auto",
    labels: true,
  });

  const variantToggle = scene.atom(0);
  const countSlider = scene.atom(1);
  const markerSlider = scene.atom(0);
  const sweepSlider = scene.atom(0);
  const squareToggle = scene.atom(1);
  const domainSlider = scene.atom(3);

  // A marked segment whose variant and count are both atoms.
  const segA = scene.create("point2d", { coords: vec2(-4.5, 2.5), color: "#ffd166" });
  const segB = scene.create("point2d", { coords: vec2(-0.5, 3.2), color: "#ffd166" });
  scene.create("line2d", { start: segA.coords, end: segB.coords, color: "#ccc", thickness: 2 });
  segmentMark2D(scene, {
    a: segA.coords,
    b: segB.coords,
    variant: scene.atom((get) =>
      get(variantToggle) > 0.5 ? ("arrow" as const) : ("tick" as const)
    ),
    count: scene.atom((get) => Math.round(get(countSlider)) as 1 | 2 | 3),
    color: "#4f9cf9",
    thickness: 2,
    size: 0.3,
  });

  // An angle whose marker, marker count, and sweep are atoms.
  const SWEEPS = ["minor", "major", "ccw", "cw"] as const;
  const MARKERS = ["none", "tick", "dot"] as const;
  const vertex = vec2(2.5, 1);
  const arm = scene.create("point2d", { coords: vec2(4.5, 2.5), color: "#ffd166" });
  scene.create("line2d", { start: vertex, end: arm.coords, color: "#ccc", thickness: 2 });
  scene.create("line2d", { start: vertex, end: vec2(0.8, 3), color: "#ccc", thickness: 2 });
  angleMark2D(scene, {
    vertex,
    a: arm.coords,
    b: vec2(0.8, 3),
    radius: 0.7,
    color: "#34d399",
    marker: scene.atom((get) => MARKERS[Math.round(get(markerSlider))]),
    markerCount: scene.atom((get) => Math.round(get(countSlider)) as 1 | 2 | 3),
    sweep: scene.atom((get) => SWEEPS[Math.round(get(sweepSlider))]),
  });

  // A right angle whose squareRightAngle flag is an atom.
  const sqVertex = vec2(-3.5, -1.5);
  const sqArm = scene.create("point2d", { coords: vec2(-1.5, -1.5), color: "#ffd166" });
  scene.create("line2d", { start: sqVertex, end: sqArm.coords, color: "#ccc", thickness: 2 });
  scene.create("line2d", { start: sqVertex, end: vec2(-3.5, 0.5), color: "#ccc", thickness: 2 });
  angleMark2D(scene, {
    vertex: sqVertex,
    a: sqArm.coords,
    b: vec2(-3.5, 0.5),
    radius: 0.6,
    color: "#f97583",
    squareRightAngle: scene.atom((get) => get(squareToggle) > 0.5),
  });

  // A curve handle whose domain clamp is an atom. The clamp applies while
  // dragging, so tighten it and the handle stops at the new bound.
  const f = (x: number) => Math.sin(x * 1.4) * 0.6 - 3.2;
  scene.create("function2d", { f, domain: "infinite", color: "#a78bfa", thickness: 2 });
  functionPoint2D(scene, {
    f,
    x: 1,
    color: "#a78bfa",
    domain: scene.atom(
      (get) => [-get(domainSlider), get(domainSlider)] as [number, number]
    ),
  });

  const sliders: SliderSpec[] = [
    { label: "variant", atom: variantToggle, min: 0, max: 1, step: 1 },
    { label: "count", atom: countSlider, min: 1, max: 3, step: 1 },
    { label: "marker", atom: markerSlider, min: 0, max: 2, step: 1 },
    { label: "sweep", atom: sweepSlider, min: 0, max: 3, step: 1 },
    { label: "square", atom: squareToggle, min: 0, max: 1, step: 1 },
    { label: "domain", atom: domainSlider, min: 0.5, max: 5, step: 0.1 },
  ];

  return { scene, camera, sliders };
}

function Slider({ spec }: { spec: SliderSpec }) {
  const [value, setValue] = useAtomState(spec.atom);
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#999" }}>
      <span style={{ width: 64, flexShrink: 0 }}>
        {spec.label}: {value.toFixed(spec.step >= 1 ? 0 : 3)}
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
