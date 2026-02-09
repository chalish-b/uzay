import { useEffect, useRef, useState } from "react";
import { Scene3D, View3D, vec3, Point3D } from "uzay";
import type { BoundAtom } from "uzay";
import type { PrimitiveAtom } from "jotai";

/** DEMO MADE BY GPT 5.1 */

type OrreryAtoms = {
  time: BoundAtom<PrimitiveAtom<number>>;
  speed: BoundAtom<PrimitiveAtom<number>>;
  tilt: BoundAtom<PrimitiveAtom<number>>;
  wobble: BoundAtom<PrimitiveAtom<number>>;
};

type OrbitConfig = {
  radius: number;
  speed: number;
  color: string;
  orbitColor: string;
  phase: number;
  sway: number;
};

const orbitConfigs: OrbitConfig[] = [
  {
    radius: 6,
    speed: 1.2,
    color: "#9be7ff",
    orbitColor: "rgba(155, 231, 255, 0.6)",
    phase: 0,
    sway: 0.3,
  },
  {
    radius: 9,
    speed: 0.9,
    color: "#c6b4ff",
    orbitColor: "rgba(198, 180, 255, 0.6)",
    phase: Math.PI * 0.35,
    sway: 0.45,
  },
  {
    radius: 12,
    speed: 0.65,
    color: "#ffd08a",
    orbitColor: "rgba(255, 208, 138, 0.65)",
    phase: Math.PI * 0.7,
    sway: 0.55,
  },
  {
    radius: 15,
    speed: 0.52,
    color: "#ff9fb8",
    orbitColor: "rgba(255, 159, 184, 0.7)",
    phase: Math.PI * 1.05,
    sway: 0.7,
  },
];

