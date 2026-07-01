import { useMemo, type ReactNode } from "react";
import { Scene2D, Vec2, vec2, type ItemTags, type WritableBoundAtom } from "uzay";
import { Scene2DView, useAtomState } from "uzay/react";

// SVG backend test bench.
//
// One scene on the SVG renderer where every 2D item kind has a live control
// or interaction driving its reactive fields: sliders mutate atoms, points
// drag, the circle takes clicks, the vector tip reacts to hover, and a camera
// tag filter hides a whole group. The point is to exercise every renderer
// code path (update, layout, visibility, hit-testing) under real interaction.

const CHECKLIST = [
  "Drag the amber points: vector, guide line, region, circle follow live",
  "Slider point on the x-axis only drags horizontally; its guide + readout track",
  "Hover the vector tip: it grows; leave: it shrinks back",
  "Click the circle's fill (not its center point): fill + outline cycle colors",
  "θ-end slider: wedge sweeps open, snaps to a clean full circle at 2π",
  "Pole slider: the 1/(x−c) gap slides along, never a vertical wall",
  "Lissajous t-end scrub draws the curve; a/b change its lobes",
  "Axes toggles: labels/arrows/ticks appear and disappear cleanly",
  "Hide tagged items: Lissajous, region, circle vanish; their points stop dragging",
  "Sine visible toggle: curve hides, everything else keeps working",
  "Pan/zoom after all of the above: pixel-sized handles, re-stepping grid/ticks",
];

const CIRCLE_COLORS = ["#f59e0b", "#f97583", "#34d399", "#4f9cf9"];
const EXTRAS: ItemTags = ["extras"];

