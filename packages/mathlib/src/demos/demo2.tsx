import { useEffect, useRef, useState } from "react";
import { Scene3D } from "../core/scene3d";
import { vec3 } from "../core/common-types/vec3";
import { View3D } from "../core/view3d";
import type { BoundAtom } from "../core/atom-wrapper";
import type { PrimitiveAtom } from "jotai";

/** DEMO MADE BY CLAUDE OPUS 4.5 */

/**
 * Lorenz Attractor Demo
 *
 * The Lorenz system is a set of chaotic differential equations:
 * dx/dt = σ(y - x)
 * dy/dt = x(ρ - z) - y
 * dz/dt = xy - βz
 *
 * With standard parameters σ=10, ρ=28, β=8/3, it produces
 * the famous "butterfly" attractor shape.
 */

// Lorenz system parameters
const SIGMA = 10;
const RHO = 28;
const BETA = 8 / 3;
const DT = 0.005;
const STEPS = 8000;

// Pre-compute the Lorenz attractor trajectory
function computeLorenzTrajectory() {
  const points: { x: number; y: number; z: number }[] = [];
  let x = 0.1,
    y = 0,
    z = 0;

  for (let i = 0; i < STEPS; i++) {
    const dx = SIGMA * (y - x);
    const dy = x * (RHO - z) - y;
    const dz = x * y - BETA * z;

    x += dx * DT;
    y += dy * DT;
    z += dz * DT;

    points.push({ x, y, z });
  }

  return points;
}

const lorenzPoints = computeLorenzTrajectory();

// Scale and center the attractor
const SCALE = 0.2;
const CENTER_Z = -25;

function scaledPoint(idx: number) {
  const p = lorenzPoints[Math.min(Math.max(0, idx), lorenzPoints.length - 1)];
  return vec3(p.x * SCALE, p.z * SCALE + CENTER_Z * SCALE, p.y * SCALE);
}

