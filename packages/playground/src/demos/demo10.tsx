import { useEffect, useMemo, useRef, useState } from "react";
import { Scene3D, View3D, Vec3, vec3 } from "uzay";
import type { BoundAtom } from "uzay";
import type { PrimitiveAtom } from "jotai";

type VecAtom = BoundAtom<PrimitiveAtom<Vec3>>;
type NumAtom = BoundAtom<PrimitiveAtom<number>>;
type BoolAtom = BoundAtom<PrimitiveAtom<boolean>>;

type DemoAtoms = {
  center: VecAtom;
  pointA: VecAtom;
  pointB: VecAtom;
  radius: NumAtom;
  showGuides: BoolAtom;
  showIntersections: BoolAtom;
};

type UIState = {
  center: Vec3;
  pointA: Vec3;
  pointB: Vec3;
  radius: number;
  showGuides: boolean;
  showIntersections: boolean;
};

const INITIAL_STATE: UIState = {
  center: vec3(0, 0, 0),
  pointA: vec3(-6, 2, -2),
  pointB: vec3(6, -1, 3),
  radius: 4.5,
  showGuides: true,
  showIntersections: true,
};

const PANEL_BG = "rgba(8, 10, 14, 0.82)";
const PANEL_BORDER = "1px solid rgba(255,255,255,0.08)";
const TEXT = "#e8ecf3";
const MUTED = "#95a0b3";

function cloneVec(v: Vec3): Vec3 {
  return vec3(v.x, v.y, v.z);
}

