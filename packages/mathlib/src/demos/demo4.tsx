import { useEffect, useRef, useState } from "react";
import { Scene3D } from "../core/scene3d";
import { vec3 } from "../core/common-types/vec3";
import { View3D } from "../core/view3d";
import type { BoundAtom } from "../core/atom-wrapper";
import type { PrimitiveAtom } from "jotai";

/** DEMO MADE BY Gemini 3 Pro */

/**
 * Double Pendulum Demo
 *
 * A physical simulation of a double pendulum, a classic example of a chaotic system.
 * It demonstrates real-time physics integration with the visualization library.
 */

// Physics constants
const DT = 0.016; // Fixed time step for physics

type PendulumState = {
  theta1: number;
  theta2: number;
  omega1: number;
  omega2: number;
};

// Physics simulation step using Runge-Kutta 4 or simple Euler integration?
// For visual demo, semi-implicit Euler or just explicit Euler might be stable enough if DT is small.
// Let's use the explicit formulas derived from Lagrangian.

function computeAccelerations(
  state: PendulumState,
  m1: number,
  m2: number,
  l1: number,
  l2: number,
  g: number
) {
  const { theta1, theta2, omega1, omega2 } = state;

  const num1 = -g * (2 * m1 + m2) * Math.sin(theta1);
  const num2 = -m2 * g * Math.sin(theta1 - 2 * theta2);
  const num3 = -2 * Math.sin(theta1 - theta2) * m2;
  const num4 =
    omega2 * omega2 * l2 + omega1 * omega1 * l1 * Math.cos(theta1 - theta2);
  const den1 = l1 * (2 * m1 + m2 - m2 * Math.cos(2 * theta1 - 2 * theta2));

  const alpha1 = (num1 + num2 + num3 * num4) / den1;

  const num5 = 2 * Math.sin(theta1 - theta2);
  const num6 = omega1 * omega1 * l1 * (m1 + m2);
  const num7 = g * (m1 + m2) * Math.cos(theta1);
  const num8 = omega2 * omega2 * l2 * m2 * Math.cos(theta1 - theta2);
  const den2 = l2 * (2 * m1 + m2 - m2 * Math.cos(2 * theta1 - 2 * theta2));

  const alpha2 = (num5 * (num6 + num7 + num8)) / den2;

  return { alpha1, alpha2 };
}

