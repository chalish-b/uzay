import { useMemo, useState } from "react";
import { Scene2D, angleMark2D, segmentMark2D, vec2, type WritableBoundAtom } from "uzay";
import { Scene2DView, useAtomState } from "uzay/react";

// Dash & mark test bench.
//
// Exercises dashed strokes (line2d, circle2d), segmentMark2D (ticks, arrows),
// and angleMark2D decorations (ticks, dots). Each case is one scene rendered
// by BOTH backends side by side (threejs left, svg right) with a shared
// camera, so pan/zoom stays in sync and any visual difference between the
// backends is immediately obvious.
//
// General checks that apply to every case:
// - both backends look identical
// - dash rhythm and mark sizes behave under pan/zoom as described
// - dragging any handle keeps everything attached, nothing lags or detaches

type SliderSpec = {
  label: string;
  atom: WritableBoundAtom<number>;
  min: number;
  max: number;
  step: number;
};

type BenchCase = {
  id: string;
  title: string;
  notes: string[];
  build: () => {
    scene: Scene2D;
    camera: ReturnType<Scene2D["create"]>;
    sliders: SliderSpec[];
  };
};

function baseScene(center = vec2(0, 0), zoom = 1) {
  const scene = new Scene2D();
  const camera = scene.create("camera2d", { center, zoom });
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
  return { scene, camera };
}

