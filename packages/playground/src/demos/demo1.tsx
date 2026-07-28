import { useMemo } from "react";
import { Scene2D, vec2, type Vec2, type WritableBoundAtom } from "uzay";
import type { ArrowEnds } from "uzay";
import { Scene2DView, useAtomState } from "uzay/react";

// The line's value-to-world mapping, restated demo-side: a value v lands at
// position + direction(angle) · scale · v, and a world point projects back
// to a value via the dot product with the direction.
const valueToWorld = (position: Vec2, angle: number, scale: number, value: number) =>
  position.add(vec2(Math.cos(angle), Math.sin(angle)).scale(scale * value));
const worldToValue = (position: Vec2, angle: number, scale: number, point: Vec2) =>
  point.sub(position).dot(vec2(Math.cos(angle), Math.sin(angle))) / scale;

// numberLine2d sandbox, threejs and svg side by side (shared camera, so
// pan/zoom stays in sync for comparison).
//
// - orange line: the main number line, fully reactive. Sliders drive its
//   position, angle, scale, range, tick step, and arrow mode. Ticks and
//   labels are the line's OWN values: move/rotate/scale it and they travel
//   with it. scale stretches tick spacing in world space while the values
//   stay put; range controls which values are visible.
// - hotpink point: draggable anywhere. It projects orthogonally onto the
//   main line; the white foot marker sits at the projected value and the
//   label reads it. This checks the demo-side mapping stays consistent with
//   the item's own rendering under every slider (the foot must ride the
//   drawn line exactly, its label matching the tick labels).
// - skyblue line: a fixed vertical number line (angle π/2, scale 0.5) with
//   no controls, to check an off-axis orientation stays correct while the
//   main one changes.
// - the faint white axes2d pair is world scaffolding, for seeing that the
//   number lines' labels are independent of world coordinates.
// - a tick landing on an end that carries an arrowhead is dropped, label
//   included (the head replaces it); switch arrows to none to get it back.
//   tick length / head length / head width are the px size dials.
// - edge cases to try: scale close to 0.2 with tickStep 0.5 (dense ticks),
//   angle full circle (labels flip sides at ±90°), range min > max is not
//   guarded and draws nothing, zoom in/out (pixel-constant ticks, arrows,
//   label offsets), "auto" tick step re-stepping under zoom.

const ARROW_MODES: ArrowEnds[] = ["none", "start", "end", "both"];
const TICK_STEPS: (number | "auto")[] = [0.5, 1, 2, "auto"];

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
    center: vec2(0, 1),
    zoom: 0.55,
  });

  scene.create("grid2d", {
    rangeX: [-14, 14],
    rangeY: [-10, 12],
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

  const posX = scene.atom(0);
  const posY = scene.atom(3);
  const angle = scene.atom(0);
  const scale = scene.atom(1);
  const rangeMin = scene.atom(-5);
  const rangeMax = scene.atom(5);
  const tickStepIndex = scene.atom(1);
  const arrowMode = scene.atom(3);
  const tickLength = scene.atom(12);
  const headLength = scene.atom(14);
  const headWidth = scene.atom(10);

  scene.create("numberline2d", {
    position: scene.atom((get) => vec2(get(posX), get(posY))),
    angle,
    scale,
    range: scene.atom((get): [number, number] => [get(rangeMin), get(rangeMax)]),
    tickStep: scene.atom((get) => TICK_STEPS[Math.round(get(tickStepIndex))]),
    arrows: scene.atom((get) => ARROW_MODES[Math.round(get(arrowMode))]),
    tickLength,
    headLength,
    headWidth,
    color: "orange",
    thickness: 1.5,
  });

  // The fixed off-axis line: vertical, half world scale.
  scene.create("numberline2d", {
    position: vec2(-9, -2),
    angle: Math.PI / 2,
    scale: 0.5,
    range: [-4, 8],
    color: "skyblue",
    thickness: 1.5,
    arrows: "end",
  });

  // A free point projecting onto the main line.
  const freePoint = scene.atom(vec2(3, 6));
  const projectedValue = scene.atom((get) =>
    worldToValue(vec2(get(posX), get(posY)), get(angle), get(scale), get(freePoint)),
  );
  const foot = scene.atom((get) =>
    valueToWorld(vec2(get(posX), get(posY)), get(angle), get(scale), get(projectedValue)),
  );

  scene.create("line2d", {
    start: freePoint,
    end: foot,
    color: "white",
    thickness: 1,
    dashed: true,
    opacity: 0.5,
    pointerEvents: "none",
  });
  scene.create("point2d", {
    coords: foot,
    draggable: "none",
    color: "white",
    radius: 4,
    pointerEvents: "none",
  });
  scene.create("overlay2d", {
    position: foot,
    content: scene.atom((get) => `value: ${get(projectedValue).toFixed(2)}`),
    format: "text",
    anchor: "bottom-left",
    offset: vec2(10, -10),
    style: "color: #eee; font-size: 12px; text-shadow: 0 1px 2px black;",
  });
  scene.create("point2d", {
    coords: freePoint,
    draggable: "xy",
    color: "hotpink",
  });

  const sliders: SliderSpec[] = [
    { label: "position x", atom: posX, min: -8, max: 8, step: 0.01 },
    { label: "position y", atom: posY, min: -6, max: 8, step: 0.01 },
    {
      label: "angle",
      atom: angle,
      min: -Math.PI,
      max: Math.PI,
      step: 0.01,
      display: (v) => `${((v * 180) / Math.PI).toFixed(0)}°`,
    },
    { label: "scale", atom: scale, min: 0.2, max: 3, step: 0.01 },
    { label: "range min", atom: rangeMin, min: -10, max: 0, step: 0.5 },
    { label: "range max", atom: rangeMax, min: 0, max: 10, step: 0.5 },
    {
      label: "tick step",
      atom: tickStepIndex,
      min: 0,
      max: TICK_STEPS.length - 1,
      step: 1,
      display: (v) => `${TICK_STEPS[Math.round(v)]}`,
    },
    {
      label: "arrows",
      atom: arrowMode,
      min: 0,
      max: ARROW_MODES.length - 1,
      step: 1,
      display: (v) => ARROW_MODES[Math.round(v)],
    },
    { label: "tick length", atom: tickLength, min: 4, max: 24, step: 1 },
    { label: "head length", atom: headLength, min: 6, max: 28, step: 1 },
    { label: "head width", atom: headWidth, min: 4, max: 20, step: 1 },
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
          numberLine2d sandbox
        </span>
        {sliders.map((spec) => (
          <Slider key={spec.label} spec={spec} />
        ))}
      </div>
    </div>
  );
}