export default function Demo4() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View3D | null>(null);
  const animationRef = useRef<number | null>(null);

  // Atoms to control visualization
  const atomsRef = useRef<{
    theta1: BoundAtom<PrimitiveAtom<number>>;
    theta2: BoundAtom<PrimitiveAtom<number>>;
    p1: BoundAtom<PrimitiveAtom<{ x: number; y: number; z: number }>>; // Position of mass 1
    p2: BoundAtom<PrimitiveAtom<{ x: number; y: number; z: number }>>; // Position of mass 2
    trailLength: BoundAtom<PrimitiveAtom<number>>;
  } | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [m1, setM1] = useState(10);
  const [m2, setM2] = useState(10);
  const [l1, setL1] = useState(10);
  const [l2, setL2] = useState(10);
  const [gravity, setGravity] = useState(9.81);
  const [trailLength, setTrailLength] = useState(500);

  // Mutable physics state
  const physicsState = useRef<PendulumState>({
    theta1: Math.PI / 2,
    theta2: Math.PI / 2,
    omega1: 0,
    omega2: 0,
  });

  // History for trail
  const historyRef = useRef<{ x: number; y: number; z: number }[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new Scene3D();

    const theta1Atom = scene.atom(Math.PI / 2);
    const theta2Atom = scene.atom(Math.PI / 2);
    const p1Atom = scene.atom(vec3(0, 0, 0));
    const p2Atom = scene.atom(vec3(0, 0, 0));
    const trailLengthAtom = scene.atom(500);

    atomsRef.current = {
      theta1: theta1Atom,
      theta2: theta2Atom,
      p1: p1Atom,
      p2: p2Atom,
      trailLength: trailLengthAtom,
    };

    // Visualization setup

    // Pivot point
    scene.create("point3d", {
      coords: vec3(0, 15, 0),
      color: "#888",
      radius: 1,
    });

    // Arm 1
    scene.create("line3d", {
      start: vec3(0, 15, 0),
      end: p1Atom,
      color: "#ccc",
      thickness: 2,
    });

    // Mass 1
    scene.create("point3d", {
      coords: p1Atom,
      color: "#3498db",
      radius: 3,
    });

    // Arm 2
    scene.create("line3d", {
      start: p1Atom,
      end: p2Atom,
      color: "#ccc",
      thickness: 2,
    });

    // Mass 2
    scene.create("point3d", {
      coords: p2Atom,
      color: "#e74c3c",
      radius: 3,
    });

    // Trail
    // Since we compute positions frame-by-frame, we can't easily use a pure parametric function based on time
    // without re-simulating the whole history.
    // Instead, we can use a parametric function that reads from our history array.

    // We'll update the history array in the animation loop.
    scene.create("parametricfunction3d", {
      f: scene.atom((get) => {
        // We trigger an update when p2 changes (which happens every frame)
        get(p2Atom);
        const hist = historyRef.current;
        const len = hist.length;

        return (t: number) => {
          if (len < 2) return vec3(0, 0, 0);
          const index = Math.floor(t * (len - 1));
          const p = hist[index];
          return vec3(p.x, p.y, p.z);
        };
      }),
      tStart: 0,
      tEnd: 1,
      color: "#e74c3c",
      thickness: 1,
      samples: scene.atom((get) => Math.min(500, get(trailLengthAtom))),
    });

    // Environment
    scene.create("grid3d", {
      plane: "xy",
      range1: [-30, 30],
      range2: [-30, 30],
      offset: -10, // Back plane
      color: "#222",
      thickness: 1,
    });

    scene.create("axes3d", {
      x: [-20, 20],
      y: [-20, 20],
      z: [-20, 20],
      thickness: 0.5,
      color: "#333",
    });

    const camera = scene.create("camera3d", {
      position: vec3(0, 5, 40),
      lookAt: vec3(0, 5, 0),
    });

    const view = new View3D(scene, camera.id, containerRef.current);
    viewRef.current = view;

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
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

  // Animation Loop
  useEffect(() => {
    if (!atomsRef.current) return;

    if (isPlaying) {
      const animate = () => {
        if (!atomsRef.current) return;

        // Physics Step
        // We use the values from state, not atoms, for physics to be independent of render rate if needed
        // But here we do 1 step per frame for simplicity.
        const state = physicsState.current;
        const { alpha1, alpha2 } = computeAccelerations(
          state,
          m1,
          m2,
          l1,
          l2,
          gravity
        );

        state.omega1 += alpha1 * DT;
        state.omega2 += alpha2 * DT;
        state.theta1 += state.omega1 * DT;
        state.theta2 += state.omega2 * DT;

        // Damping (optional, keeps it from blowing up eventually due to numerical errors)
        state.omega1 *= 0.999;
        state.omega2 *= 0.999;

        // Calculate positions
        // Pivot at (0, 15, 0)
        const x1 = l1 * Math.sin(state.theta1);
        const y1 = 15 - l1 * Math.cos(state.theta1);
        const z1 = 0;

        const x2 = x1 + l2 * Math.sin(state.theta2);
        const y2 = y1 - l2 * Math.cos(state.theta2);
        const z2 = 0;

        // Update atoms
        atomsRef.current.theta1.set(state.theta1);
        atomsRef.current.theta2.set(state.theta2);
        atomsRef.current.p1.set(vec3(x1, y1, z1));
        atomsRef.current.p2.set(vec3(x2, y2, z2));

        // Update History
        historyRef.current.push({ x: x2, y: y2, z: z2 });
        if (historyRef.current.length > trailLength) {
          historyRef.current.shift();
        }

        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, m1, m2, l1, l2, gravity, trailLength]);

  // Sync trail length atom
  useEffect(() => {
    atomsRef.current?.trailLength.set(trailLength);
  }, [trailLength]);

  // Reset function
  const handleReset = () => {
    physicsState.current = {
      theta1: Math.PI / 2,
      theta2: Math.PI / 2,
      omega1: 0,
      omega2: 0,
    };
    historyRef.current = [];
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#1a1a1a",
        position: "relative",
        fontFamily: "system-ui, sans-serif",
        color: "#eee",
      }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }}></div>

      {/* Controls */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          width: 280,
          padding: 20,
          backgroundColor: "rgba(30, 30, 35, 0.9)",
          backdropFilter: "blur(4px)",
          borderRadius: 8,
          border: "1px solid #444",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        }}
      >
        <h2 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 600 }}>
          Double Pendulum
        </h2>

        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              width: "48%",
              marginRight: "4%",
              padding: "8px",
              cursor: "pointer",
              backgroundColor: isPlaying ? "#c0392b" : "#27ae60",
              color: "white",
              border: "none",
              borderRadius: 4,
            }}
          >
            {isPlaying ? "Stop" : "Start"}
          </button>
          <button
            onClick={handleReset}
            style={{
              width: "48%",
              padding: "8px",
              cursor: "pointer",
              backgroundColor: "#555",
              color: "white",
              border: "none",
              borderRadius: 4,
            }}
          >
            Reset
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              marginBottom: 4,
              color: "#aaa",
            }}
          >
            Gravity (g): {gravity.toFixed(1)}
          </label>
          <input
            type="range"
            min="1"
            max="30"
            step="0.1"
            value={gravity}
            onChange={(e) => setGravity(parseFloat(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              marginBottom: 4,
              color: "#aaa",
            }}
          >
            Mass 1: {m1}
          </label>
          <input
            type="range"
            min="1"
            max="50"
            value={m1}
            onChange={(e) => setM1(parseFloat(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              marginBottom: 4,
              color: "#aaa",
            }}
          >
            Mass 2: {m2}
          </label>
          <input
            type="range"
            min="1"
            max="50"
            value={m2}
            onChange={(e) => setM2(parseFloat(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              marginBottom: 4,
              color: "#aaa",
            }}
          >
            Length 1: {l1}
          </label>
          <input
            type="range"
            min="5"
            max="20"
            value={l1}
            onChange={(e) => setL1(parseFloat(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              marginBottom: 4,
              color: "#aaa",
            }}
          >
            Length 2: {l2}
          </label>
          <input
            type="range"
            min="5"
            max="20"
            value={l2}
            onChange={(e) => setL2(parseFloat(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              marginBottom: 4,
              color: "#aaa",
            }}
          >
            Trail Length: {trailLength}
          </label>
          <input
            type="range"
            min="100"
            max="2000"
            value={trailLength}
            onChange={(e) => setTrailLength(parseFloat(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </div>
  );
}