function buildScene() {
  const scene = new Scene2D();

  const showExtras = scene.atom<ItemTags | undefined>(undefined);
  const camera = scene.create("camera2d", {
    center: vec2(0, 0),
    zoom: 1.2,
    visibleTags: showExtras,
  });

  // Grid & axes
  const gridOpacity = scene.atom(0.1);
  scene.create("grid2d", {
    rangeX: true,
    rangeY: true,
    gap: "auto",
    color: "white",
    opacity: gridOpacity,
  });

  const axesLabels = scene.atom(true);
  const axesArrows = scene.atom(true);
  const axesTicks = scene.atom(true);
  scene.create("axes2d", {
    x: true,
    y: true,
    color: "#888",
    thickness: 1.1,
    tickmarks: axesTicks,
    tickStep: "auto",
    arrows: axesArrows,
    labels: axesLabels,
  });

  // Sine: amplitude/frequency atoms, infinite domain (viewport resampling)
  const sineAmp = scene.atom(1.5);
  const sineFreq = scene.atom(1);
  const sineVisible = scene.atom(true);
  scene.create("function2d", {
    f: scene.atom((get) => {
      const amp = get(sineAmp);
      const freq = get(sineFreq);
      return (x: number) => Math.sin(x * freq) * amp;
    }),
    domain: "infinite",
    color: "#4f9cf9",
    thickness: 3,
    visible: sineVisible,
  });

  // Rational curve with a movable pole: the declared discontinuity follows it
  const pole = scene.atom(1);
  scene.create("function2d", {
    f: scene.atom((get) => {
      const c = get(pole);
      return (x: number) => 1 / (x - c);
    }),
    discontinuities: scene.atom((get) => [get(pole)]),
    domain: [-8, 8],
    samples: 500,
    color: "#f97583",
    thickness: 2,
  });

  // Lissajous, drawn by a t-end scrub (tagged: hides with "extras")
  const lissA = scene.atom(3);
  const lissB = scene.atom(2);
  const lissTEnd = scene.atom(Math.PI * 2);
  scene.create("parametricfunction2d", {
    f: scene.atom((get) => {
      const a = get(lissA);
      const b = get(lissB);
      return (t: number) =>
        vec2(Math.cos(a * t) * 0.9 - 3.2, Math.sin(b * t) * 0.9 + 2.2);
    }),
    tStart: 0,
    tEnd: lissTEnd,
    samples: 512,
    color: "#34d399",
    thickness: 2,
    tags: EXTRAS,
  });

  // Region: a triangle whose vertices are draggable points (tagged)
  const r1 = scene.create("point2d", {
    coords: vec2(-4.4, -1.2), draggable: "xy", color: "#a78bfa", radius: 6, tags: EXTRAS,
  });
  const r2 = scene.create("point2d", {
    coords: vec2(-2.4, -1.2), draggable: "xy", color: "#a78bfa", radius: 6, tags: EXTRAS,
  });
  const r3 = scene.create("point2d", {
    coords: vec2(-3.4, -2.8), draggable: "xy", color: "#a78bfa", radius: 6, tags: EXTRAS,
  });
  scene.create("region2d", {
    points: scene.atom((get) => [get(r1.coords), get(r2.coords), get(r3.coords)]),
    color: "#a78bfa",
    opacity: 0.25,
    strokeColor: "#a78bfa",
    strokeThickness: 2,
    tags: EXTRAS,
  });

  // Circle: draggable center, radius + arc sweep sliders, click cycles color
  const circleCenter = scene.create("point2d", {
    coords: vec2(3.4, 2.2), draggable: "xy", color: "#f59e0b", radius: 6, tags: EXTRAS,
  });
  const circleRadius = scene.atom(0.9);
  const circleThetaEnd = scene.atom(Math.PI * 2);
  const circleColorIdx = scene.atom(0);
  const circleColor = scene.atom((get) => CIRCLE_COLORS[get(circleColorIdx)]);
  const circle = scene.create("circle2d", {
    center: circleCenter.coords,
    radius: circleRadius,
    thetaStart: 0,
    thetaEnd: circleThetaEnd,
    color: circleColor,
    opacity: 0.2,
    strokeColor: circleColor,
    strokeThickness: 2,
    tags: EXTRAS,
  });
  circle.on("click", () => {
    circleColorIdx.set((circleColorIdx.get() + 1) % CIRCLE_COLORS.length);
  });

  // Vector between two draggable points; the tip point reacts to hover
  const vecTail = scene.create("point2d", {
    coords: vec2(0.6, -1.8), draggable: "xy", color: "#ffb547", radius: 7,
  });
  const tipHovered = scene.atom(false);
  const vecTip = scene.create("point2d", {
    coords: vec2(2.2, -0.6),
    draggable: "xy",
    color: "#ffb547",
    radius: scene.atom((get) => (get(tipHovered) ? 11 : 7)),
  });
  vecTip.on("hover", (e) => {
    if (e.phase === "enter") tipHovered.set(true);
    if (e.phase === "leave") tipHovered.set(false);
  });

  const headLength = scene.atom(12);
  const headWidth = scene.atom(10);
  scene.create("vector2d", {
    origin: vecTail.coords,
    vector: scene.atom((get) => Vec2.subtract(get(vecTip.coords), get(vecTail.coords))),
    color: "#34d399",
    thickness: 2.5,
    headLength,
    headWidth,
  });

  scene.create("overlay2d", {
    position: vecTip.coords,
    content: scene.atom((get) => {
      const p = get(vecTip.coords);
      return `\\vec{v} \\to (${p.x.toFixed(2)},\\ ${p.y.toFixed(2)})`;
    }),
    format: "latex",
    anchor: "bottom",
    offset: vec2(0, -14),
    style: "color: #ffd9a0; font-size: 13px;",
    pointerEvents: "none",
  });

  // Axis-constrained slider point with a vertical guide line and readout
  const slider = scene.create("point2d", {
    coords: vec2(-1.5, 0), draggable: "x", color: "#f97583", radius: 7,
  });
  scene.create("line2d", {
    start: scene.atom((get) => vec2(get(slider.coords).x, -4.5)),
    end: scene.atom((get) => vec2(get(slider.coords).x, 4.5)),
    color: "#f97583",
    thickness: 1.5,
    opacity: 0.5,
    pointerEvents: "none",
  });
  scene.create("overlay2d", {
    position: slider.coords,
    content: scene.atom((get) => `x = ${get(slider.coords).x.toFixed(2)}`),
    format: "latex",
    anchor: "top",
    offset: vec2(0, 14),
    style: "color: #ffa3ae; font-size: 13px;",
    pointerEvents: "none",
  });

  return {
    scene,
    camera,
    atoms: {
      showExtras,
      gridOpacity,
      axesLabels,
      axesArrows,
      axesTicks,
      sineAmp,
      sineFreq,
      sineVisible,
      pole,
      lissA,
      lissB,
      lissTEnd,
      circleRadius,
      circleThetaEnd,
      headLength,
      headWidth,
    },
  };
}

type SceneAtoms = ReturnType<typeof buildScene>["atoms"];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ color: "#ccc", fontSize: 12, fontWeight: 600 }}>{title}</div>
      {children}
    </div>
  );
}

