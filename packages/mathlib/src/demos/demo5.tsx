import { useEffect, useRef, useState } from "react";
import { Scene3D } from "../core/scene3d";
import { vec3 } from "../core/common-types/vec3";
import { View3D } from "../core/view3d";
import type { BoundAtom } from "../core/atom-wrapper";
import type { PrimitiveAtom } from "jotai";

/** DEMO MADE BY CLAUDE OPUS 4.5 */

/**
 * 3D Lissajous Curve Laboratory
 *
 * An interactive exploration of 3D Lissajous figures.
 * Lissajous curves are defined by:
 *   x(t) = A·sin(a·t + δx)
 *   y(t) = B·sin(b·t + δy)
 *   z(t) = C·sin(c·t + δz)
 *
 * When a, b, c are integers, the curves form beautiful closed patterns.
 * The ratios between frequencies determine the shape.
 */

const TAU = Math.PI * 2;
const SCALE = 5;

type CurveParams = {
  freqX: number;
  freqY: number;
  freqZ: number;
  phaseX: number;
  phaseY: number;
  phaseZ: number;
};

// Preset configurations for interesting curves
const PRESETS: { name: string; params: CurveParams }[] = [
  {
    name: "Classic Knot",
    params: { freqX: 2, freqY: 3, freqZ: 5, phaseX: 0, phaseY: 0, phaseZ: 0 },
  },
  {
    name: "Trefoil",
    params: { freqX: 2, freqY: 3, freqZ: 1, phaseX: 0.5, phaseY: 0, phaseZ: 0 },
  },
  {
    name: "Figure Eight",
    params: {
      freqX: 1,
      freqY: 2,
      freqZ: 3,
      phaseX: 0,
      phaseY: 0.25,
      phaseZ: 0,
    },
  },
  {
    name: "Orbit",
    params: {
      freqX: 1,
      freqY: 1,
      freqZ: 2,
      phaseX: 0.25,
      phaseY: 0,
      phaseZ: 0,
    },
  },
  {
    name: "Helix Twist",
    params: {
      freqX: 3,
      freqY: 3,
      freqZ: 2,
      phaseX: 0.25,
      phaseY: 0,
      phaseZ: 0,
    },
  },
  {
    name: "Ribbon",
    params: {
      freqX: 3,
      freqY: 4,
      freqZ: 5,
      phaseX: 0,
      phaseY: 0.1,
      phaseZ: 0.2,
    },
  },
  {
    name: "Crown",
    params: { freqX: 5, freqY: 4, freqZ: 3, phaseX: 0, phaseY: 0, phaseZ: 0.5 },
  },
  {
    name: "Spiral Dance",
    params: {
      freqX: 7,
      freqY: 6,
      freqZ: 5,
      phaseX: 0.1,
      phaseY: 0.2,
      phaseZ: 0.3,
    },
  },
];

