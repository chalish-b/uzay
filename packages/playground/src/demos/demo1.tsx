import { useEffect, useMemo, useRef, useState } from "react";
import { Scene2D, View2D, functionArea2D, vec2 } from "uzay";
import { useAtomValue } from "uzay/react";

// Test lab for functionArea2D baseline crossings + region2d multi-polygon:
// - lobe splitting where the curve crosses the baseline (no garbled fill)
// - signedArea / absoluteArea readouts matching the drawn region
// - nonzero + animated baseline, low sample counts, swapped bounds
// - region2d accepting both Vec2[] and Vec2[][] directly

const FUNCS = {
  sine: { label: "sin(x)", f: (x: number) => Math.sin(x) },
  parabola: { label: "0.25x² − 0.5", f: (x: number) => 0.25 * x * x - 0.5 },
  cubic: { label: "x³/8 − x/2", f: (x: number) => (x * x * x) / 8 - x / 2 },
  flat: { label: "0 (degenerate)", f: (_x: number) => 0 },
} as const;
type FuncKey = keyof typeof FUNCS;

function buildScene() {
  const scene = new Scene2D();

  const camera = scene.create("camera2d", {
    center: vec2(0, 0),
    zoom: 0.9,
  });

  scene.create("grid2d", {
    rangeX: [-10, 10],
    rangeY: [-6, 6],
    gap: 1,
    color: "white",
    opacity: 0.12,
  });

  scene.create("axes2d", {
    x: [-9, 9],
    y: [-5, 5],
    color: "#aaa",
    thickness: 1.1,
    tickmarks: true,
    tickStep: 1,
    arrows: true,
  });

  const fKeyAtom = scene.atom<FuncKey>("sine");
  const fAtom = scene.atom((get) => FUNCS[get(fKeyAtom)].f);
  const baselineAtom = scene.atom(0);
  const samplesAtom = scene.atom(128);

  // Bounds: draggable along x, like the docs demo.
  const aHandle = scene.create("point2d", {
    coords: vec2(-5, 0),
    color: "#ffb547",
    radius: 5,
    draggable: "x",
  });
  const bHandle = scene.create("point2d", {
    coords: vec2(5, 0),
    color: "#ffb547",
    radius: 5,
    draggable: "x",
  });
  const aAtom = scene.atom((get) => get(aHandle.coords).x);
  const bAtom = scene.atom((get) => get(bHandle.coords).x);

  scene.create("function2d", {
    f: fAtom,
    domain: "infinite",
    color: "#4f9cf9",
    thickness: 2.5,
    pointerEvents: "none",
  });

  // Baseline indicator so the nonzero-baseline case is visible.
  scene.create("line2d", {
    start: scene.atom((get) => vec2(-9, get(baselineAtom))),
    end: scene.atom((get) => vec2(9, get(baselineAtom))),
    color: "#888",
    thickness: 1,
    pointerEvents: "none",
  });

  // The construction under test. Stroke on, so each lobe shows its outline.
  const area = functionArea2D(scene, {
    f: fAtom,
    a: aAtom,
    b: bAtom,
    baseline: baselineAtom,
    samples: samplesAtom,
    color: "#6ee7a8",
    opacity: 0.3,
    strokeColor: "#6ee7a8",
    strokeOpacity: 0.9,
    strokeThickness: 1.5,
  });

  // Direct region2d checks, parked in the top-left corner:
  // a flat Vec2[] polygon (old API shape)...
  scene.create("region2d", {
    points: [vec2(-8.5, 4), vec2(-7.5, 4), vec2(-8, 5)],
    color: "tomato",
    opacity: 0.5,
    strokeColor: "tomato",
    strokeOpacity: 1,
    pointerEvents: "none",
  });
  // ...and a Vec2[][] pair of disjoint polygons in one item.
  scene.create("region2d", {
    points: [
      [vec2(-7, 4), vec2(-6, 4), vec2(-6.5, 5)],
      [vec2(-5.5, 4), vec2(-4.5, 4), vec2(-5, 5)],
    ],
    color: "violet",
    opacity: 0.5,
    strokeColor: "violet",
    strokeOpacity: 1,
    pointerEvents: "none",
  });

  return { scene, camera, area, fKeyAtom, baselineAtom, samplesAtom };
}

const CHECKLIST = [
  "Sine over a wide interval: one fill lobe per half-wave, clean stroke loop around each",
  "Drag a bound across a root: lobes split/merge without garbled triangles",
  "Drag b to the left of a: region still renders (sign does not flip, by design)",
  "Drag b onto a: region collapses to nothing, no crash",
  "Baseline slider: lobes recompute against the gray line, not the x axis",
  "Samples at 8: faceted fill, readouts still match the drawn polygon",
  "signed vs absolute: equal when all lobes are above the baseline, diverge otherwise",
  "Corner shapes: red flat-array triangle and both violet Vec2[][] triangles render",
];

export default function Demo1() {
  const { scene, camera, area, fKeyAtom, baselineAtom, samplesAtom } =
    useMemo(buildScene, []);
  const containerRef = useRef<HTMLDivElement>(null);
  const [funcKey, setFuncKey] = useState<FuncKey>("sine");
  const [baseline, setBaseline] = useState(0);
  const [samples, setSamples] = useState(128);

  useEffect(() => {
    if (!containerRef.current) return;
    const view = new View2D(scene, camera.id, containerRef.current);
    return () => view.dispose();
  }, [scene, camera]);

  const signedArea = useAtomValue(area.signedArea);
  const absoluteArea = useAtomValue(area.absoluteArea);
  const polygons = useAtomValue(area.polygons);

  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: "#0a0a0a" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

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
          backgroundColor: "rgba(20, 20, 20, 0.88)",
          border: "1px solid #2a2a2a",
          borderRadius: 8,
          color: "#ddd",
          fontFamily: "system-ui, sans-serif",
          fontSize: 13,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {(Object.keys(FUNCS) as FuncKey[]).map((key) => (
            <button
              key={key}
              onClick={() => {
                setFuncKey(key);
                fKeyAtom.set(key);
              }}
              style={{
                padding: "5px 10px",
                border: "none",
                borderRadius: 4,
                backgroundColor: funcKey === key ? "#4f9cf9" : "#262626",
                color: funcKey === key ? "#fff" : "#999",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {FUNCS[key].label}
            </button>
          ))}
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 90, color: "#999" }}>
            baseline {baseline.toFixed(1)}
          </span>
          <input
            type="range"
            min={-2}
            max={2}
            step={0.1}
            value={baseline}
            onChange={(event) => {
              const value = parseFloat(event.target.value);
              setBaseline(value);
              baselineAtom.set(value);
            }}
            style={{ flex: 1 }}
          />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 90, color: "#999" }}>samples {samples}</span>
          <input
            type="range"
            min={8}
            max={256}
            step={1}
            value={samples}
            onChange={(event) => {
              const value = parseInt(event.target.value, 10);
              setSamples(value);
              samplesAtom.set(value);
            }}
            style={{ flex: 1 }}
          />
        </label>

        <div
          style={{
            color: "#6ee7a8",
            fontSize: 12,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          signed = {signedArea.toFixed(3)} · absolute = {absoluteArea.toFixed(3)}{" "}
          · lobes = {polygons.length}
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