const CASES: BenchCase[] = [
  {
    id: "dashed-lines",
    title: "Dashed lines",
    notes: [
      "Dash length scales with thickness: thicker rows have longer dashes",
      "Zoom in/out: the on-screen dash rhythm stays constant, like thickness",
      "Drag the yellow handle: dashes recompute while the segment stretches",
      "The 'dashed' slider toggles the red line between solid and dashed",
      "Solid top row is the reference: caps round, dashed rows cut flat",
    ],
    build: () => {
      const { scene, camera } = baseScene();
      scene.create("line2d", {
        start: vec2(-4, 3),
        end: vec2(4, 3),
        color: "#4f9cf9",
        thickness: 2,
      });
      scene.create("line2d", {
        start: vec2(-4, 2),
        end: vec2(4, 2),
        color: "#4f9cf9",
        thickness: 1,
        dashed: true,
      });
      scene.create("line2d", {
        start: vec2(-4, 1),
        end: vec2(4, 1),
        color: "#4f9cf9",
        thickness: 2,
        dashed: true,
      });
      scene.create("line2d", {
        start: vec2(-4, 0),
        end: vec2(4, 0),
        color: "#4f9cf9",
        thickness: 4,
        dashed: true,
      });

      const handle = scene.create("point2d", {
        coords: vec2(3, -1.5),
        color: "#ffd166",
      });
      scene.create("line2d", {
        start: vec2(-4, -1.5),
        end: handle.coords,
        color: "#ffd166",
        thickness: 2,
        dashed: true,
      });

      const dashedToggle = scene.atom(1);
      scene.create("line2d", {
        start: vec2(-4, -3),
        end: vec2(4, -3),
        color: "#f97583",
        thickness: 2,
        dashed: scene.atom((get) => get(dashedToggle) > 0.5),
      });
      return {
        scene,
        camera,
        sliders: [
          { label: "dashed", atom: dashedToggle, min: 0, max: 1, step: 1 },
        ],
      };
    },
  },
  {
    id: "dashed-circles",
    title: "Dashed circles + arcs",
    notes: [
      "Grow the radius: dash count increases, dash length stays put on screen",
      "The arc dashes along its curve only; the sector fill is untouched",
      "Solid circle is the reference for stroke weight and color",
      "Zoom: circle dashes and line dashes share one rhythm at equal thickness",
    ],
    build: () => {
      const { scene, camera } = baseScene();
      const radiusAtom = scene.atom(2);
      scene.create("circle2d", {
        center: vec2(-2, 0.5),
        radius: radiusAtom,
        strokeColor: "#4f9cf9",
        strokeThickness: 2,
        strokeDashed: true,
      });
      scene.create("circle2d", {
        center: vec2(2.5, 1),
        radius: 1.5,
        thetaStart: 0,
        thetaEnd: Math.PI * 1.25,
        color: "#34d399",
        opacity: 0.12,
        strokeColor: "#34d399",
        strokeThickness: 3,
        strokeDashed: true,
      });
      scene.create("circle2d", {
        center: vec2(2.5, -2),
        radius: 1,
        strokeColor: "#f97583",
        strokeThickness: 2,
      });
      scene.create("line2d", {
        start: vec2(-4.5, -2.5),
        end: vec2(0.5, -2.5),
        color: "#4f9cf9",
        thickness: 2,
        dashed: true,
      });
      return {
        scene,
        camera,
        sliders: [
          { label: "radius", atom: radiusAtom, min: 0.5, max: 3.5, step: 0.05 },
        ],
      };
    },
  },
  {
    id: "segment-ticks",
    title: "Segment marks: ticks",
    notes: [
      "Isosceles setup: the two green double-ticked sides, single blue on base",
      "Drag any vertex: marks stay centered and perpendicular to their side",
      "Marks are world-sized: they zoom with the figure, unlike dash patterns",
      "The size slider scales tick length and the fan spacing together",
    ],
    build: () => {
      const { scene, camera } = baseScene();
      const sizeAtom = scene.atom(0.3);
      const a = scene.create("point2d", { coords: vec2(-3, -2), color: "#ffd166" });
      const b = scene.create("point2d", { coords: vec2(3, -2), color: "#ffd166" });
      const c = scene.create("point2d", { coords: vec2(0, 2.5), color: "#ffd166" });
      scene.create("line2d", { start: a.coords, end: b.coords, color: "#ccc", thickness: 2 });
      scene.create("line2d", { start: b.coords, end: c.coords, color: "#ccc", thickness: 2 });
      scene.create("line2d", { start: c.coords, end: a.coords, color: "#ccc", thickness: 2 });
      segmentMark2D(scene, {
        a: a.coords,
        b: c.coords,
        count: 2,
        size: sizeAtom,
        color: "#34d399",
        thickness: 2,
      });
      segmentMark2D(scene, {
        a: b.coords,
        b: c.coords,
        count: 2,
        size: sizeAtom,
        color: "#34d399",
        thickness: 2,
      });
      segmentMark2D(scene, {
        a: a.coords,
        b: b.coords,
        count: 1,
        size: sizeAtom,
        color: "#4f9cf9",
        thickness: 2,
      });
      return {
        scene,
        camera,
        sliders: [
          { label: "size", atom: sizeAtom, min: 0.1, max: 0.8, step: 0.01 },
        ],
      };
    },
  },
  {
    id: "segment-arrows",
    title: "Segment marks: arrows",
    notes: [
      "Chevrons point from a to b: swap ends by dragging past each other",
      "Double chevrons on the second pair distinguish the parallel families",
      "Triple ticks on the vertical segment: the count fan stays centered",
      "Drag handles: chevrons keep their heading along the segment",
    ],
    build: () => {
      const { scene, camera } = baseScene();
      const a1 = scene.create("point2d", { coords: vec2(-4, 2), color: "#ffd166" });
      const b1 = scene.create("point2d", { coords: vec2(1, 3), color: "#ffd166" });
      scene.create("line2d", { start: a1.coords, end: b1.coords, color: "#ccc", thickness: 2 });
      segmentMark2D(scene, {
        a: a1.coords,
        b: b1.coords,
        variant: "arrow",
        color: "#4f9cf9",
        thickness: 2,
        size: 0.3,
      });
      scene.create("line2d", { start: vec2(-4, 0.5), end: vec2(1, 1.5), color: "#ccc", thickness: 2 });
      segmentMark2D(scene, {
        a: vec2(-4, 0.5),
        b: vec2(1, 1.5),
        variant: "arrow",
        color: "#4f9cf9",
        thickness: 2,
        size: 0.3,
      });

      scene.create("line2d", { start: vec2(-3, -3), end: vec2(2, -1), color: "#ccc", thickness: 2 });
      segmentMark2D(scene, {
        a: vec2(-3, -3),
        b: vec2(2, -1),
        variant: "arrow",
        count: 2,
        color: "#34d399",
        thickness: 2,
        size: 0.3,
      });
      scene.create("line2d", { start: vec2(3.5, -3), end: vec2(3.5, 3), color: "#ccc", thickness: 2 });
      segmentMark2D(scene, {
        a: vec2(3.5, -3),
        b: vec2(3.5, 3),
        count: 3,
        color: "#f97583",
        thickness: 2,
        size: 0.3,
      });
      return { scene, camera, sliders: [] };
    },
  },
  {
    id: "angle-marks",
    title: "Angle marks: ticks & dots",
    notes: [
      "Plain arc at the top right: no marker unless one is asked for",
      "Bisector setup: both halves at the vertex carry a single-ticked arc",
      "Drag an arm: ticks stay on the arc midline, dots stay inside the angle",
      "Make a marked angle exactly 90°: the square appears, markers hide",
      "The radius slider scales the arcs; the dotted mark keeps its own",
      "markerSize, so its dots stay put while its arc grows",
    ],
    build: () => {
      const { scene, camera } = baseScene(vec2(0.5, 0.5));
      const radiusAtom = scene.atom(0.8);
      const vertex = vec2(-2, -2);
      const armA = scene.create("point2d", { coords: vec2(2.5, -1), color: "#ffd166" });
      const armB = scene.create("point2d", { coords: vec2(-1, 2.5), color: "#ffd166" });
      // Bisector direction: sum of the unit vectors toward the two arms.
      const bisectorEnd = scene.atom((get) => {
        const a = get(armA.coords);
        const b = get(armB.coords);
        const ma = Math.hypot(a.x - vertex.x, a.y - vertex.y) || 1;
        const mb = Math.hypot(b.x - vertex.x, b.y - vertex.y) || 1;
        const dx = (a.x - vertex.x) / ma + (b.x - vertex.x) / mb;
        const dy = (a.y - vertex.y) / ma + (b.y - vertex.y) / mb;
        const m = Math.hypot(dx, dy) || 1;
        return vec2(vertex.x + (dx / m) * 4, vertex.y + (dy / m) * 4);
      });
      scene.create("line2d", { start: vertex, end: armA.coords, color: "#ccc", thickness: 2 });
      scene.create("line2d", { start: vertex, end: armB.coords, color: "#ccc", thickness: 2 });
      scene.create("line2d", {
        start: vertex,
        end: bisectorEnd,
        color: "#f97583",
        thickness: 2,
        dashed: true,
      });
      angleMark2D(scene, {
        vertex,
        a: armA.coords,
        b: bisectorEnd,
        radius: radiusAtom,
        color: "#34d399",
        marker: "tick",
      });
      angleMark2D(scene, {
        vertex,
        a: bisectorEnd,
        b: armB.coords,
        radius: scene.atom((get) => get(radiusAtom) * 1.35),
        color: "#34d399",
        marker: "tick",
      });

      // A second, independent angle marked with double dots of a fixed size.
      const dotVertex = vec2(3, -1);
      const dotArm = scene.create("point2d", { coords: vec2(4.5, -3), color: "#ffd166" });
      scene.create("line2d", { start: dotVertex, end: dotArm.coords, color: "#ccc", thickness: 2 });
      scene.create("line2d", { start: dotVertex, end: vec2(1.5, -3), color: "#ccc", thickness: 2 });
      angleMark2D(scene, {
        vertex: dotVertex,
        a: dotArm.coords,
        b: vec2(1.5, -3),
        radius: radiusAtom,
        color: "#a78bfa",
        marker: "dot",
        markerCount: 2,
        markerSize: 0.12,
      });

      // And a plain, unmarked arc: the default look.
      const plainVertex = vec2(3, 2);
      const plainArm = scene.create("point2d", { coords: vec2(4.8, 3), color: "#ffd166" });
      scene.create("line2d", { start: plainVertex, end: plainArm.coords, color: "#ccc", thickness: 2 });
      scene.create("line2d", { start: plainVertex, end: vec2(1.5, 3.5), color: "#ccc", thickness: 2 });
      angleMark2D(scene, {
        vertex: plainVertex,
        a: plainArm.coords,
        b: vec2(1.5, 3.5),
        radius: radiusAtom,
        color: "#4f9cf9",
      });
      return {
        scene,
        camera,
        sliders: [
          { label: "radius", atom: radiusAtom, min: 0.3, max: 1.6, step: 0.02 },
        ],
      };
    },
  },
];

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
  const [caseId, setCaseId] = useState(CASES[0].id);
  const activeCase = CASES.find((c) => c.id === caseId) ?? CASES[0];
  const { scene, camera, sliders } = useMemo(() => activeCase.build(), [activeCase]);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", fontFamily: "system-ui, sans-serif" }}>
      <div
        style={{
          width: 300,
          flexShrink: 0,
          overflowY: "auto",
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          backgroundColor: "#161616",
          borderRight: "1px solid #2a2a2a",
        }}
      >
        <div style={{ color: "#ccc", fontSize: 12, fontWeight: 600 }}>
          Dash & mark test bench
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {CASES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCaseId(c.id)}
              style={{
                textAlign: "left",
                padding: "5px 8px",
                border: "1px solid #333",
                borderRadius: 4,
                backgroundColor: c.id === caseId ? "#26364d" : "#1d1d1d",
                color: c.id === caseId ? "#dbe9ff" : "#aaa",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              {c.title}
            </button>
          ))}
        </div>

        {sliders.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sliders.map((spec) => (
              <Slider key={spec.label} spec={spec} />
            ))}
          </div>
        )}

        <div style={{ color: "#ccc", fontSize: 11, fontWeight: 600 }}>What to check</div>
        <ul style={{ margin: 0, paddingLeft: 16, color: "#888", fontSize: 11, lineHeight: 1.5 }}>
          {activeCase.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
        <div style={{ color: "#666", fontSize: 10, lineHeight: 1.5 }}>
          Both panes share one camera: pan/zoom in either and compare. The two
          backends must look identical.
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0, display: "flex" }}>
        <ViewPane scene={scene} camera={camera} renderer="threejs" />
        <div style={{ width: 1, backgroundColor: "#2a2a2a" }} />
        <ViewPane scene={scene} camera={camera} renderer="svg" />
      </div>
    </div>
  );
}
