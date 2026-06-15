import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Scene2D, vec2, angleMark2D } from "uzay";
import { Scene2DView, useAtomValue } from "uzay/react";

// angleMark2D sandbox.
//
// A vertex with two draggable arms and the angle mark between them. `sweep`
// picks which of the two angles the mark draws: "minor"/"major" choose by size,
// "ccw"/"cw" hold a turn direction so the arc grows past 180° without swapping
// sides. `squareRightAngle` toggles the 90° corner square. Both are
// creation-time options, so changing them rebuilds the mark; radius stays
// reactive through its atom.

const DEG = 180 / Math.PI;

const SWEEPS = ["minor", "major", "ccw", "cw"] as const;
type Sweep = (typeof SWEEPS)[number];

const CHECKLIST = [
  "Drag either arm: the marked angle and the readout follow",
  "minor: stays on the smaller angle, snaps sides as an arm crosses the other",
  "major: marks the larger angle, readout exceeds 180°; minor + major = 360°",
  "ccw / cw: drag an arm all the way around; the arc grows 0→360° unbroken",
  "ccw vs cw mark opposite sides for the same arms",
  "Line the arms up at 90°: the corner square appears (square on)",
  "square off: 90° keeps the arc, no square",
  "major suppresses the square (a major angle is never 90°)",
  "Radius slider resizes the mark without rebuilding it",
];

type AngleMark = ReturnType<typeof angleMark2D>;

function buildScene() {
  const scene = new Scene2D();

  const camera = scene.create("camera2d", { center: vec2(0, 0), zoom: 1.4 });

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

  const radiusAtom = scene.atom(0.8);

  const vertex = scene.create("point2d", {
    coords: vec2(0, 0),
    draggable: "xy",
    color: "#ffb547",
    radius: 6,
  });
  const armA = scene.create("point2d", {
    coords: vec2(2.6, 0),
    draggable: "xy",
    color: "#4f9cf9",
    radius: 7,
  });
  const armB = scene.create("point2d", {
    coords: vec2(1.2, 2.3),
    draggable: "xy",
    color: "#4f9cf9",
    radius: 7,
  });

  scene.create("line2d", {
    start: vertex.coords,
    end: armA.coords,
    color: "#cccccc",
    thickness: 2.5,
    pointerEvents: "none",
  });
  scene.create("line2d", {
    start: vertex.coords,
    end: armB.coords,
    color: "#cccccc",
    thickness: 2.5,
    pointerEvents: "none",
  });

  return { scene, camera, vertex, armA, armB, radiusAtom };
}

function AngleReadout({ mark }: { mark: AngleMark }) {
  const radians = useAtomValue(mark.measure);
  return (
    <span style={{ color: "#cfe3ff", fontVariantNumeric: "tabular-nums" }}>
      {(radians * DEG).toFixed(1)}°
    </span>
  );
}

function Toggle({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "5px 0",
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

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ color: "#999", fontSize: 11 }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%" }}
      />
    </label>
  );
}

export default function Demo1() {
  const { scene, camera, vertex, armA, armB, radiusAtom } = useMemo(buildScene, []);

  const [sweep, setSweep] = useState<Sweep>("minor");
  const [squareRightAngle, setSquareRightAngle] = useState(true);
  const [mark, setMark] = useState<AngleMark | null>(null);
  const radius = useAtomValue(radiusAtom);

  useEffect(() => {
    const next = angleMark2D(scene, {
      vertex: vertex.coords,
      a: armA.coords,
      b: armB.coords,
      radius: radiusAtom,
      color: "#a78bfa",
      thickness: 2.5,
      sweep,
      squareRightAngle,
    });
    setMark(next);
    return () => next.dispose();
  }, [scene, vertex, armA, armB, radiusAtom, sweep, squareRightAngle]);

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
          width: 320,
          backgroundColor: "rgba(20, 20, 20, 0.9)",
          border: "1px solid #2a2a2a",
          borderRadius: 8,
          color: "#ddd",
          fontFamily: "system-ui, sans-serif",
          fontSize: 13,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 600 }}>angleMark2D</span>
          <span>∠ = {mark ? <AngleReadout mark={mark} /> : "—"}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ color: "#999", fontSize: 11 }}>sweep</span>
          <div style={{ display: "flex", gap: 4 }}>
            {SWEEPS.map((s) => (
              <button
                key={s}
                onClick={() => setSweep(s)}
                style={{
                  flex: 1,
                  padding: "5px 0",
                  border: sweep === s ? "1px solid #a78bfa" : "1px solid #444",
                  borderRadius: 4,
                  backgroundColor: sweep === s ? "#2e2640" : "#262626",
                  color: "#ddd",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <Toggle
          label="square"
          on={squareRightAngle}
          onClick={() => setSquareRightAngle((v) => !v)}
        />

        <SliderRow
          label={
            <>
              radius ={" "}
              <span style={{ color: "#cfe3ff", fontVariantNumeric: "tabular-nums" }}>
                {radius.toFixed(2)}
              </span>
            </>
          }
          value={radius}
          min={0.2}
          max={2}
          step={0.05}
          onChange={(r) => radiusAtom.set(r)}
        />

        <ul
          style={{
            margin: 0,
            paddingLeft: 18,
            color: "#777",
            fontSize: 11,
            lineHeight: 1.5,
            borderTop: "1px solid #2a2a2a",
            paddingTop: 8,
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
