import { useMemo } from "react";
import { Scene2D, functionPoint2D, vec2 } from "uzay";
import { Scene2DView, useAtomValue } from "uzay/react";

// functionPoint2D sandbox.
//
// A draggable point pinned to the graph of y = f(x). Two of them ride the same
// curve: one unbounded (the default), one clamped to a domain. Buttons swap f
// reactively; a slider drives the free point's x from outside. The point snaps
// to the nearest spot on the graph as you drag, so it stays under the cursor
// even where the curve is steep.

type Fn = (x: number) => number;

const FUNCTIONS: { label: string; f: Fn }[] = [
  // Steep on the flanks: the case where parametrizing by raw x would fling the
  // point up and down. Nearest-point projection keeps it under the cursor.
  { label: "0.25 x³", f: (x) => 0.25 * x ** 3 },
  { label: "1.5 sin(x)", f: (x) => 1.5 * Math.sin(x) },
  { label: "0.3 x² − 1.5", f: (x) => 0.3 * x * x - 1.5 },
];

const CHECKLIST = [
  "Drag the orange point: it rides the curve and stays under the cursor, even on steep parts",
  "Drag it far sideways (pan to follow): no bounds stop it",
  "Drag the green point past x = ±4: it clamps at the domain edges",
  "Switch f: both points jump onto the new graph at their current x",
  "Move the slider: the orange point's x is set from outside the canvas",
  "Pan/zoom the board: the infinite curve refills so there is always graph to ride",
];

function buildScene() {
  const scene = new Scene2D();

  const camera = scene.create("camera2d", {
    center: vec2(0, 0),
    zoom: 1.1,
  });

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
  });

  // The current function, swappable at runtime. Value mode so the stored
  // function is treated as data, not as derived-atom logic.
  const fAtom = scene.atom<Fn>(FUNCTIONS[0].f, { mode: "value" });

  scene.create("function2d", {
    f: fAtom,
    domain: "infinite",
    samples: 240,
    color: "#4f9cf9",
    thickness: 2.5,
    pointerEvents: "none",
  });

  // Unbounded: slides anywhere along the graph.
  const free = functionPoint2D(scene, {
    f: fAtom,
    x: 1,
    color: "#ffb547",
  });
  free.point.radius.set(7);

  scene.create("overlay2d", {
    position: free.point.coords,
    content: scene.atom((get) => {
      const x = get(free.x);
      return `x = ${x.toFixed(2)}`;
    }),
    offset: vec2(0, -20),
    style: "color:#ffe0b0;font:12px system-ui;white-space:nowrap;",
  });

  // Clamped: confined to x in [-4, 4].
  const clamped = functionPoint2D(scene, {
    f: fAtom,
    domain: [-4, 4],
    x: -1,
    color: "#6ee7a8",
  });
  clamped.point.radius.set(7);

  scene.create("overlay2d", {
    position: clamped.point.coords,
    content: scene.atom((get) => {
      const x = get(clamped.x);
      return `x = ${x.toFixed(2)} (clamped ±4)`;
    }),
    offset: vec2(0, 20),
    style: "color:#bdf0d4;font:12px system-ui;white-space:nowrap;",
  });

  return { scene, camera, fAtom, free, clamped };
}

export default function Demo1() {
  const { scene, camera, fAtom, free, clamped } = useMemo(buildScene, []);

  const freeX = useAtomValue(free.x);
  const clampedX = useAtomValue(clamped.x);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Scene2DView
        scene={scene}
        camera={camera}
        style={{ width: "100%", height: "100%" }}
      />

      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          padding: 14,
          width: 340,
          backgroundColor: "rgba(20, 20, 20, 0.9)",
          border: "1px solid #2a2a2a",
          borderRadius: 8,
          color: "#ddd",
          fontFamily: "system-ui, sans-serif",
          fontSize: 13,
        }}
      >
        <div style={{ fontWeight: 600 }}>functionPoint2D</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ color: "#999", fontSize: 11 }}>Function f(x)</span>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {FUNCTIONS.map((option) => (
              <button
                key={option.label}
                onClick={() => fAtom.set(option.f)}
                style={{
                  padding: "4px 9px",
                  border: "none",
                  borderRadius: 4,
                  backgroundColor: "#262626",
                  color: "#cfe3ff",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ color: "#999", fontSize: 11 }}>
            Set orange x from outside
          </span>
          <input
            type="range"
            min={-10}
            max={10}
            step={0.1}
            value={freeX}
            onChange={(e) => free.x.set(parseFloat(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        <div
          style={{
            color: "#9fb6cc",
            fontSize: 12,
            fontVariantNumeric: "tabular-nums",
            borderTop: "1px solid #2a2a2a",
            paddingTop: 8,
          }}
        >
          orange x = {freeX.toFixed(2)} · green x = {clampedX.toFixed(2)}
        </div>

        <ul
          style={{
            margin: 0,
            paddingLeft: 18,
            color: "#777",
            fontSize: 11,
            lineHeight: 1.5,
          }}
        >
          {CHECKLIST.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