export default function Demo3() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View3D | null>(null);
  const animationRef = useRef<number | null>(null);
  const atomsRef = useRef<OrreryAtoms | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1.2);
  const [tilt, setTilt] = useState(0.6);
  const [wobble, setWobble] = useState(0.55);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new Scene3D();
    const timeAtom = scene.atom(0);
    const speedAtom = scene.atom(1.2);
    const tiltAtom = scene.atom(0.6);
    const wobbleAtom = scene.atom(0.55);
    atomsRef.current = {
      time: timeAtom,
      speed: speedAtom,
      tilt: tiltAtom,
      wobble: wobbleAtom,
    };

    scene.create("axes3d", {
      x: [-18, 18],
      y: [-12, 12],
      z: [-18, 18],
      color: "#2a2a2a",
      thickness: 0.8,
    });
    scene.create("grid3d", {
      plane: "xz",
      range1: [-18, 18],
      range2: [-18, 18],
      offset: -2,
      gap: 2,
      color: "#1c1c1c",
      thickness: 1.4,
    });
    scene.create("grid3d", {
      plane: "xy",
      range1: [-12, 12],
      range2: [-12, 12],
      offset: 0,
      gap: 3,
      color: "#171717",
      thickness: 1,
    });

    scene.create("point3d", {
      coords: vec3(0, 0, 0),
      color: "#ffd166",
      radius: 5,
      draggable: "xyz",
    });

    const planetPoints: Array<Point3D<any>> = [];

    orbitConfigs.forEach((orbit, index) => {
      scene.create("parametricfunction3d", {
        f: scene.atom((get) => {
          const tiltValue = get(tiltAtom);
          const wobbleValue = get(wobbleAtom);
          return (t: number) => {
            const theta = t * Math.PI * 2;
            const verticalWave =
              Math.sin(theta * (1.4 + orbit.sway)) * tiltValue * 1.3 +
              Math.cos(theta * 0.5) * wobbleValue * (0.8 + index * 0.1);
            return vec3(
              Math.cos(theta) * orbit.radius,
              verticalWave,
              Math.sin(theta) * orbit.radius
            );
          };
        }),
        tStart: 0,
        tEnd: 1,
        color: orbit.orbitColor,
        thickness: 1.1,
        samples: scene.atom((get) => 120 + Math.round(get(wobbleAtom) * 80)),
      });

      const planetPoint = scene.create("point3d", {
        coords: scene.atom((get) => {
          const time = get(timeAtom);
          const globalSpeed = get(speedAtom);
          const tiltValue = get(tiltAtom);
          const wobbleValue = get(wobbleAtom);
          const theta = time * orbit.speed * globalSpeed + orbit.phase;
          const vertical =
            Math.sin(theta * (1.2 + orbit.sway)) * tiltValue * 1.4 +
            Math.cos(theta * 0.75) * wobbleValue * (0.8 + index * 0.08);
          return vec3(
            Math.cos(theta) * orbit.radius,
            vertical,
            Math.sin(theta) * orbit.radius
          );
        }),
        color: orbit.color,
        radius: 2.2 + index * 0.35,
      });
      planetPoints.push(planetPoint);

      scene.create("line3d", {
        start: planetPoint.coords,
        end: scene.atom((get) => {
          const position = get(planetPoint.coords);
          return vec3(position.x, -2, position.z);
        }),
        color: "rgba(255, 255, 255, 0.25)",
        thickness: 0.6,
      });
    });

    for (let i = 0; i < planetPoints.length; i++) {
      const next = planetPoints[(i + 1) % planetPoints.length];
      scene.create("line3d", {
        start: planetPoints[i].coords,
        end: next.coords,
        color: "rgba(255, 255, 255, 0.16)",
        thickness: 0.7,
      });
    }

    const camera = scene.create("camera3d", {
      position: vec3(28, 16, 28),
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

  useEffect(() => {
    if (!atomsRef.current) return;

    if (isPlaying) {
      let lastTime = performance.now();
      const tick = (now: number) => {
        if (!atomsRef.current) return;
        const dt = (now - lastTime) / 1000;
        lastTime = now;
        const currentSpeed = atomsRef.current.speed.get();
        const elapsed = atomsRef.current.time.get() + dt * currentSpeed * 2.2;
        atomsRef.current.time.set(elapsed);
        animationRef.current = requestAnimationFrame(tick);
      };
      animationRef.current = requestAnimationFrame(tick);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    atomsRef.current?.speed.set(speed);
  }, [speed]);

  useEffect(() => {
    atomsRef.current?.tilt.set(tilt);
  }, [tilt]);

  useEffect(() => {
    atomsRef.current?.wobble.set(wobble);
  }, [wobble]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#0d0f11",
        position: "relative",
        fontFamily: "system-ui, sans-serif",
        color: "#ddd",
      }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }}></div>

      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          padding: "14px 16px",
          borderRadius: 10,
          backgroundColor: "rgba(20, 22, 26, 0.92)",
          border: "1px solid #2c2f34",
          width: 260,
          boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
          Harmonic Orrery
        </div>
        <div
          style={{
            fontSize: 12,
            lineHeight: 1.5,
            color: "#9aa0a6",
            marginBottom: 16,
          }}
        >
          Four resonant orbits weave through space. Adjust tilt, wobble, and
          tempo to sculpt the choreography.
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: "#8c92a0", marginBottom: 4 }}>
            Tempo: {speed.toFixed(1)}x
          </label>
          <input
            type="range"
            min="0.4"
            max="2.4"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: "#8bb8ff" }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: "#8c92a0", marginBottom: 4 }}>
            Tilt: {tilt.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1.2"
            step="0.05"
            value={tilt}
            onChange={(e) => setTilt(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: "#ffc266" }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: "#8c92a0", marginBottom: 4 }}>
            Wobble: {wobble.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1.2"
            step="0.05"
            value={wobble}
            onChange={(e) => setWobble(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: "#f59ac9" }}
          />
        </div>

        <button
          onClick={() => setIsPlaying((prev) => !prev)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #343841",
            backgroundColor: isPlaying ? "#2f3540" : "#3a404c",
            color: "#f2f4f7",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "background-color 0.15s ease",
          }}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 18,
          right: 18,
          padding: "12px 14px",
          borderRadius: 8,
          backgroundColor: "rgba(15, 17, 19, 0.9)",
          border: "1px solid #252830",
          fontSize: 11,
          color: "#9aa0a6",
          lineHeight: 1.5,
        }}
      >
        <div style={{ color: "#d7d9de", marginBottom: 6, fontWeight: 600 }}>
          Scene Ingredients
        </div>
        <div>- Orbit & zoom camera</div>
        <div>- Grid + axes scaffolding</div>
        <div>- Parametric orbit ribbons</div>
        <div>- Animated points and link lines</div>
        <div>- Reactive controls via atoms</div>
      </div>
    </div>
  );
}