function Slider({
  label,
  atom,
  min,
  max,
  step,
}: {
  label: string;
  atom: WritableBoundAtom<number>;
  min: number;
  max: number;
  step: number;
}) {
  const [value, setValue] = useAtomState(atom);
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#999" }}>
      <span style={{ width: 86, flexShrink: 0 }}>
        {label}: {value.toFixed(step >= 1 ? 0 : 2)}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(parseFloat(e.target.value))}
        style={{ width: "100%" }}
      />
    </label>
  );
}

function Toggle({
  label,
  atom,
}: {
  label: string;
  atom: SceneAtoms["axesLabels"];
}) {
  const [on, setOn] = useAtomState(atom);
  return (
    <button
      onClick={() => setOn(!on)}
      style={{
        padding: "4px 8px",
        border: "1px solid #444",
        borderRadius: 4,
        backgroundColor: on ? "#264d2a" : "#4d2626",
        color: "#ddd",
        fontSize: 11,
        cursor: "pointer",
      }}
    >
      {label}: {String(on)}
    </button>
  );
}

function ExtrasToggle({ atom }: { atom: SceneAtoms["showExtras"] }) {
  const [tags, setTags] = useAtomState(atom);
  const visible = tags === undefined;
  return (
    <button
      onClick={() => setTags(visible ? [] : undefined)}
      style={{
        padding: "4px 8px",
        border: "1px solid #444",
        borderRadius: 4,
        backgroundColor: visible ? "#264d2a" : "#4d2626",
        color: "#ddd",
        fontSize: 11,
        cursor: "pointer",
      }}
    >
      tagged items (Lissajous, region, circle): {visible ? "shown" : "hidden"}
    </button>
  );
}

export default function Demo1() {
  const { scene, camera, atoms } = useMemo(buildScene, []);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex" }}>
      <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
        <Scene2DView
          scene={scene}
          camera={camera}
          renderer="svg"
          style={{ width: "100%", height: "100%" }}
        />
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 10,
            color: "#777",
            fontSize: 12,
            fontFamily: "system-ui, sans-serif",
            pointerEvents: "none",
          }}
        >
          renderer: svg
        </div>
      </div>

      <div
        style={{
          width: 300,
          flexShrink: 0,
          overflowY: "auto",
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          backgroundColor: "#161616",
          borderLeft: "1px solid #2a2a2a",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <Section title="Grid & axes">
          <Slider label="grid opacity" atom={atoms.gridOpacity} min={0} max={0.4} step={0.01} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Toggle label="labels" atom={atoms.axesLabels} />
            <Toggle label="arrows" atom={atoms.axesArrows} />
            <Toggle label="ticks" atom={atoms.axesTicks} />
          </div>
        </Section>

        <Section title="Sine (function2d, infinite domain)">
          <Slider label="amplitude" atom={atoms.sineAmp} min={0.2} max={2.5} step={0.05} />
          <Slider label="frequency" atom={atoms.sineFreq} min={0.5} max={3} step={0.05} />
          <Toggle label="visible" atom={atoms.sineVisible} />
        </Section>

        <Section title="Pole (function2d, discontinuity)">
          <Slider label="pole c" atom={atoms.pole} min={-3} max={3} step={0.05} />
        </Section>

        <Section title="Lissajous (parametricfunction2d)">
          <Slider label="a" atom={atoms.lissA} min={1} max={5} step={1} />
          <Slider label="b" atom={atoms.lissB} min={1} max={5} step={1} />
          {/* Step divides 2π exactly so the slider can close the curve. */}
          <Slider label="t end" atom={atoms.lissTEnd} min={0} max={Math.PI * 2} step={Math.PI / 64} />
        </Section>

        <Section title="Circle (circle2d)">
          <Slider label="radius" atom={atoms.circleRadius} min={0.3} max={2} step={0.05} />
          {/* Step divides 2π exactly so the slider can reach the full circle. */}
          <Slider label="θ end" atom={atoms.circleThetaEnd} min={0} max={Math.PI * 2} step={Math.PI / 64} />
          <div style={{ color: "#777", fontSize: 11 }}>
            click the circle's fill to cycle its color (dead center is the draggable center point)
          </div>
        </Section>

        <Section title="Vector (vector2d)">
          <Slider label="head length" atom={atoms.headLength} min={6} max={28} step={1} />
          <Slider label="head width" atom={atoms.headWidth} min={4} max={22} step={1} />
          <div style={{ color: "#777", fontSize: 11 }}>hover the tip point: it grows</div>
        </Section>

        <Section title="Camera tags">
          <ExtrasToggle atom={atoms.showExtras} />
        </Section>

        <Section title="Checklist">
          <ul style={{ margin: 0, paddingLeft: 16, color: "#888", fontSize: 11, lineHeight: 1.5 }}>
            {CHECKLIST.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}
