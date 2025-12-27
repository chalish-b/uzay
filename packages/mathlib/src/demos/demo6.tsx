import { useEffect, useRef, useState } from "react";
import { Scene3D } from "../core/scene3d";
import { View3D } from "../core/view3d";
import { vec3, type Vec3 } from "../core/common-types/vec3";
import type { BoundAtom } from "../core/atom-wrapper";
import type { PrimitiveAtom } from "jotai";

/** DEMO MADE BY GPT 5.1 */

type ControlKey = "p0" | "p1" | "p2" | "p3";

type ControlAtoms = Record<ControlKey, BoundAtom<PrimitiveAtom<Vec3>>> & {
  t: BoundAtom<PrimitiveAtom<number>>;
  samples: BoundAtom<PrimitiveAtom<number>>;
};

type ControlState = Record<ControlKey, Vec3>;

type Preset = {
  name: string;
  points: ControlState;
  t?: number;
};

const BASE_POINTS: ControlState = {
  p0: vec3(-11, -6, -8),
  p1: vec3(-6, 8, -3),
  p2: vec3(7, 7, 8),
  p3: vec3(12, -5, 5),
};

const PRESETS: Preset[] = [
  {
    name: "Ribbon",
    points: {
      p0: vec3(-12, -5, -9),
      p1: vec3(-9, 9, -3),
      p2: vec3(7, -2, 10),
      p3: vec3(12, 6, 5),
    },
    t: 0.4,
  },
  {
    name: "Archway",
    points: {
      p0: vec3(-12, -2, -6),
      p1: vec3(-4, 11, -2),
      p2: vec3(4, 11, 6),
      p3: vec3(12, -2, 6),
    },
    t: 0.5,
  },
  {
    name: "Loop",
    points: {
      p0: vec3(-10, -8, -4),
      p1: vec3(-2, 10, -6),
      p2: vec3(10, -8, 10),
      p3: vec3(-2, 6, 8),
    },
    t: 0.28,
  },
];

function lerpVec(a: Vec3, b: Vec3, t: number): Vec3 {
  const s = 1 - t;
  return vec3(a.x * s + b.x * t, a.y * s + b.y * t, a.z * s + b.z * t);
}

function cubicPoint(t: number, p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3): Vec3 {
  const ab = lerpVec(p0, p1, t);
  const bc = lerpVec(p1, p2, t);
  const cd = lerpVec(p2, p3, t);
  const abbc = lerpVec(ab, bc, t);
  const bccd = lerpVec(bc, cd, t);
  return lerpVec(abbc, bccd, t);
}

function cubicTangent(t: number, p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3): Vec3 {
  const s = 1 - t;
  const dx =
    3 * s * s * (p1.x - p0.x) +
    6 * s * t * (p2.x - p1.x) +
    3 * t * t * (p3.x - p2.x);
  const dy =
    3 * s * s * (p1.y - p0.y) +
    6 * s * t * (p2.y - p1.y) +
    3 * t * t * (p3.y - p2.y);
  const dz =
    3 * s * s * (p1.z - p0.z) +
    6 * s * t * (p2.z - p1.z) +
    3 * t * t * (p3.z - p2.z);
  return vec3(dx, dy, dz);
}

function cloneVec(v: Vec3): Vec3 {
  return vec3(v.x, v.y, v.z);
}

