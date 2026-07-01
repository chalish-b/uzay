import { useMemo } from "react";
import { Scene2D, vec2 } from "uzay";
import { Scene2DView } from "uzay/react";

// SVG backend sandbox.
//
// One shared Scene2D rendered twice, side by side: the three.js backend on
// the left, the SVG backend on the right. Both views bind the same camera
// item, so pan/zoom in either stays mirrored, and every item atom drives both
// canvases at once. The scene exercises every 2D item kind.

const CHECKLIST = [
  "Both panes show the same picture (colors, thicknesses, stacking order)",
  "Grid sits under the region, curves above it, points on top in both",
  "Drag the amber point: line, vector, and LaTeX readout follow in BOTH panes",
  "Pan/zoom in either pane: the other mirrors it exactly",
  "Zoom out: grid re-steps, axes ticks/labels re-step, sine keeps resampling",
  "Zoom in hard: point radius, arrowheads, tick lengths stay pixel-sized",
  "Axis tick labels look identical (same font, same offsets) in both panes",
  "1/x curve: the discontinuity at x=0 stays an actual gap, no vertical wall",
  "Hover the amber point: grab cursor in both panes; drag works in both",
  "Full circle vs arc wedge render alike (fill + outline) in both panes",
];

function buildScene() {
  const scene = new Scene2D();

  const camera = scene.create("camera2d", { center: vec2(0, 0), zoom: 1.2 });

  scene.create("grid2d", {
    rangeX: true,
    rangeY: true,
    gap: "auto",
    color: "white",
    opacity: 0.1,
  });
  scene.create("axes2d", {
    x: true,
    y: true,
    color: "#888",
    thickness: 1.1,
    tickmarks: true,
    tickStep: "auto",
    arrows: true,
    labels: true,
  });

  // Infinite domain: resamples against the viewport in both backends.
  scene.create("function2d", {
    f: (x: number) => Math.sin(x) * 1.5,
    domain: "infinite",
    color: "#4f9cf9",
    thickness: 3,
  });

  // Declared discontinuity: the gap at x = 0 must not get bridged.
  scene.create("function2d", {
    f: (x: number) => 1 / x,
    domain: [-6, 6],
    discontinuities: [0],
    samples: 400,
    color: "#f97583",
    thickness: 2,
  });

  scene.create("parametricfunction2d", {
    f: (t: number) => vec2(Math.cos(3 * t) * 0.8 - 3, Math.sin(2 * t) * 0.8 + 2.2),
    tStart: 0,
    tEnd: Math.PI * 2,
    samples: 256,
    color: "#34d399",
    thickness: 2,
  });

  scene.create("region2d", {
    points: [vec2(-4.5, -1), vec2(-2.5, -1), vec2(-3.5, -3)],
    color: "#a78bfa",
    opacity: 0.25,
    strokeColor: "#a78bfa",
    strokeThickness: 2,
  });

  // Full circle and a partial arc (fills as a wedge).
  scene.create("circle2d", {
    center: vec2(3.4, 2.4),
    radius: 0.9,
    color: "#f59e0b",
    opacity: 0.15,
    strokeColor: "#f59e0b",
    strokeThickness: 2,
  });
  scene.create("circle2d", {
    center: vec2(3.4, -2.2),
    radius: 0.9,
    thetaStart: Math.PI / 6,
    thetaEnd: (Math.PI * 4) / 3,
    color: "#f59e0b",
    opacity: 0.25,
    strokeColor: "#f59e0b",
    strokeThickness: 2,
  });

  // The draggable driver: line, vector, and overlay all follow its coords.
  const handle = scene.create("point2d", {
    coords: vec2(1.5, 1.5),
    draggable: "xy",
    color: "#ffb547",
    radius: 7,
  });

  scene.create("line2d", {
    start: vec2(-1.5, -1.5),
    end: handle.coords,
    color: "#cccccc",
    thickness: 2,
    pointerEvents: "none",
  });

  scene.create("vector2d", {
    origin: vec2(0, 0),
    vector: handle.coords,
    color: "#34d399",
    thickness: 2.5,
  });

  scene.create("overlay2d", {
    position: handle.coords,
    content: scene.atom((get) => {
      const p = get(handle.coords);
      return `P = (${p.x.toFixed(2)},\\ ${p.y.toFixed(2)})`;
    }),
    format: "latex",
    anchor: "bottom",
    offset: vec2(0, -12),
    style: "color: #ffd9a0; font-size: 13px;",
    pointerEvents: "none",
  });

  return { scene, camera };
}

function Pane({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        position: "relative",
        border: "1px solid #2a2a2a",
      }}
    >
      {children}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 10,
          color: "#777",
          fontSize: 12,
          fontFamily: "system-ui, sans-serif",
          pointerEvents: "none",
          zIndex: 30,
        }}
      >
        {label}
      </div>
    </div>
  );
}

export default function Demo1() {
  const { scene, camera } = useMemo(buildScene, []);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", gap: 8, padding: 8 }}>
      <Pane label="renderer: threejs">
        <Scene2DView
          scene={scene}
          camera={camera}
          style={{ width: "100%", height: "100%" }}
        />
      </Pane>
      <Pane label="renderer: svg">
        <Scene2DView
          scene={scene}
          camera={camera}
          renderer="svg"
          style={{ width: "100%", height: "100%" }}
        />
      </Pane>

      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: 16,
          maxWidth: 380,
          padding: "10px 14px",
          backgroundColor: "rgba(20, 20, 20, 0.9)",
          border: "1px solid #2a2a2a",
          borderRadius: 6,
          color: "#999",
          fontSize: 11,
          fontFamily: "system-ui, sans-serif",
          lineHeight: 1.5,
          zIndex: 30,
        }}
      >
        <div style={{ color: "#ccc", marginBottom: 4 }}>Checklist</div>
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {CHECKLIST.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
