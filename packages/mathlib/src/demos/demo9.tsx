import { useEffect, useRef, useState } from "react";
import { Scene3D } from "../core/scene3d";
import { Vec3, vec3 } from "../core/common-types/vec3";
import { View3D } from "../core/view3d";
import type { BoundAtom } from "../core/atom-wrapper";
import type { PrimitiveAtom } from "jotai";

/**
 * Gravity Sculptor - Interactive 3D N-Body Orbital Visualization
 *
 * Drag the colored "mass" points to sculpt the gravitational field.
 * A particle traces its orbit through the gravity wells in real-time.
 */

// Vector math helpers
function vecAdd(a: Vec3, b: Vec3): Vec3 {
  return vec3(a.x + b.x, a.y + b.y, a.z + b.z);
}

function vecScale(v: Vec3, s: number): Vec3 {
  return vec3(v.x * s, v.y * s, v.z * s);
}

// Compute gravitational acceleration from multiple masses
function computeAcceleration(
  pos: Vec3,
  masses: { pos: Vec3; mass: number }[]
): Vec3 {
  let ax = 0,
    ay = 0,
    az = 0;
  const G = 1.5; // Gravitational constant (tuned for visuals)
  const softening = 0.5; // Prevents singularity at mass centers

  for (const m of masses) {
    const dx = m.pos.x - pos.x;
    const dy = m.pos.y - pos.y;
    const dz = m.pos.z - pos.z;
    const distSq = dx * dx + dy * dy + dz * dz + softening * softening;
    const dist = Math.sqrt(distSq);
    const force = (G * m.mass) / distSq;

    ax += (force * dx) / dist;
    ay += (force * dy) / dist;
    az += (force * dz) / dist;
  }

  return vec3(ax, ay, az);
}

// Integrate orbit using RK4 for accuracy
function integrateOrbit(
  startPos: Vec3,
  startVel: Vec3,
  masses: { pos: Vec3; mass: number }[],
  steps: number,
  dt: number
): Vec3[] {
  const path: Vec3[] = [startPos];
  let pos = startPos;
  let vel = startVel;

  for (let i = 0; i < steps; i++) {
    // RK4 integration
    const k1v = computeAcceleration(pos, masses);
    const k1p = vel;

    const k2v = computeAcceleration(
      vecAdd(pos, vecScale(k1p, dt / 2)),
      masses
    );
    const k2p = vecAdd(vel, vecScale(k1v, dt / 2));

    const k3v = computeAcceleration(
      vecAdd(pos, vecScale(k2p, dt / 2)),
      masses
    );
    const k3p = vecAdd(vel, vecScale(k2v, dt / 2));

    const k4v = computeAcceleration(vecAdd(pos, vecScale(k3p, dt)), masses);
    const k4p = vecAdd(vel, vecScale(k3v, dt));

    vel = vecAdd(
      vel,
      vecScale(
        vecAdd(vecAdd(k1v, vecScale(k2v, 2)), vecAdd(vecScale(k3v, 2), k4v)),
        dt / 6
      )
    );
    pos = vecAdd(
      pos,
      vecScale(
        vecAdd(vecAdd(k1p, vecScale(k2p, 2)), vecAdd(vecScale(k3p, 2), k4p)),
        dt / 6
      )
    );

    path.push(pos);
  }

  return path;
}

