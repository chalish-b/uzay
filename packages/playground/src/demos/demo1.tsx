import { useMemo, type ReactNode } from "react";
import { Scene2D, vec2, type Color } from "uzay";
import { Scene2DView, useAtomValue } from "uzay/react";

// circle2d sandbox.
//
// One circle whose every field is wired to a control. The center rides a
// draggable handle point, so dragging the handle moves the circle (reactive
// center); radius/fill/stroke/visibility are sliders, swatches, and toggles.
// Outline-only is the default look: raise fill opacity to shade the disk.

const FILL_COLORS = ["#4f9cf9", "#ef4444", "#22c55e", "#eab308", "#ffffff"];
const STROKE_COLORS = ["#ffffff", "#4f9cf9", "#ef4444", "#22c55e", "#eab308"];

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

const CHECKLIST = [
  "Drag the orange handle: the whole circle follows (center is reactive)",
  "Center X/Y sliders move it too, and track the handle as you drag",
  "Radius slider: grows/shrinks smoothly, stays round even when large",
  "θ end below 360°: stroke becomes an open arc (no closing back round)",
  "With an arc and fill opacity > 0: the fill is a sector (pizza wedge)",
  "θ start/end together sweep the arc around; small arcs stay smooth",
  "Fill opacity > 0: the disk (daire) shades in; 0 = outline only (çember)",
  "Stroke thickness 0 OR stroke opacity 0: outline vanishes, fill remains",
  "Fill opacity 0 AND stroke off: nothing renders at all",
  "Fill / stroke swatches recolor the two parts independently",
  "Visible off: the whole circle hides; on: returns with current settings",
];

function buildScene() {
  const scene = new Scene2D();

  const camera = scene.create("camera2d", { center: vec2(0, 0), zoom: 1.0 });

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

  // Draggable handle that owns the center coordinate. Passing its coords atom as
  // the circle's `center` binds the two: drag the handle, the circle follows.
  const handle = scene.create("point2d", {
    coords: vec2(0, 0),
    draggable: "xy",
    color: "#ffb547",
    radius: 7,
  });

  const circle = scene.create("circle2d", {
    center: handle.coords,
    radius: 2.5,
    thetaStart: 0,
    thetaEnd: Math.PI * 2,
    color: "#4f9cf9",
    opacity: 0,
    strokeColor: "#ffffff",
    strokeOpacity: 1,
    strokeThickness: 2,
  });

  return { scene, camera, handle, circle };
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

function SwatchRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Color;
  options: string[];
  onChange: (c: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ color: "#999", fontSize: 11 }}>{label}</span>
      <div style={{ display: "flex", gap: 4 }}>
        {options.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            title={c}
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              cursor: "pointer",
              border: value === c ? "2px solid #fff" : "1px solid #444",
              backgroundColor: c,
            }}
          />
        ))}
      </div>
    </div>
  );
}

const num = { color: "#cfe3ff", fontVariantNumeric: "tabular-nums" } as const;

export default function Demo1() {
  const { scene, camera, handle, circle } = useMemo(buildScene, []);

  const center = useAtomValue(handle.coords);
  const radius = useAtomValue(circle.radius);
  const thetaStart = useAtomValue(circle.thetaStart);
  const thetaEnd = useAtomValue(circle.thetaEnd);
  const fillColor = useAtomValue(circle.color);
  const fillOpacity = useAtomValue(circle.opacity);
  const strokeColor = useAtomValue(circle.strokeColor);
  const strokeOpacity = useAtomValue(circle.strokeOpacity);
  const strokeThickness = useAtomValue(circle.strokeThickness);
  const visible = useAtomValue(circle.visible);
  const pointerEvents = useAtomValue(circle.pointerEvents);

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
        <div style={{ fontWeight: 600 }}>circle2d</div>

        <SliderRow
          label={<>center.x = <span style={num}>{center.x.toFixed(2)}</span></>}
          value={center.x}
          min={-6}
          max={6}
          step={0.1}
          onChange={(x) => handle.coords.set(vec2(x, center.y))}
        />
        <SliderRow
          label={<>center.y = <span style={num}>{center.y.toFixed(2)}</span></>}
          value={center.y}
          min={-6}
          max={6}
          step={0.1}
          onChange={(y) => handle.coords.set(vec2(center.x, y))}
        />
        <SliderRow
          label={<>radius = <span style={num}>{radius.toFixed(2)}</span></>}
          value={radius}
          min={0.1}
          max={5}
          step={0.05}
          onChange={(r) => circle.radius.set(r)}
        />
        <SliderRow
          label={<>θ start = <span style={num}>{(thetaStart * DEG).toFixed(0)}°</span></>}
          value={thetaStart * DEG}
          min={0}
          max={360}
          step={1}
          onChange={(d) => circle.thetaStart.set(d * RAD)}
        />
        <SliderRow
          label={<>θ end = <span style={num}>{(thetaEnd * DEG).toFixed(0)}°</span></>}
          value={thetaEnd * DEG}
          min={0}
          max={360}
          step={1}
          onChange={(d) => circle.thetaEnd.set(d * RAD)}
        />

        <SliderRow
          label={<>fill opacity = <span style={num}>{fillOpacity.toFixed(2)}</span></>}
          value={fillOpacity}
          min={0}
          max={1}
          step={0.05}
          onChange={(o) => circle.opacity.set(o)}
        />
        <SwatchRow
          label="fill color"
          value={fillColor}
          options={FILL_COLORS}
          onChange={(c) => circle.color.set(c)}
        />

        <SliderRow
          label={<>stroke opacity = <span style={num}>{strokeOpacity.toFixed(2)}</span></>}
          value={strokeOpacity}
          min={0}
          max={1}
          step={0.05}
          onChange={(o) => circle.strokeOpacity.set(o)}
        />
        <SliderRow
          label={<>stroke thickness = <span style={num}>{strokeThickness.toFixed(1)}</span></>}
          value={strokeThickness}
          min={0}
          max={8}
          step={0.5}
          onChange={(t) => circle.strokeThickness.set(t)}
        />
        <SwatchRow
          label="stroke color"
          value={strokeColor}
          options={STROKE_COLORS}
          onChange={(c) => circle.strokeColor.set(c)}
        />

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => circle.visible.set(!visible)}
            style={{
              flex: 1,
              padding: "5px 0",
              border: "1px solid #444",
              borderRadius: 4,
              backgroundColor: visible ? "#264d2a" : "#4d2626",
              color: "#ddd",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            visible: {String(visible)}
          </button>
          <button
            onClick={() =>
              circle.pointerEvents.set(pointerEvents === "auto" ? "none" : "auto")
            }
            style={{
              flex: 1,
              padding: "5px 0",
              border: "1px solid #444",
              borderRadius: 4,
              backgroundColor: "#262626",
              color: "#ddd",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            pointerEvents: {pointerEvents}
          </button>
        </div>

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
