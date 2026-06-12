import { useEffect, useMemo, useRef, useState } from "react";
import { Scene3D, View3D, vec3, vec2 } from "uzay";
import type { Camera3D } from "uzay";
import { useAtomState, useAtomValue } from "uzay/react";

// Test lab for camera3d, focused on the orthographic projection support:
// - in-place projection toggle on a live camera (framing should not jump)
// - switching between cameras with different projections
// - fov-derived orthographic frustum (fov slider scales the visible extent)
// - zoom write-back when OrbitControls scroll-zooms an orthographic camera
// - raycasting / dragging / overlays under both projections

const CAMERA_DEFS = [
  { key: "perspective", label: "Perspective" },
  { key: "orthoFree", label: "Ortho ¾" },
  { key: "top", label: "Top (ortho)" },
  { key: "front", label: "Front (ortho)" },
] as const;
type CamKey = (typeof CAMERA_DEFS)[number]["key"];

function buildScene() {
  const scene = new Scene3D();

  scene.create("grid3d", {
    plane: "xz",
    range1: [-6, 6],
    range2: [-6, 6],
    offset: -3,
    gap: 1,
    color: "#888",
    opacity: 0.25,
    pointerEvents: "none",
  });

  scene.create("axes3d", {
    x: [-5, 5],
    y: [-3, 3],
    z: [-5, 5],
    color: "#aaa",
    thickness: 0.8,
    pointerEvents: "none",
  });

  // Helix: reads as a circle from the top and a cosine wave from the front,
  // so the fixed orthographic views have something to prove.
  scene.create("parametricfunction3d", {
    f: (t: number) => vec3(2.5 * Math.cos(t), 0.28 * t, 2.5 * Math.sin(t)),
    tStart: -Math.PI * 3,
    tEnd: Math.PI * 3,
    samples: 400,
    color: "#4f9cf9",
    thickness: 1.5,
    pointerEvents: "none",
  });

  // Equal spheres receding in depth: identical in orthographic projection,
  // foreshortened in perspective.
  for (let z = -4; z <= 4; z += 2) {
    scene.create("sphere3d", {
      center: vec3(5, 0, z),
      radius: 0.6,
      color: "#ffb547",
      opacity: 0.9,
      pointerEvents: "none",
    });
  }

  // Draggable handle to test raycasting + dragging under both projections.
  const handle = scene.create("point3d", {
    coords: vec3(0, 0, 0),
    color: "#ff6b6b",
    radius: 4,
    draggable: "xyz",
  });

  scene.create("overlay3d", {
    position: handle.coords,
    content: scene.atom((get) => {
      const { x, y, z } = get(handle.coords);
      return `(${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`;
    }),
    anchor: "bottom-left",
    offset: vec2(10, -10),
    style: "color: white; font-size: 12px; text-shadow: 0 1px 2px black;",
  });

  const cameras: Record<CamKey, Camera3D> = {
    perspective: scene.create("camera3d", {
      position: vec3(9, 6, 12),
      lookAt: vec3(0, 0, 0),
      fov: 50,
    }),
    orthoFree: scene.create("camera3d", {
      position: vec3(-9, 6, 12),
      lookAt: vec3(0, 0, 0),
      projection: "orthographic",
      fov: 50,
    }),
    // Slight z offset so the straight-down view doesn't fight the camera's up vector
    top: scene.create("camera3d", {
      position: vec3(0, 16, 0.02),
      lookAt: vec3(0, 0, 0),
      projection: "orthographic",
      fov: 40,
      enableOrbit: false,
    }),
    front: scene.create("camera3d", {
      position: vec3(0, 0.5, 16),
      lookAt: vec3(0, 0.5, 0),
      projection: "orthographic",
      fov: 40,
      enableOrbit: false,
    }),
  };

  return { scene, cameras };
}

const CHECKLIST = [
  "Switch cameras: each keeps its own state (orbit Perspective, leave, come back)",
  "Toggle projection in place: framing must not jump, only foreshortening changes",
  "FOV slider: lens zoom in perspective, visible extent in orthographic",
  "Scroll-zoom in an ortho view: zoom readout changes and survives camera switches",
  "Drag the red point in every camera, incl. the locked Top/Front views",
  "Spheres: equal size in ortho views, receding in perspective",
];

export default function Demo1() {
  const { scene, cameras } = useMemo(buildScene, []);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View3D | null>(null);
  const [activeKey, setActiveKey] = useState<CamKey>("perspective");

  useEffect(() => {
    if (!containerRef.current) return;
    const view = new View3D(scene, cameras.perspective.id, containerRef.current);
    viewRef.current = view;
    return () => {
      view.dispose();
      viewRef.current = null;
    };
  }, [scene, cameras]);

  useEffect(() => {
    viewRef.current?.changeActiveCam(cameras[activeKey].id);
  }, [cameras, activeKey]);

  const activeCam = cameras[activeKey];
  const [fov, setFov] = useAtomState(activeCam.fov);
  const projection = useAtomValue(activeCam.projection);
  const zoom = useAtomValue(activeCam.zoom);
  const position = useAtomValue(activeCam.position);

  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: "#0a0a0a" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          padding: 14,
          width: 320,
          backgroundColor: "rgba(20, 20, 20, 0.88)",
          border: "1px solid #2a2a2a",
          borderRadius: 8,
          color: "#ddd",
          fontFamily: "system-ui, sans-serif",
          fontSize: 13,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {CAMERA_DEFS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveKey(key)}
              style={{
                padding: "5px 10px",
                border: "none",
                borderRadius: 4,
                backgroundColor: activeKey === key ? "#4f9cf9" : "#262626",
                color: activeKey === key ? "#fff" : "#999",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() =>
              activeCam.projection.set(
                projection === "perspective" ? "orthographic" : "perspective",
              )
            }
            style={{
              padding: "5px 10px",
              border: "1px solid #3a3a3a",
              borderRadius: 4,
              backgroundColor: "#1c1c1c",
              color: "#ffb547",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            projection: {projection} (toggle)
          </button>
          <button
            onClick={() => activeCam.zoom.set(1)}
            style={{
              padding: "5px 10px",
              border: "1px solid #3a3a3a",
              borderRadius: 4,
              backgroundColor: "#1c1c1c",
              color: "#999",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            reset zoom
          </button>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 60, color: "#999" }}>fov {fov.toFixed(0)}°</span>
          <input
            type="range"
            min={10}
            max={90}
            step={1}
            value={fov}
            onChange={(event) => setFov(parseFloat(event.target.value))}
            style={{ flex: 1 }}
          />
        </label>

        <div style={{ color: "#888", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
          zoom = {zoom.toFixed(2)} · pos = ({position.x.toFixed(1)},{" "}
          {position.y.toFixed(1)}, {position.z.toFixed(1)})
        </div>

        <ul style={{ margin: 0, paddingLeft: 18, color: "#777", fontSize: 11, lineHeight: 1.5 }}>
          {CHECKLIST.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