function distance(a: Vec3, b: Vec3): number {
  return Vec3.length(Vec3.subtract(a, b));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

type IntersectionResult =
  | {
      kind: "none";
      projection: Vec3;
      distanceToLine: number;
    }
  | {
      kind: "tangent";
      projection: Vec3;
      distanceToLine: number;
      point: Vec3;
    }
  | {
      kind: "secant";
      projection: Vec3;
      distanceToLine: number;
      point1: Vec3;
      point2: Vec3;
    };

function computeIntersection(
  center: Vec3,
  radius: number,
  a: Vec3,
  b: Vec3
): IntersectionResult {
  const direction = Vec3.subtract(b, a);
  const lineLengthSq = Vec3.dot(direction, direction);
  const tangentTolerance = Math.max(0.06, radius * 0.02);

  if (lineLengthSq < 1e-8) {
    const d = distance(a, center);
    if (Math.abs(d - radius) <= tangentTolerance) {
      return {
        kind: "tangent",
        projection: a,
        distanceToLine: d,
        point: a,
      };
    }
    return {
      kind: "none",
      projection: a,
      distanceToLine: d,
    };
  }

  const fromCenter = Vec3.subtract(a, center);
  const qa = Vec3.dot(direction, direction);
  const qb = 2 * Vec3.dot(direction, fromCenter);
  const qc = Vec3.dot(fromCenter, fromCenter) - radius * radius;
  const discriminant = qb * qb - 4 * qa * qc;

  const projectionT = -Vec3.dot(fromCenter, direction) / qa;
  const projection = Vec3.add(a, Vec3.scaled(direction, projectionT));
  const distanceToLine = distance(projection, center);

  if (Math.abs(distanceToLine - radius) <= tangentTolerance) {
    return {
      kind: "tangent",
      projection,
      distanceToLine,
      point: projection,
    };
  }

  if (discriminant < -1e-8) {
    return {
      kind: "none",
      projection,
      distanceToLine,
    };
  }

  const root = Math.sqrt(discriminant);
  const t1 = (-qb - root) / (2 * qa);
  const t2 = (-qb + root) / (2 * qa);

  return {
    kind: "secant",
    projection,
    distanceToLine,
    point1: Vec3.add(a, Vec3.scaled(direction, t1)),
    point2: Vec3.add(a, Vec3.scaled(direction, t2)),
  };
}

function MetricChip(props: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "8px 10px",
        borderRadius: 9,
        background: "rgba(255,255,255,0.035)",
        border: "1px solid rgba(255,255,255,0.05)",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <span style={{ color: MUTED, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.35 }}>
        {props.label}
      </span>
      <span style={{ color: TEXT, fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
        {props.value}
      </span>
    </div>
  );
}

function SliderRow(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  accent?: string;
  onChange: (value: number) => void;
}) {
  const { label, value, min, max, step = 0.1, accent = "#7dd3fc", onChange } = props;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "50px 1fr 42px",
        gap: 8,
        alignItems: "center",
      }}
    >
      <label style={{ color: MUTED, fontSize: 12 }}>{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: accent }}
      />
      <span style={{ color: TEXT, fontSize: 12, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

function latexVec(name: string, v: Vec3): string {
  return String.raw`${name} = (${v.x.toFixed(2)},\; ${v.y.toFixed(2)},\; ${v.z.toFixed(2)})`;
}

function latexStatus(kind: IntersectionResult["kind"]): string {
  if (kind === "tangent") return String.raw`\text{tangent}`;
  return String.raw`\text{no hit}`;
}

export default function Demo10() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View3D | null>(null);
  const atomsRef = useRef<DemoAtoms | null>(null);

  const [ui, setUI] = useState<UIState>(() => ({
    center: cloneVec(INITIAL_STATE.center),
    pointA: cloneVec(INITIAL_STATE.pointA),
    pointB: cloneVec(INITIAL_STATE.pointB),
    radius: INITIAL_STATE.radius,
    showGuides: INITIAL_STATE.showGuides,
    showIntersections: INITIAL_STATE.showIntersections,
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new Scene3D();

    const centerAtom = scene.atom(cloneVec(INITIAL_STATE.center));
    const pointAAtom = scene.atom(cloneVec(INITIAL_STATE.pointA));
    const pointBAtom = scene.atom(cloneVec(INITIAL_STATE.pointB));
    const radiusAtom = scene.atom(INITIAL_STATE.radius);
    const showGuidesAtom = scene.atom(INITIAL_STATE.showGuides);
    const showIntersectionsAtom = scene.atom(INITIAL_STATE.showIntersections);

    atomsRef.current = {
      center: centerAtom,
      pointA: pointAAtom,
      pointB: pointBAtom,
      radius: radiusAtom,
      showGuides: showGuidesAtom,
      showIntersections: showIntersectionsAtom,
    };

    scene.create("grid3d", {
      plane: "xz",
      range1: [-10, 10],
      range2: [-10, 10],
      color: "#1b2130",
      thickness: 1.1,
    });

    scene.create("axes3d", {
      x: [-8, 8],
      y: [-8, 8],
      z: [-8, 8],
      color: "#2c3343",
      thickness: 0.7,
    });

    scene.create("sphere3d", {
      center: centerAtom,
      radius: radiusAtom,
      color: "#5da7ff",
      opacity: 0.7,
      pointerEvents: "none",
    });

    const lineDirectionAtom = scene.atom((get) => {
      const a = get(pointAAtom);
      const b = get(pointBAtom);
      return Vec3.normalized(Vec3.subtract(b, a));
    });

    const longLineStartAtom = scene.atom((get) => {
      const a = get(pointAAtom);
      const dir = get(lineDirectionAtom);
      return Vec3.add(a, Vec3.scaled(dir, -12));
    });

    const longLineEndAtom = scene.atom((get) => {
      const b = get(pointBAtom);
      const dir = get(lineDirectionAtom);
      return Vec3.add(b, Vec3.scaled(dir, 12));
    });

    const intersectionAtom = scene.atom((get) =>
      computeIntersection(get(centerAtom), get(radiusAtom), get(pointAAtom), get(pointBAtom))
    );

    const footVisibleAtom = scene.atom((get) => get(showGuidesAtom));
    const secantVisibleAtom = scene.atom(
      (get) => get(showIntersectionsAtom) && get(intersectionAtom).kind === "secant"
    );
    const tangentVisibleAtom = scene.atom(
      (get) => get(showIntersectionsAtom) && get(intersectionAtom).kind === "tangent"
    );
    const noHitVisibleAtom = scene.atom(
      (get) => get(showIntersectionsAtom) && get(intersectionAtom).kind === "none"
    );

    const footPointAtom = scene.atom((get) => get(intersectionAtom).projection);

    const secantPoint1Atom = scene.atom((get) => {
      const result = get(intersectionAtom);
      return result.kind === "secant" ? result.point1 : vec3(0, 0, 0);
    });

    const secantPoint2Atom = scene.atom((get) => {
      const result = get(intersectionAtom);
      return result.kind === "secant" ? result.point2 : vec3(0, 0, 0);
    });

    const tangentPointAtom = scene.atom((get) => {
      const result = get(intersectionAtom);
      return result.kind === "tangent" ? result.point : vec3(0, 0, 0);
    });

    const guideLineColorAtom = scene.atom((get) => (get(showGuidesAtom) ? "#f59e0b" : "#000000"));
    const guideLineThicknessAtom = scene.atom((get) => (get(showGuidesAtom) ? 0.7 : 0.0001));

    const centerLabelAtom = scene.atom((get) => latexVec("C", get(centerAtom)));
    const pointALabelAtom = scene.atom((get) => latexVec("A", get(pointAAtom)));
    const pointBLabelAtom = scene.atom((get) => latexVec("B", get(pointBAtom)));
    const tangentLabelAtom = scene.atom((get) => latexStatus(get(intersectionAtom).kind));
    const noHitLabelAtom = scene.atom((get) => latexStatus(get(intersectionAtom).kind));

    scene.create("line3d", {
      start: longLineStartAtom,
      end: longLineEndAtom,
      color: "#d8dde8",
      thickness: 0.9,
      pointerEvents: "none",
    });

    scene.create("line3d", {
      start: centerAtom,
      end: footPointAtom,
      color: guideLineColorAtom,
      thickness: guideLineThicknessAtom,
      pointerEvents: "none",
    });

    scene.create("point3d", {
      coords: centerAtom,
      color: "#5da7ff",
      radius: 3.4,
      draggable: "xyz",
    });

    scene.create("point3d", {
      coords: pointAAtom,
      color: "#ff8a65",
      radius: 3,
      draggable: "xyz",
    });

    scene.create("point3d", {
      coords: pointBAtom,
      color: "#6ee7b7",
      radius: 3,
      draggable: "xyz",
    });

    scene.create("point3d", {
      coords: footPointAtom,
      color: scene.atom((get) => (get(footVisibleAtom) ? "#f59e0b" : "#000000")),
      radius: scene.atom((get) => (get(footVisibleAtom) ? 2.1 : 0.0001)),
      draggable: "none",
      pointerEvents: "none",
    });

    scene.create("point3d", {
      coords: secantPoint1Atom,
      color: scene.atom((get) => (get(secantVisibleAtom) ? "#f472b6" : "#000000")),
      radius: scene.atom((get) => (get(secantVisibleAtom) ? 2.8 : 0.0001)),
      draggable: "none",
      pointerEvents: "none",
    });

    scene.create("point3d", {
      coords: secantPoint2Atom,
      color: scene.atom((get) => (get(secantVisibleAtom) ? "#f472b6" : "#000000")),
      radius: scene.atom((get) => (get(secantVisibleAtom) ? 2.8 : 0.0001)),
      draggable: "none",
      pointerEvents: "none",
    });

    scene.create("point3d", {
      coords: tangentPointAtom,
      color: scene.atom((get) => (get(tangentVisibleAtom) ? "#f472b6" : "#000000")),
      radius: scene.atom((get) => (get(tangentVisibleAtom) ? 3 : 0.0001)),
      draggable: "none",
      pointerEvents: "none",
    });

    scene.create("overlay3d", {
      position: centerAtom,
      content: centerLabelAtom,
      format: "latex",
      anchor: "bottom",
      offset: { x: 0, y: -8 },
      style:
        "color: #5da7ff; font-size: 12px; background: rgba(5,10,20,0.72); padding: 2px 6px; border-radius: 4px;",
      pointerEvents: "none",
    });

    scene.create("overlay3d", {
      position: pointAAtom,
      content: pointALabelAtom,
      format: "latex",
      anchor: "bottom",
      offset: { x: 0, y: -8 },
      style:
        "color: #ff8a65; font-size: 12px; background: rgba(5,10,20,0.72); padding: 2px 6px; border-radius: 4px;",
      pointerEvents: "none",
    });

    scene.create("overlay3d", {
      position: pointBAtom,
      content: pointBLabelAtom,
      format: "latex",
      anchor: "bottom",
      offset: { x: 0, y: -8 },
      style:
        "color: #6ee7b7; font-size: 12px; background: rgba(5,10,20,0.72); padding: 2px 6px; border-radius: 4px;",
      pointerEvents: "none",
    });

    scene.create("overlay3d", {
      position: tangentPointAtom,
      content: tangentLabelAtom,
      visible: tangentVisibleAtom,
      format: "latex",
      anchor: "top",
      offset: { x: 0, y: 10 },
      style:
        "color: #f472b6; font-size: 12px; background: rgba(5,10,20,0.75); padding: 2px 6px; border-radius: 4px;",
      pointerEvents: "none",
    });

    scene.create("overlay3d", {
      position: footPointAtom,
      content: noHitLabelAtom,
      visible: noHitVisibleAtom,
      format: "latex",
      anchor: "top",
      offset: { x: 0, y: 10 },
      style:
        "color: #f59e0b; font-size: 12px; background: rgba(5,10,20,0.75); padding: 2px 6px; border-radius: 4px;",
      pointerEvents: "none",
    });

    const camera = scene.create("camera3d", {
      position: vec3(11, 9, 12),
      lookAt: vec3(0, 0, 0),
      fov: 55,
    });

    const subscriptions = [
      centerAtom.sub(() => setUI((prev) => ({ ...prev, center: cloneVec(centerAtom.get()) }))),
      pointAAtom.sub(() => setUI((prev) => ({ ...prev, pointA: cloneVec(pointAAtom.get()) }))),
      pointBAtom.sub(() => setUI((prev) => ({ ...prev, pointB: cloneVec(pointBAtom.get()) }))),
      radiusAtom.sub(() => setUI((prev) => ({ ...prev, radius: radiusAtom.get() }))),
      showGuidesAtom.sub(() => setUI((prev) => ({ ...prev, showGuides: showGuidesAtom.get() }))),
      showIntersectionsAtom.sub(() =>
        setUI((prev) => ({ ...prev, showIntersections: showIntersectionsAtom.get() }))
      ),
    ];

    const view = new View3D(scene, camera.id, containerRef.current);
    viewRef.current = view;

    return () => {
      subscriptions.forEach((unsubscribe) => unsubscribe());
      view.dispose();
      viewRef.current = null;
      atomsRef.current = null;
    };
  }, []);

  const result = useMemo(
    () => computeIntersection(ui.center, ui.radius, ui.pointA, ui.pointB),
    [ui.center, ui.radius, ui.pointA, ui.pointB]
  );

  const lineSpan = distance(ui.pointA, ui.pointB);

  const setRadius = (next: number) => {
    const safe = clamp(next, 0.2, 8);
    setUI((prev) => ({ ...prev, radius: safe }));
    atomsRef.current?.radius.set(safe);
  };

  const setFlag = (key: keyof Pick<UIState, "showGuides" | "showIntersections">, next: boolean) => {
    setUI((prev) => ({ ...prev, [key]: next }));
    const atoms = atomsRef.current;
    if (!atoms) return;
    atoms[key].set(next);
  };

  const applyPreset = (preset: UIState) => {
    setUI({
      center: cloneVec(preset.center),
      pointA: cloneVec(preset.pointA),
      pointB: cloneVec(preset.pointB),
      radius: preset.radius,
      showGuides: preset.showGuides,
      showIntersections: preset.showIntersections,
    });

    const atoms = atomsRef.current;
    if (!atoms) return;
    atoms.center.set(cloneVec(preset.center));
    atoms.pointA.set(cloneVec(preset.pointA));
    atoms.pointB.set(cloneVec(preset.pointB));
    atoms.radius.set(preset.radius);
    atoms.showGuides.set(preset.showGuides);
    atoms.showIntersections.set(preset.showIntersections);
  };

  const statusTone =
    result.kind === "secant"
      ? "#f472b6"
      : result.kind === "tangent"
        ? "#f59e0b"
        : "#94a3b8";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#06080c",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          width: 320,
          padding: 12,
          borderRadius: 14,
          background: PANEL_BG,
          border: PANEL_BORDER,
          backdropFilter: "blur(8px)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          boxShadow: "0 12px 40px rgba(0,0,0,0.28)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ color: TEXT, fontSize: 16, fontWeight: 700 }}>Sphere–Line Explorer</div>
          <div
            style={{
              color: statusTone,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.45,
              textTransform: "uppercase",
            }}
          >
            {result.kind === "secant" ? "secant" : result.kind === "tangent" ? "tangent" : "no hit"}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          <MetricChip label="radius" value={ui.radius.toFixed(2)} />
          <MetricChip label="distance" value={result.distanceToLine.toFixed(2)} />
          <MetricChip label="length" value={lineSpan.toFixed(2)} />
        </div>

        <div
          style={{
            padding: 10,
            borderRadius: 10,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <SliderRow
            label="radius"
            value={ui.radius}
            min={0.2}
            max={8}
            step={0.1}
            accent="#5da7ff"
            onChange={setRadius}
          />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 7, color: TEXT, fontSize: 12 }}>
              <input
                type="checkbox"
                checked={ui.showGuides}
                onChange={(e) => setFlag("showGuides", e.target.checked)}
              />
              helper
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 7, color: TEXT, fontSize: 12 }}>
              <input
                type="checkbox"
                checked={ui.showIntersections}
                onChange={(e) => setFlag("showIntersections", e.target.checked)}
              />
              markers
            </label>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() =>
              applyPreset({
                center: vec3(0, 0, 0),
                pointA: vec3(-6, 2, -2),
                pointB: vec3(6, -1, 3),
                radius: 4.5,
                showGuides: true,
                showIntersections: true,
              })
            }
            style={presetButtonStyle}
          >
            Secant
          </button>
          <button
            onClick={() =>
              applyPreset({
                center: vec3(0, 0, 0),
                pointA: vec3(-6, 4.5, 0),
                pointB: vec3(6, 4.5, 0),
                radius: 4.5,
                showGuides: true,
                showIntersections: true,
              })
            }
            style={presetButtonStyle}
          >
            Tangent
          </button>
          <button
            onClick={() =>
              applyPreset({
                center: vec3(0, 0, 0),
                pointA: vec3(-6, 6, 0),
                pointB: vec3(6, 6, 0),
                radius: 4.5,
                showGuides: true,
                showIntersections: true,
              })
            }
            style={presetButtonStyle}
          >
            No hit
          </button>
          <button
            onClick={() =>
              applyPreset({
                center: cloneVec(INITIAL_STATE.center),
                pointA: cloneVec(INITIAL_STATE.pointA),
                pointB: cloneVec(INITIAL_STATE.pointB),
                radius: INITIAL_STATE.radius,
                showGuides: INITIAL_STATE.showGuides,
                showIntersections: INITIAL_STATE.showIntersections,
              })
            }
            style={presetButtonStyle}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

const presetButtonStyle: React.CSSProperties = {
  padding: "7px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)",
  color: TEXT,
  fontSize: 12,
  cursor: "pointer",
};