export default function Demo6() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View3D | null>(null);
  const atomsRef = useRef<ControlAtoms | null>(null);

  const [controlPoints, setControlPoints] = useState<ControlState>(BASE_POINTS);
  const [tValue, setTValue] = useState(0.35);
  const [samples, setSamples] = useState(180);

  const controlColors: Record<ControlKey, string> = {
    p0: "#ff8360",
    p1: "#ffd166",
    p2: "#5ad1ff",
    p3: "#c59fff",
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new Scene3D();

    const controlAtoms: ControlAtoms = {
      p0: scene.atom(cloneVec(BASE_POINTS.p0)),
      p1: scene.atom(cloneVec(BASE_POINTS.p1)),
      p2: scene.atom(cloneVec(BASE_POINTS.p2)),
      p3: scene.atom(cloneVec(BASE_POINTS.p3)),
      t: scene.atom(0.35),
      samples: scene.atom(180),
    };

    atomsRef.current = controlAtoms;

    // Environment
    scene.create("grid3d", {
      plane: "xz",
      range1: [-15, 15],
      range2: [-15, 15],
      offset: -8,
      gap: 2,
      color: "#17181f",
      thickness: 1.1,
    });
    scene.create("grid3d", {
      plane: "xy",
      range1: [-15, 15],
      range2: [-15, 15],
      offset: -12,
      gap: 3,
      color: "#13141b",
      thickness: 1,
    });
    scene.create("axes3d", {
      x: [-16, 16],
      y: [-12, 12],
      z: [-16, 16],
      color: "#2a2c36",
      thickness: 0.7,
    });

    // Control points
    (["p0", "p1", "p2", "p3"] as ControlKey[]).forEach((key) => {
      scene.create("point3d", {
        coords: controlAtoms[key],
        color: controlColors[key],
        radius: 3.2,
        draggable: "xyz",
      });
    });

    // Control polygon
    scene.create("line3d", {
      start: controlAtoms.p0,
      end: controlAtoms.p1,
      color: "rgba(255, 255, 255, 0.2)",
      thickness: 1,
    });
    scene.create("line3d", {
      start: controlAtoms.p1,
      end: controlAtoms.p2,
      color: "rgba(255, 255, 255, 0.2)",
      thickness: 1,
    });
    scene.create("line3d", {
      start: controlAtoms.p2,
      end: controlAtoms.p3,
      color: "rgba(255, 255, 255, 0.2)",
      thickness: 1,
    });

    // De Casteljau steps
    const p01Atom = scene.atom((get) =>
      lerpVec(get(controlAtoms.p0), get(controlAtoms.p1), get(controlAtoms.t))
    );
    const p12Atom = scene.atom((get) =>
      lerpVec(get(controlAtoms.p1), get(controlAtoms.p2), get(controlAtoms.t))
    );
    const p23Atom = scene.atom((get) =>
      lerpVec(get(controlAtoms.p2), get(controlAtoms.p3), get(controlAtoms.t))
    );
    const p012Atom = scene.atom((get) =>
      lerpVec(get(p01Atom), get(p12Atom), get(controlAtoms.t))
    );
    const p123Atom = scene.atom((get) =>
      lerpVec(get(p12Atom), get(p23Atom), get(controlAtoms.t))
    );
    const curvePointAtom = scene.atom((get) =>
      lerpVec(get(p012Atom), get(p123Atom), get(controlAtoms.t))
    );

    const constructionColor = "rgba(255, 255, 255, 0.16)";
    scene.create("line3d", {
      start: p01Atom,
      end: p12Atom,
      color: constructionColor,
      thickness: 0.8,
    });
    scene.create("line3d", {
      start: p12Atom,
      end: p23Atom,
      color: constructionColor,
      thickness: 0.8,
    });
    scene.create("line3d", {
      start: p012Atom,
      end: p123Atom,
      color: "rgba(255, 255, 255, 0.25)",
      thickness: 1.2,
    });

    [p01Atom, p12Atom, p23Atom].forEach((atom) => {
      scene.create("point3d", {
        coords: atom,
        color: "#9fa6b2",
        radius: 2.3,
      });
    });

    [p012Atom, p123Atom].forEach((atom) => {
      scene.create("point3d", {
        coords: atom,
        color: "#d4d7dd",
        radius: 2.6,
      });
    });

    // Tangent hint
    const tangentEndAtom = scene.atom((get) => {
      const p0 = get(controlAtoms.p0);
      const p1 = get(controlAtoms.p1);
      const p2 = get(controlAtoms.p2);
      const p3 = get(controlAtoms.p3);
      const t = get(controlAtoms.t);
      const base = get(curvePointAtom);
      const tangent = cubicTangent(t, p0, p1, p2, p3);
      const len = Math.max(
        0.001,
        Math.sqrt(
          tangent.x * tangent.x + tangent.y * tangent.y + tangent.z * tangent.z
        )
      );
      const scale = 6 / len;
      return vec3(
        base.x + tangent.x * scale,
        base.y + tangent.y * scale,
        base.z + tangent.z * scale
      );
    });

    scene.create("line3d", {
      start: curvePointAtom,
      end: tangentEndAtom,
      color: "#7de2d1",
      thickness: 1.6,
    });

    scene.create("point3d", {
      coords: curvePointAtom,
      color: "#ffffff",
      radius: 4,
    });

    // Main curve
    scene.create("parametricfunction3d", {
      f: scene.atom((get) => {
        const p0 = get(controlAtoms.p0);
        const p1 = get(controlAtoms.p1);
        const p2 = get(controlAtoms.p2);
        const p3 = get(controlAtoms.p3);
        return (t: number) => cubicPoint(t, p0, p1, p2, p3);
      }),
      tStart: 0,
      tEnd: 1,
      color: "#ff8fb1",
      thickness: 2.4,
      samples: controlAtoms.samples,
    });

    const camera = scene.create("camera3d", {
      position: vec3(18, 14, 22),
      lookAt: vec3(0, 0, 0),
    });

    const view = new View3D(scene, camera.id, containerRef.current);
    viewRef.current = view;

    const subscriptions = [
      controlAtoms.p0.sub(() =>
        setControlPoints((prev) => ({ ...prev, p0: controlAtoms.p0.get() }))
      ),
      controlAtoms.p1.sub(() =>
        setControlPoints((prev) => ({ ...prev, p1: controlAtoms.p1.get() }))
      ),
      controlAtoms.p2.sub(() =>
        setControlPoints((prev) => ({ ...prev, p2: controlAtoms.p2.get() }))
      ),
      controlAtoms.p3.sub(() =>
        setControlPoints((prev) => ({ ...prev, p3: controlAtoms.p3.get() }))
      ),
      controlAtoms.t.sub(() => setTValue(controlAtoms.t.get())),
      controlAtoms.samples.sub(() => setSamples(controlAtoms.samples.get())),
    ];

    return () => {
      subscriptions.forEach((unsub) => unsub && unsub());
      view.threeRenderer.dispose();
      view.threeOrbitControls.dispose();
      if (
        containerRef.current &&
        view.threeRenderer.domElement.parentNode === containerRef.current
      ) {
        containerRef.current.removeChild(view.threeRenderer.domElement);
      }
    };
  }, []);

  const handleCoordChange = (
    key: ControlKey,
    axis: keyof Vec3,
    value: number
  ) => {
    setControlPoints((prev) => {
      const nextPoint = vec3(
        axis === "x" ? value : prev[key].x,
        axis === "y" ? value : prev[key].y,
        axis === "z" ? value : prev[key].z
      );
      const next = { ...prev, [key]: nextPoint };
      atomsRef.current?.[key].set(nextPoint);
      return next;
    });
  };

  const handleTChange = (value: number) => {
    setTValue(value);
    atomsRef.current?.t.set(value);
  };

  const handleSamplesChange = (value: number) => {
    const clamped = Math.max(32, Math.min(512, value));
    setSamples(clamped);
    atomsRef.current?.samples.set(clamped);
  };

  const applyPreset = (preset: Preset) => {
    const next: ControlState = {
      p0: cloneVec(preset.points.p0),
      p1: cloneVec(preset.points.p1),
      p2: cloneVec(preset.points.p2),
      p3: cloneVec(preset.points.p3),
    };
    setControlPoints(next);
    if (atomsRef.current) {
      (["p0", "p1", "p2", "p3"] as ControlKey[]).forEach((key) => {
        atomsRef.current?.[key].set(cloneVec(preset.points[key]));
      });
      if (typeof preset.t === "number") {
        atomsRef.current.t.set(preset.t);
        setTValue(preset.t);
      }
    } else if (typeof preset.t === "number") {
      setTValue(preset.t);
    }
  };

  const resetAll = () => {
    applyPreset({ name: "Reset", points: BASE_POINTS, t: 0.35 });
    handleSamplesChange(180);
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        backgroundColor: "#0d1015",
        color: "#e8e9ec",
        fontFamily: "Inter, 'Helvetica Neue', system-ui, sans-serif",
      }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      <div
        style={{
          position: "absolute",
          top: 18,
          left: 18,
          width: 340,
          backgroundColor: "rgba(11, 13, 18, 0.9)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          borderRadius: 12,
          padding: "18px 18px 14px",
          boxShadow: "0 14px 36px rgba(0, 0, 0, 0.45)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              letterSpacing: "0.01em",
              color: "#f7f7fa",
            }}
          >
            Bezier Workshop
          </h2>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 12,
              color: "rgba(232, 233, 236, 0.6)",
            }}
          >
            Drag the four anchors or edit their coordinates. Slide along t to
            watch De Casteljau unfold—no autoplay, just your moves.
          </p>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "rgba(232, 233, 236, 0.65)",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            <span>Trace position (t)</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {tValue.toFixed(2)}
            </span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={tValue}
            onChange={(e) => handleTChange(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: "#ff8fb1" }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "rgba(232, 233, 236, 0.65)",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            <span>Curve smoothness</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {samples} samples
            </span>
          </label>
          <input
            type="range"
            min="32"
            max="512"
            step="8"
            value={samples}
            onChange={(e) => handleSamplesChange(parseInt(e.target.value))}
            style={{ width: "100%", accentColor: "#7de2d1" }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "rgba(232, 233, 236, 0.65)",
              }}
            >
              Control points
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={resetAll}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  background: "rgba(255, 255, 255, 0.04)",
                  color: "#e8e9ec",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Reset
              </button>
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    background: "rgba(255, 255, 255, 0.03)",
                    color: "#cfd2d8",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(["p0", "p1", "p2", "p3"] as ControlKey[]).map((key) => (
              <div
                key={key}
                style={{
                  padding: "8px 10px",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: 8,
                  background: "rgba(255, 255, 255, 0.02)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: controlColors[key],
                      display: "inline-block",
                    }}
                  />
                  <strong style={{ fontWeight: 600, fontSize: 12 }}>
                    {key.toUpperCase()}
                  </strong>
                  <span
                    style={{
                      fontSize: 11,
                      color: "rgba(232, 233, 236, 0.55)",
                    }}
                  >
                    ({controlPoints[key].x.toFixed(1)},{" "}
                    {controlPoints[key].y.toFixed(1)},{" "}
                    {controlPoints[key].z.toFixed(1)})
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 6,
                  }}
                >
                  {(["x", "y", "z"] as (keyof Vec3)[]).map((axis) => (
                    <label
                      key={axis}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        fontSize: 11,
                        color: "rgba(232, 233, 236, 0.6)",
                      }}
                    >
                      {axis.toUpperCase()}
                      <input
                        type="number"
                        value={controlPoints[key][axis]}
                        step="0.5"
                        min="-16"
                        max="16"
                        onChange={(e) =>
                          handleCoordChange(
                            key,
                            axis,
                            parseFloat(e.target.value)
                          )
                        }
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          borderRadius: 6,
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          background: "#0f1218",
                          color: "#f7f7fa",
                        }}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            fontSize: 11,
            color: "rgba(232, 233, 236, 0.55)",
            lineHeight: 1.5,
          }}
        >
          Tip: the bright white point is the point on the curve at your chosen
          t. The teal ray shows its tangent. All construction lines respond
          instantly to drags—no animation loop needed.
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 18,
          left: 18,
          fontSize: 11,
          color: "rgba(232, 233, 236, 0.5)",
        }}
      >
        Drag to orbit · Scroll to zoom · Right-click to pan
      </div>
    </div>
  );
}