export default function Demo2() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View3D | null>(null);
  const animationRef = useRef<number | null>(null);
  const atomsRef = useRef<{
    progress: BoundAtom<PrimitiveAtom<number>>;
    trailLength: BoundAtom<PrimitiveAtom<number>>;
    speed: BoundAtom<PrimitiveAtom<number>>;
  } | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [trailLength, setTrailLength] = useState(1500);
  const [speed, setSpeed] = useState(3);

  // Initialize scene once
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new Scene3D();

    // Current position in the trajectory
    const progressAtom = scene.atom(0);
    const trailLengthAtom = scene.atom(1500);
    const speedAtom = scene.atom(3);

    atomsRef.current = {
      progress: progressAtom,
      trailLength: trailLengthAtom,
      speed: speedAtom,
    };

    // Create multiple trailing curves with gradient colors
    const colors = [
      "hsl(280, 80%, 60%)", // Purple
      "hsl(320, 80%, 60%)", // Pink
      "hsl(350, 80%, 60%)", // Rose
      "hsl(20, 80%, 60%)", // Orange
      "hsl(45, 80%, 65%)", // Gold
    ];

    for (let i = 0; i < 5; i++) {
      const trailOffset = i * 150;

      scene.create("parametricfunction3d", {
        f: scene.atom((get) => {
          const progress = get(progressAtom);
          const length = get(trailLengthAtom);
          const startIdx = Math.max(0, progress - length - trailOffset);
          const endIdx = Math.max(0, progress - trailOffset);

          return (t: number) => {
            const idx = Math.floor(startIdx + t * (endIdx - startIdx));
            return scaledPoint(idx);
          };
        }),
        tStart: 0,
        tEnd: 1,
        color: colors[i],
        thickness: 2.5 - i * 0.3,
        samples: scene.atom((get) => Math.min(256, get(trailLengthAtom) / 4)),
      });
    }

    // Main tracing point - the "head" of the attractor
    const mainPoint = scene.create("point3d", {
      coords: scene.atom((get) => {
        const progress = get(progressAtom);
        return scaledPoint(Math.floor(progress));
      }),
      color: "white",
      radius: 4,
    });

    // Ghost points showing the "history" of positions
    const ghostColors = ["#ff6b9d", "#c44dff", "#6b5bff"];
    for (let i = 0; i < 3; i++) {
      const ghostDelay = (i + 1) * 80;
      scene.create("point3d", {
        coords: scene.atom((get) => {
          const progress = get(progressAtom);
          return scaledPoint(Math.max(0, Math.floor(progress) - ghostDelay));
        }),
        color: ghostColors[i],
        radius: 2.5 - i * 0.5,
      });
    }

    // Projection line to the floor
    scene.create("line3d", {
      start: mainPoint.coords,
      end: scene.atom((get) => {
        const pos = get(mainPoint.coords);
        return vec3(pos.x, -5, pos.z);
      }),
      color: "rgba(255, 255, 255, 0.3)",
      thickness: 0.5,
    });

    // Shadow point on the floor
    scene.create("point3d", {
      coords: scene.atom((get) => {
        const pos = get(mainPoint.coords);
        return vec3(pos.x, -5, pos.z);
      }),
      color: "rgba(150, 100, 200, 0.4)",
      radius: 2,
    });

    // Subtle grid on the floor
    scene.create("grid3d", {
      plane: "xz",
      range1: [-10, 10],
      range2: [-10, 10],
      offset: -5,
      color: "#222",
      thickness: 1,
      gap: 2,
    });

    // Minimal axes
    scene.create("axes3d", {
      x: [-8, 8],
      y: [-5, 8],
      z: [-8, 8],
      color: "#333",
      thickness: 0.5,
    });

    // Camera setup - angled view of the attractor
    const camera = scene.create("camera3d", {
      position: vec3(20, 15, 25),
      lookAt: vec3(0, 0, 0),
    });

    const view = new View3D(scene, camera.id, containerRef.current);
    viewRef.current = view;

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      view.dispose();
    };
  }, []);

  // Animation loop - separate effect to respond to isPlaying changes
  useEffect(() => {
    if (!atomsRef.current) return;

    if (isPlaying) {
      let lastTime = performance.now();

      function animate(currentTime: number) {
        if (!atomsRef.current) return;

        const delta = currentTime - lastTime;
        lastTime = currentTime;

        const currentProgress = atomsRef.current.progress.get();
        const currentSpeed = atomsRef.current.speed.get();

        const newProgress = currentProgress + delta * 0.03 * currentSpeed;

        if (newProgress > STEPS - 1) {
          atomsRef.current.progress.set(0);
        } else {
          atomsRef.current.progress.set(newProgress);
        }

        animationRef.current = requestAnimationFrame(animate);
      }

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
  }, [isPlaying]);

  // Sync React state to atoms
  useEffect(() => {
    atomsRef.current?.trailLength.set(trailLength);
  }, [trailLength]);

  useEffect(() => {
    atomsRef.current?.speed.set(speed);
  }, [speed]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#0a0a0f",
        position: "relative",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }}></div>

      {/* Control Panel */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          backgroundColor: "rgba(20, 20, 25, 0.9)",
          backdropFilter: "blur(8px)",
          padding: "16px 20px",
          borderRadius: 8,
          border: "1px solid #333",
          color: "#ccc",
          minWidth: 220,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h2
          style={{
            margin: "0 0 12px 0",
            fontSize: 16,
            fontWeight: 600,
            color: "#eee",
          }}
        >
          Lorenz Attractor
        </h2>

        <div
          style={{
            fontSize: 11,
            color: "#888",
            marginBottom: 16,
            lineHeight: 1.5,
          }}
        >
          A chaotic system discovered by
          <br />
          Edward Lorenz in 1963
        </div>

        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              display: "block",
              marginBottom: 6,
              fontSize: 11,
              color: "#999",
            }}
          >
            Speed: {speed.toFixed(1)}x
          </label>
          <input
            type="range"
            min="0.5"
            max="8"
            step="0.5"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            style={{
              width: "100%",
              accentColor: "#888",
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              marginBottom: 6,
              fontSize: 11,
              color: "#999",
            }}
          >
            Trail Length: {trailLength}
          </label>
          <input
            type="range"
            min="200"
            max="4000"
            step="100"
            value={trailLength}
            onChange={(e) => setTrailLength(parseInt(e.target.value))}
            style={{
              width: "100%",
              accentColor: "#888",
            }}
          />
        </div>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            width: "100%",
            padding: "10px 14px",
            backgroundColor: isPlaying ? "#444" : "#555",
            border: "1px solid #555",
            borderRadius: 6,
            color: "#eee",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            transition: "background-color 0.15s",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = isPlaying
              ? "#505050"
              : "#606060";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = isPlaying ? "#444" : "#555";
          }}
        >
          {isPlaying ? "⏸ Pause" : "▶ Play"}
        </button>
      </div>

      {/* Equation Display */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          right: 16,
          backgroundColor: "rgba(20, 20, 25, 0.85)",
          backdropFilter: "blur(8px)",
          padding: "14px 18px",
          borderRadius: 8,
          border: "1px solid #333",
          color: "#777",
          fontSize: 12,
          fontFamily: "'JetBrains Mono', monospace",
          lineHeight: 1.7,
        }}
      >
        <div style={{ color: "#999", marginBottom: 6 }}>Lorenz System:</div>
        <div>dx/dt = σ(y - x)</div>
        <div>dy/dt = x(ρ - z) - y</div>
        <div>dz/dt = xy - βz</div>
        <div style={{ marginTop: 10, color: "#555", fontSize: 10 }}>
          σ={SIGMA}, ρ={RHO}, β=8/3
        </div>
      </div>
    </div>
  );
}