export default function Demo5() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View3D | null>(null);

  // Atom refs for reactive updates
  const atomsRef = useRef<{
    freqX: BoundAtom<PrimitiveAtom<number>>;
    freqY: BoundAtom<PrimitiveAtom<number>>;
    freqZ: BoundAtom<PrimitiveAtom<number>>;
    phaseX: BoundAtom<PrimitiveAtom<number>>;
    phaseY: BoundAtom<PrimitiveAtom<number>>;
    phaseZ: BoundAtom<PrimitiveAtom<number>>;
    traceT: BoundAtom<PrimitiveAtom<number>>;
    showProjections: BoundAtom<PrimitiveAtom<boolean>>;
  } | null>(null);

  // React state for UI
  const [freqX, setFreqX] = useState(2);
  const [freqY, setFreqY] = useState(3);
  const [freqZ, setFreqZ] = useState(5);
  const [phaseX, setPhaseX] = useState(0);
  const [phaseY, setPhaseY] = useState(0);
  const [phaseZ, setPhaseZ] = useState(0);
  const [traceT, setTraceT] = useState(0);
  const [showProjections, setShowProjections] = useState(true);

  // Initialize scene
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new Scene3D();

    // Create atoms
    const freqXAtom = scene.atom(2);
    const freqYAtom = scene.atom(3);
    const freqZAtom = scene.atom(5);
    const phaseXAtom = scene.atom(0);
    const phaseYAtom = scene.atom(0);
    const phaseZAtom = scene.atom(0);
    const traceTAtom = scene.atom(0);
    const showProjectionsAtom = scene.atom(true);

    atomsRef.current = {
      freqX: freqXAtom,
      freqY: freqYAtom,
      freqZ: freqZAtom,
      phaseX: phaseXAtom,
      phaseY: phaseYAtom,
      phaseZ: phaseZAtom,
      traceT: traceTAtom,
      showProjections: showProjectionsAtom,
    };

    // Lissajous function factory
    const createLissajousFunc = (
      projectionPlane: "xyz" | "xy" | "xz" | "yz" = "xyz"
    ) => {
      return scene.atom((get) => {
        const a = get(freqXAtom);
        const b = get(freqYAtom);
        const c = get(freqZAtom);
        const dx = get(phaseXAtom) * TAU;
        const dy = get(phaseYAtom) * TAU;
        const dz = get(phaseZAtom) * TAU;

        return (t: number) => {
          const x = SCALE * Math.sin(a * t + dx);
          const y = SCALE * Math.sin(b * t + dy);
          const z = SCALE * Math.sin(c * t + dz);

          switch (projectionPlane) {
            case "xy":
              return vec3(x, y, -SCALE - 1);
            case "xz":
              return vec3(x, -SCALE - 1, z);
            case "yz":
              return vec3(-SCALE - 1, y, z);
            default:
              return vec3(x, y, z);
          }
        };
      });
    };

    // Main 3D curve - gradient effect via multiple layers
    const curveColors = [
      "hsl(340, 85%, 65%)", // Rose
      "hsl(280, 75%, 60%)", // Purple
      "hsl(210, 80%, 55%)", // Blue
    ];

    curveColors.forEach((color, i) => {
      scene.create("parametricfunction3d", {
        f: createLissajousFunc("xyz"),
        tStart: 0,
        tEnd: TAU,
        color: color,
        thickness: 2 - i * 0.5,
        samples: 512,
      });
    });

    // Projection curves (on the walls)
    const projectionColor = "rgba(100, 100, 120, 0.4)";

    // XY projection (back wall at z = -SCALE-1)
    scene.create("parametricfunction3d", {
      f: scene.atom((get) => {
        if (!get(showProjectionsAtom)) {
          return () => vec3(-100, -100, -100); // Hide off-screen
        }
        const fn = createLissajousFunc("xy");
        return get(fn);
      }),
      tStart: 0,
      tEnd: TAU,
      color: projectionColor,
      thickness: 1,
      samples: 256,
    });

    // XZ projection (floor at y = -SCALE-1)
    scene.create("parametricfunction3d", {
      f: scene.atom((get) => {
        if (!get(showProjectionsAtom)) {
          return () => vec3(-100, -100, -100);
        }
        const fn = createLissajousFunc("xz");
        return get(fn);
      }),
      tStart: 0,
      tEnd: TAU,
      color: projectionColor,
      thickness: 1,
      samples: 256,
    });

    // YZ projection (left wall at x = -SCALE-1)
    scene.create("parametricfunction3d", {
      f: scene.atom((get) => {
        if (!get(showProjectionsAtom)) {
          return () => vec3(-100, -100, -100);
        }
        const fn = createLissajousFunc("yz");
        return get(fn);
      }),
      tStart: 0,
      tEnd: TAU,
      color: projectionColor,
      thickness: 1,
      samples: 256,
    });

    // Trace point on the curve
    const tracePoint = scene.create("point3d", {
      coords: scene.atom((get) => {
        const t = get(traceTAtom) * TAU;
        const a = get(freqXAtom);
        const b = get(freqYAtom);
        const c = get(freqZAtom);
        const dx = get(phaseXAtom) * TAU;
        const dy = get(phaseYAtom) * TAU;
        const dz = get(phaseZAtom) * TAU;
        return vec3(
          SCALE * Math.sin(a * t + dx),
          SCALE * Math.sin(b * t + dy),
          SCALE * Math.sin(c * t + dz)
        );
      }),
      color: "#fff",
      radius: 4,
    });

    // Connection lines from trace point to projections
    const lineAlpha = 0.25;

    // Line to XY plane (back wall)
    scene.create("line3d", {
      start: tracePoint.coords,
      end: scene.atom((get) => {
        if (!get(showProjectionsAtom)) return vec3(-100, -100, -100);
        const pos = get(tracePoint.coords);
        return vec3(pos.x, pos.y, -SCALE - 1);
      }),
      color: `rgba(255, 255, 255, ${lineAlpha})`,
      thickness: 1,
    });

    // Line to XZ plane (floor)
    scene.create("line3d", {
      start: tracePoint.coords,
      end: scene.atom((get) => {
        if (!get(showProjectionsAtom)) return vec3(-100, -100, -100);
        const pos = get(tracePoint.coords);
        return vec3(pos.x, -SCALE - 1, pos.z);
      }),
      color: `rgba(255, 255, 255, ${lineAlpha})`,
      thickness: 1,
    });

    // Line to YZ plane (left wall)
    scene.create("line3d", {
      start: tracePoint.coords,
      end: scene.atom((get) => {
        if (!get(showProjectionsAtom)) return vec3(-100, -100, -100);
        const pos = get(tracePoint.coords);
        return vec3(-SCALE - 1, pos.y, pos.z);
      }),
      color: `rgba(255, 255, 255, ${lineAlpha})`,
      thickness: 1,
    });

    // Projection shadow points
    const shadowPointColor = "rgba(180, 140, 200, 0.6)";

    scene.create("point3d", {
      coords: scene.atom((get) => {
        if (!get(showProjectionsAtom)) return vec3(-100, -100, -100);
        const pos = get(tracePoint.coords);
        return vec3(pos.x, pos.y, -SCALE - 1);
      }),
      color: shadowPointColor,
      radius: 2,
    });

    scene.create("point3d", {
      coords: scene.atom((get) => {
        if (!get(showProjectionsAtom)) return vec3(-100, -100, -100);
        const pos = get(tracePoint.coords);
        return vec3(pos.x, -SCALE - 1, pos.z);
      }),
      color: shadowPointColor,
      radius: 2,
    });

    scene.create("point3d", {
      coords: scene.atom((get) => {
        if (!get(showProjectionsAtom)) return vec3(-100, -100, -100);
        const pos = get(tracePoint.coords);
        return vec3(-SCALE - 1, pos.y, pos.z);
      }),
      color: shadowPointColor,
      radius: 2,
    });

    // Grids for reference planes
    const gridColor = "#1a1a22";
    const gridRange: [number, number] = [-SCALE - 1, SCALE + 1];

    // Back wall (XY at z = -SCALE-1)
    scene.create("grid3d", {
      plane: "xy",
      range1: gridRange,
      range2: gridRange,
      offset: -SCALE - 1,
      color: gridColor,
      thickness: 1,
      gap: 2,
    });

    // Floor (XZ at y = -SCALE-1)
    scene.create("grid3d", {
      plane: "xz",
      range1: gridRange,
      range2: gridRange,
      offset: -SCALE - 1,
      color: gridColor,
      thickness: 1,
      gap: 2,
    });

    // Left wall (YZ at x = -SCALE-1)
    scene.create("grid3d", {
      plane: "yz",
      range1: gridRange,
      range2: gridRange,
      offset: -SCALE - 1,
      color: gridColor,
      thickness: 1,
      gap: 2,
    });

    // Subtle axes
    scene.create("axes3d", {
      x: [-SCALE - 1, SCALE + 1],
      y: [-SCALE - 1, SCALE + 1],
      z: [-SCALE - 1, SCALE + 1],
      color: "#2a2a35",
      thickness: 0.5,
    });

    // Camera
    const camera = scene.create("camera3d", {
      position: vec3(18, 14, 18),
      lookAt: vec3(0, 0, 0),
    });

    const view = new View3D(scene, camera.id, containerRef.current);
    viewRef.current = view;

    return () => {
      view.dispose();
    };
  }, []);

  // Sync state to atoms
  useEffect(() => {
    atomsRef.current?.freqX.set(freqX);
  }, [freqX]);
  useEffect(() => {
    atomsRef.current?.freqY.set(freqY);
  }, [freqY]);
  useEffect(() => {
    atomsRef.current?.freqZ.set(freqZ);
  }, [freqZ]);
  useEffect(() => {
    atomsRef.current?.phaseX.set(phaseX);
  }, [phaseX]);
  useEffect(() => {
    atomsRef.current?.phaseY.set(phaseY);
  }, [phaseY]);
  useEffect(() => {
    atomsRef.current?.phaseZ.set(phaseZ);
  }, [phaseZ]);
  useEffect(() => {
    atomsRef.current?.traceT.set(traceT);
  }, [traceT]);
  useEffect(() => {
    atomsRef.current?.showProjections.set(showProjections);
  }, [showProjections]);

  // Apply preset
  const applyPreset = (params: CurveParams) => {
    setFreqX(params.freqX);
    setFreqY(params.freqY);
    setFreqZ(params.freqZ);
    setPhaseX(params.phaseX);
    setPhaseY(params.phaseY);
    setPhaseZ(params.phaseZ);
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#0c0c10",
        position: "relative",
        fontFamily: "'Crimson Pro', 'Palatino Linotype', Georgia, serif",
        color: "#d8d4cf",
      }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Main Control Panel */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          width: 300,
          backgroundColor: "rgba(16, 16, 20, 0.92)",
          backdropFilter: "blur(12px)",
          borderRadius: 12,
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
            background:
              "linear-gradient(135deg, rgba(100, 60, 120, 0.15) 0%, transparent 100%)",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 400,
              letterSpacing: "0.02em",
              color: "#e8e4df",
            }}
          >
            Lissajous Laboratory
          </h1>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 12,
              color: "rgba(200, 190, 180, 0.6)",
              fontStyle: "italic",
            }}
          >
            Three-dimensional harmonic curves
          </p>
        </div>

        {/* Presets */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <label
            style={{
              display: "block",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "rgba(200, 190, 180, 0.5)",
              marginBottom: 10,
            }}
          >
            Presets
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset.params)}
                style={{
                  padding: "6px 10px",
                  fontSize: 11,
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 6,
                  color: "#b8b4af",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.12)";
                  e.currentTarget.style.color = "#e8e4df";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.color = "#b8b4af";
                }}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Frequency Controls */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <label
            style={{
              display: "block",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "rgba(200, 190, 180, 0.5)",
              marginBottom: 12,
            }}
          >
            Frequencies (a, b, c)
          </label>

          <div style={{ display: "flex", gap: 12 }}>
            {[
              {
                label: "X",
                value: freqX,
                set: setFreqX,
                color: "hsl(340, 70%, 60%)",
              },
              {
                label: "Y",
                value: freqY,
                set: setFreqY,
                color: "hsl(280, 60%, 55%)",
              },
              {
                label: "Z",
                value: freqZ,
                set: setFreqZ,
                color: "hsl(210, 65%, 50%)",
              },
            ].map(({ label, value, set, color }) => (
              <div key={label} style={{ flex: 1, textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 300,
                    color: color,
                    marginBottom: 4,
                  }}
                >
                  {value}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(200, 190, 180, 0.5)",
                    marginBottom: 8,
                  }}
                >
                  {label}
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={value}
                  onChange={(e) => set(parseInt(e.target.value))}
                  style={{ width: "100%", accentColor: color }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Phase Controls */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <label
            style={{
              display: "block",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "rgba(200, 190, 180, 0.5)",
              marginBottom: 12,
            }}
          >
            Phase Shifts (δ)
          </label>

          <div style={{ display: "flex", gap: 12 }}>
            {[
              { label: "δx", value: phaseX, set: setPhaseX },
              { label: "δy", value: phaseY, set: setPhaseY },
              { label: "δz", value: phaseZ, set: setPhaseZ },
            ].map(({ label, value, set }) => (
              <div key={label} style={{ flex: 1, textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 14,
                    color: "rgba(200, 190, 180, 0.7)",
                    marginBottom: 4,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {(value * 360).toFixed(0)}°
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(200, 190, 180, 0.4)",
                    marginBottom: 8,
                  }}
                >
                  {label}
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={value}
                  onChange={(e) => set(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "#888" }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Trace Position */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "rgba(200, 190, 180, 0.5)",
              marginBottom: 10,
            }}
          >
            <span>Trace Position</span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: "rgba(200, 190, 180, 0.7)",
              }}
            >
              t = {(traceT * TAU).toFixed(2)}
            </span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.001"
            value={traceT}
            onChange={(e) => setTraceT(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: "#fff" }}
          />
        </div>

        {/* Options */}
        <div style={{ padding: "16px 24px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              fontSize: 13,
              color: "rgba(200, 190, 180, 0.7)",
            }}
          >
            <input
              type="checkbox"
              checked={showProjections}
              onChange={(e) => setShowProjections(e.target.checked)}
              style={{ accentColor: "#888" }}
            />
            Show Projections
          </label>
        </div>
      </div>

      {/* Equation Display */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          right: 20,
          backgroundColor: "rgba(16, 16, 20, 0.85)",
          backdropFilter: "blur(8px)",
          padding: "16px 20px",
          borderRadius: 10,
          border: "1px solid rgba(255, 255, 255, 0.08)",
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: 12,
          lineHeight: 1.8,
          color: "rgba(200, 190, 180, 0.6)",
        }}
      >
        <div
          style={{
            color: "rgba(200, 190, 180, 0.4)",
            marginBottom: 8,
            fontSize: 10,
            letterSpacing: "0.1em",
          }}
        >
          PARAMETRIC EQUATIONS
        </div>
        <div>
          <span style={{ color: "hsl(340, 70%, 60%)" }}>x</span>(t) = sin(
          <span style={{ color: "hsl(340, 70%, 60%)" }}>{freqX}</span>·t +{" "}
          {(phaseX * TAU).toFixed(2)})
        </div>
        <div>
          <span style={{ color: "hsl(280, 60%, 55%)" }}>y</span>(t) = sin(
          <span style={{ color: "hsl(280, 60%, 55%)" }}>{freqY}</span>·t +{" "}
          {(phaseY * TAU).toFixed(2)})
        </div>
        <div>
          <span style={{ color: "hsl(210, 65%, 50%)" }}>z</span>(t) = sin(
          <span style={{ color: "hsl(210, 65%, 50%)" }}>{freqZ}</span>·t +{" "}
          {(phaseZ * TAU).toFixed(2)})
        </div>
      </div>

      {/* Instructions */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: 20,
          fontSize: 11,
          color: "rgba(200, 190, 180, 0.35)",
          fontStyle: "italic",
        }}
      >
        Drag to orbit · Scroll to zoom · Right-click to pan
      </div>
    </div>
  );
}
