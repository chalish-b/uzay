import { useEffect, useRef, useState } from "react";
import { Scene3D } from "../core/scene3d";
import { vec3 } from "../core/common-types/vec3";
import { View3D } from "../core/view3d";

/** DEMO MADE BY Gemini 3 Pro */

export default function Demo7() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Parameter state
  const [params, setParams] = useState({
    m: 7,
    n1: 3,
    n2: 4,
    n3: 17,
    a: 1,
    b: 1,
  });

  // Keep references to atoms to update them
  const atomsRef = useRef<{
    m: any;
    n1: any;
    n2: any;
    n3: any;
    a: any;
    b: any;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const scene = new Scene3D();

    // Create atoms for parameters
    const mAtom = scene.atom(params.m);
    const n1Atom = scene.atom(params.n1);
    const n2Atom = scene.atom(params.n2);
    const n3Atom = scene.atom(params.n3);
    const aAtom = scene.atom(params.a);
    const bAtom = scene.atom(params.b);

    atomsRef.current = {
      m: mAtom,
      n1: n1Atom,
      n2: n2Atom,
      n3: n3Atom,
      a: aAtom,
      b: bAtom,
    };

    // Helper for superformula calculation inside atom getters
    const getR = (
      phi: number,
      m: number,
      n1: number,
      n2: number,
      n3: number,
      a: number,
      b: number
    ) => {
      if (n1 === 0) return 0;
      const t1 = Math.abs(Math.cos((m * phi) / 4) / a);
      const t2 = Math.abs(Math.sin((m * phi) / 4) / b);
      return Math.pow(Math.pow(t1, n2) + Math.pow(t2, n3), -1 / n1);
    };

    // Create Grid and Axes
    scene.create("grid3d", { color: "#333", thickness: 1 });
    scene.create("axes3d", { thickness: 1, length: 5 });

    const LATITUDES = 20;
    const LONGITUDES = 20;

    // Create Latitude lines (vary theta, fixed phi)
    for (let i = 0; i < LATITUDES; i++) {
      // phi goes from -PI/2 to PI/2
      // Avoid exact poles to prevent 0/0 or boring points
      const phiRatio = (i + 1) / (LATITUDES + 1);
      const phiBase = -Math.PI / 2 + phiRatio * Math.PI;

      scene.create("parametricfunction3d", {
        f: scene.atom((get) => (theta: number) => {
          const m = get(mAtom);
          const n1 = get(n1Atom);
          const n2 = get(n2Atom);
          const n3 = get(n3Atom);
          const a = get(aAtom);
          const b = get(bAtom);

          const r1 = getR(theta, m, n1, n2, n3, a, b);
          const r2 = getR(phiBase, m, n1, n2, n3, a, b);

          const x = r1 * Math.cos(theta) * r2 * Math.cos(phiBase);
          const y = r1 * Math.sin(theta) * r2 * Math.cos(phiBase);
          const z = r2 * Math.sin(phiBase);

          return vec3(x, y, z);
        }),
        tStart: -Math.PI,
        tEnd: Math.PI,
        samples: 256,
        thickness: 1,
        color: `hsl(${i * (360 / LATITUDES)}, 70%, 60%)`, // Rainbow latitudes
      });
    }

    // Create Longitude lines (vary phi, fixed theta)
    for (let i = 0; i < LONGITUDES; i++) {
      const thetaBase = -Math.PI + (i / LONGITUDES) * 2 * Math.PI;

      scene.create("parametricfunction3d", {
        f: scene.atom((get) => (phi: number) => {
          const m = get(mAtom);
          const n1 = get(n1Atom);
          const n2 = get(n2Atom);
          const n3 = get(n3Atom);
          const a = get(aAtom);
          const b = get(bAtom);

          const r1 = getR(thetaBase, m, n1, n2, n3, a, b);
          const r2 = getR(phi, m, n1, n2, n3, a, b);

          const x = r1 * Math.cos(thetaBase) * r2 * Math.cos(phi);
          const y = r1 * Math.sin(thetaBase) * r2 * Math.cos(phi);
          const z = r2 * Math.sin(phi);

          return vec3(x, y, z);
        }),
        tStart: -Math.PI / 2,
        tEnd: Math.PI / 2,
        samples: 256,
        thickness: 1,
        color: `hsl(${i * (360 / LONGITUDES) + 180}, 70%, 60%)`, // Rainbow longitudes (shifted hue)
      });
    }

    // Camera
    const camera = scene.create("camera3d", {
      position: vec3(8, 8, 8),
      lookAt: vec3(0, 0, 0),
    });

    new View3D(scene, camera.id, containerRef.current);

    // Cleanup not strictly necessary in this demo framework as it re-mounts
  }, []);

  // Update atoms when React state changes
  useEffect(() => {
    if (atomsRef.current) {
      atomsRef.current.m.set(params.m);
      atomsRef.current.n1.set(params.n1);
      atomsRef.current.n2.set(params.n2);
      atomsRef.current.n3.set(params.n3);
      atomsRef.current.a.set(params.a);
      atomsRef.current.b.set(params.b);
    }
  }, [params]);

  const controlStyle = {
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
    marginBottom: "8px",
  };

  const labelStyle = {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "12px",
    color: "#ccc",
    fontFamily: "monospace",
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }}></div>

      {/* Controls Panel */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          width: "220px",
          backgroundColor: "rgba(20, 20, 20, 0.85)",
          backdropFilter: "blur(4px)",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #333",
          color: "white",
          maxHeight: "calc(100% - 20px)",
          overflowY: "auto",
        }}
      >
        <h3
          style={{
            margin: "0 0 16px 0",
            fontSize: "16px",
            fontWeight: 600,
            color: "#fff",
          }}
        >
          Superformula Explorer
        </h3>

        <div style={controlStyle}>
          <div style={labelStyle}>
            <span>m (Symmetry)</span>
            <span>{params.m}</span>
          </div>
          <input
            type="range"
            min="0"
            max="20"
            step="1"
            value={params.m}
            onChange={(e) =>
              setParams((p) => ({ ...p, m: parseFloat(e.target.value) }))
            }
          />
        </div>

        <div style={controlStyle}>
          <div style={labelStyle}>
            <span>n1 (Shape)</span>
            <span>{params.n1.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="10"
            step="0.1"
            value={params.n1}
            onChange={(e) =>
              setParams((p) => ({ ...p, n1: parseFloat(e.target.value) }))
            }
          />
        </div>

        <div style={controlStyle}>
          <div style={labelStyle}>
            <span>n2 (Shape)</span>
            <span>{params.n2.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={params.n2}
            onChange={(e) =>
              setParams((p) => ({ ...p, n2: parseFloat(e.target.value) }))
            }
          />
        </div>

        <div style={controlStyle}>
          <div style={labelStyle}>
            <span>n3 (Shape)</span>
            <span>{params.n3.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={params.n3}
            onChange={(e) =>
              setParams((p) => ({ ...p, n3: parseFloat(e.target.value) }))
            }
          />
        </div>

        <div style={controlStyle}>
          <div style={labelStyle}>
            <span>a (Scale X)</span>
            <span>{params.a.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={params.a}
            onChange={(e) =>
              setParams((p) => ({ ...p, a: parseFloat(e.target.value) }))
            }
          />
        </div>

        <div style={controlStyle}>
          <div style={labelStyle}>
            <span>b (Scale Y)</span>
            <span>{params.b.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={params.b}
            onChange={(e) =>
              setParams((p) => ({ ...p, b: parseFloat(e.target.value) }))
            }
          />
        </div>

        <div
          style={{
            marginTop: "16px",
            fontSize: "11px",
            color: "#888",
            lineHeight: "1.4",
          }}
        >
          Controls the 3D Supershape.
          <br />
          Use mouse to rotate/zoom.
        </div>
      </div>
    </div>
  );
}