// Create a smooth parametric function from a path
function createPathFunction(path: Vec3[]): (t: number) => Vec3 {
  return (t: number) => {
    const n = path.length - 1;
    const scaledT = Math.max(0, Math.min(1, t)) * n;
    const i = Math.floor(scaledT);
    const frac = scaledT - i;

    if (i >= n) return path[n];
    if (i < 0) return path[0];

    // Catmull-Rom interpolation for smoothness
    const p0 = path[Math.max(0, i - 1)];
    const p1 = path[i];
    const p2 = path[Math.min(n, i + 1)];
    const p3 = path[Math.min(n, i + 2)];

    const t2 = frac * frac;
    const t3 = t2 * frac;

    return vec3(
      0.5 *
        (2 * p1.x +
          (-p0.x + p2.x) * frac +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
      0.5 *
        (2 * p1.y +
          (-p0.y + p2.y) * frac +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      0.5 *
        (2 * p1.z +
          (-p0.z + p2.z) * frac +
          (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
          (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3)
    );
  };
}

// Mass configurations
const massConfigs = [
  { pos: vec3(-4, 2, 0), color: "#ff6b6b", mass: 8 },
  { pos: vec3(4, -1, 2), color: "#4ecdc4", mass: 6 },
  { pos: vec3(0, 3, -3), color: "#ffe66d", mass: 5 },
  { pos: vec3(-2, -3, 4), color: "#a29bfe", mass: 4 },
];

// Initial orbital conditions
const INITIAL_POS = vec3(6, 0, 0);
const INITIAL_VEL = vec3(0, 0.8, 0.6);
const ORBIT_STEPS = 800;
const ORBIT_DT = 0.08;

export default function Demo9() {
  const containerRef = useRef<HTMLDivElement>(null);
  const timeAtomRef = useRef<BoundAtom<PrimitiveAtom<number>> | null>(null);
  const animationRef = useRef<number | null>(null);

  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const scene = new Scene3D();

    // Time atom for animation
    const timeAtom = scene.atom(0);
    timeAtomRef.current = timeAtom;
    timeAtom.sub(() => setTime(timeAtom.get()));

    // Create atoms for mass positions
    const massAtoms = massConfigs.map((config) => ({
      pos: scene.atom(config.pos),
      color: config.color,
      mass: config.mass,
    }));

    // Create draggable mass points
    massAtoms.forEach((m) => {
      scene.create("point3d", {
        coords: m.pos,
        color: m.color,
        radius: 2.5 + m.mass * 0.15,
        draggable: "xyz",
      });
    });

    // Create the orbital path (recomputed when masses move)
    const orbitFunction = scene.atom((get) => {
      const masses = massAtoms.map((m) => ({
        pos: get(m.pos),
        mass: m.mass,
      }));

      const path = integrateOrbit(
        INITIAL_POS,
        INITIAL_VEL,
        masses,
        ORBIT_STEPS,
        ORBIT_DT
      );
      return createPathFunction(path);
    });

    // Main orbital trail (thinner line)
    scene.create("parametricfunction3d", {
      f: orbitFunction,
      tStart: 0,
      tEnd: 1,
      color: "#555",
      thickness: 0.4,
      samples: 400,
    });

    // Traced path up to current time (shows where particle has been)
    scene.create("parametricfunction3d", {
      f: orbitFunction,
      tStart: 0,
      tEnd: timeAtom,
      color: "#fff",
      thickness: 0.6,
      samples: 400,
    });

    // Tracer particle at current time position
    scene.create("point3d", {
      coords: scene.atom((get) => {
        const f = get(orbitFunction);
        const t = get(timeAtom);
        return f(t);
      }),
      color: "#ffffff",
      radius: 2.5,
      draggable: "none",
    });

    // Center of mass indicator
    scene.create("point3d", {
      coords: scene.atom((get) => {
        let totalMass = 0;
        let cx = 0,
          cy = 0,
          cz = 0;
        for (const m of massAtoms) {
          const pos = get(m.pos);
          cx += pos.x * m.mass;
          cy += pos.y * m.mass;
          cz += pos.z * m.mass;
          totalMass += m.mass;
        }
        return vec3(cx / totalMass, cy / totalMass, cz / totalMass);
      }),
      color: "#444",
      radius: 1.2,
      draggable: "none",
    });

    // Lines from center of mass to each mass
    massAtoms.forEach((m) => {
      scene.create("line3d", {
        start: scene.atom((get) => {
          let totalMass = 0;
          let cx = 0,
            cy = 0,
            cz = 0;
          for (const ma of massAtoms) {
            const pos = get(ma.pos);
            cx += pos.x * ma.mass;
            cy += pos.y * ma.mass;
            cz += pos.z * ma.mass;
            totalMass += ma.mass;
          }
          return vec3(cx / totalMass, cy / totalMass, cz / totalMass);
        }),
        end: m.pos,
        color: "#222",
        thickness: 0.3,
      });
    });

    // Grid and axes
    scene.create("grid3d", {
      plane: "xz",
      range1: [-12, 12],
      range2: [-12, 12],
      offset: -6,
      color: "#1a1a1a",
      thickness: 1,
      gap: 2,
    });

    scene.create("axes3d", {
      x: [-12, 12],
      y: [-8, 8],
      z: [-12, 12],
      color: "#2a2a2a",
      thickness: 0.5,
    });

    const camera = scene.create("camera3d", {
      position: vec3(16, 12, 16),
      lookAt: vec3(0, 0, 0),
    });

    const view = new View3D(scene, camera.id, containerRef.current);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      view.dispose();
    };
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    let lastTime = performance.now();
    const speed = 0.05; // Units per second

    const animate = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (timeAtomRef.current) {
        const currentTime = timeAtomRef.current.get();
        let newTime = currentTime + delta * speed;

        // Loop back to start when reaching the end
        if (newTime >= 1) {
          newTime = 0;
        }

        timeAtomRef.current.set(newTime);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  const handleTimeChange = (value: number) => {
    if (timeAtomRef.current) {
      timeAtomRef.current.set(value);
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const resetTime = () => {
    setIsPlaying(false);
    if (timeAtomRef.current) {
      timeAtomRef.current.set(0);
    }
  };

  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: "#0a0a0a", position: "relative" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          color: "#888",
          fontFamily: "system-ui, sans-serif",
          fontSize: 14,
          maxWidth: 300,
          backgroundColor: "rgba(10, 10, 10, 0.5)",
          padding: 16,
          borderRadius: 8,
        }}
      >
        <div style={{ marginBottom: 8, color: "#fff", fontSize: 16 }}>
          Gravity Sculptor
        </div>
        <div style={{ marginBottom: 12, lineHeight: 1.5 }}>
          Drag the colored masses to sculpt the gravitational field. Use the
          controls to watch the particle orbit.
        </div>

        {/* Time controls */}
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Time
            </span>
            <span style={{ fontFamily: "monospace", color: "#fff" }}>
              {(time * 100).toFixed(1)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.001"
            value={time}
            onChange={(e) => handleTimeChange(parseFloat(e.target.value))}
            style={{ width: "100%", marginBottom: 10, accentColor: "#fff" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={togglePlayPause}
              style={{
                flex: 1,
                padding: "8px 12px",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 6,
                backgroundColor: isPlaying ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
                color: "#fff",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button
              onClick={resetTime}
              style={{
                padding: "8px 12px",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 6,
                backgroundColor: "rgba(255,255,255,0.05)",
                color: "#fff",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Reset
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {massConfigs.map((m, i) => (
            <span key={i}>
              <span style={{ color: m.color }}>●</span> Mass {i + 1} (m={m.mass})
            </span>
          ))}
          <span>
            <span style={{ color: "#444" }}>●</span> Center of mass
          </span>
          <span>
            <span style={{ color: "#fff" }}>●</span> Orbiting particle
          </span>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: 16,
          color: "#555",
          fontFamily: "system-ui, sans-serif",
          fontSize: 12,
        }}
      >
        Drag to orbit · Scroll to zoom · Right-click to pan
      </div>
    </div>
  );
}
