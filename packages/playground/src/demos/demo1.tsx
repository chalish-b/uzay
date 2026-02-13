import { useRef, useState } from "react";
import { Scene3D, vec3, Vec3 } from "uzay";
import type { Point3D as Point3DClass } from "uzay";
import {
  Scene3DView,
  Camera3D,
  Point3D,
  Axes3D,
  Grid3D,
  Plane3D,
  Vector3D,
  Overlay3D,
} from "uzay/react";

const scene = new Scene3D();

const centerAtom = scene.atom(vec3(0, 2, 0));
const normalDirAtom = scene.atom(Vec3.normalized(vec3(0, 1, 0)));
const normalLengthAtom = scene.atom(4);
const normalVecAtom = scene.atom(
  (get) => Vec3.scaled(get(normalDirAtom), get(normalLengthAtom)),
  (_get, set, next: Vec3) => {
    const len = Math.sqrt(Vec3.dot(next, next));
    if (len < 0.001) return;
    set(normalDirAtom, Vec3.normalized(next));
    set(normalLengthAtom, len);
  }
);
const normalTipAtom = scene.atom((get) => Vec3.add(get(centerAtom), get(normalVecAtom)));
const centerLabelAtom = scene.atom((get) => {
  const c = get(centerAtom);
  return String.raw`\text{center} = (${c.x.toFixed(1)},\; ${c.y.toFixed(1)},\; ${c.z.toFixed(1)})`;
});
const normalLabelAtom = scene.atom((get) => {
  const n = get(normalDirAtom);
  return String.raw`\hat{n} = (${n.x.toFixed(2)},\; ${n.y.toFixed(2)},\; ${n.z.toFixed(2)})`;
});

const cameraPosAtom = scene.atom(vec3(12, 10, 12));

export default function Demo1() {
  const [planeWidth, setPlaneWidth] = useState(6);
  const [planeHeight, setPlaneHeight] = useState(6);
  const [opacity, setOpacity] = useState(0.5);
  const [showEdges, setShowEdges] = useState(true);
  const pointRef = useRef<Point3DClass<any> | null>(null);

  // --- Camera edge case state ---
  // Which camera is active: 1, 2, or 3
  const [activeCam, setActiveCam] = useState<1 | 2 | 3>(1);
  // Whether each camera is mounted (in the tree at all)
  const [cam1Mounted, setCam1Mounted] = useState(true);
  const [cam2Mounted, setCam2Mounted] = useState(true);
  const [cam3Mounted, setCam3Mounted] = useState(false);

  const sliderStyle = { color: "white", fontSize: 13 } as const;
  const rowStyle = { display: "flex", alignItems: "center", gap: 8 } as const;
  const btnStyle = { ...sliderStyle, padding: "4px 10px", borderRadius: 4, cursor: "pointer" } as const;

  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: "#141414", position: "relative" }}>
      <Scene3DView scene={scene} style={{ width: "100%", height: "100%" }}>
        {/* --- Cameras --- */}
        {/* Cam 1: default front-right, atom-driven position */}
        {cam1Mounted && (
          <Camera3D
            position={cameraPosAtom}
            lookAt={vec3(0, 0, 0)}
            fov={60}
            active={activeCam === 1}
          />
        )}
        {/* Cam 2: top-down view, plain values */}
        {cam2Mounted && (
          <Camera3D
            position={vec3(0, 20, 0.01)}
            lookAt={vec3(0, 0, 0)}
            fov={50}
            enableOrbit={false}
            active={activeCam === 2}
          />
        )}
        {/* Cam 3: dynamically added side view */}
        {cam3Mounted && (
          <Camera3D
            position={vec3(-15, 5, 0)}
            lookAt={vec3(0, 2, 0)}
            fov={40}
            active={activeCam === 3}
          />
        )}

        {/* --- Scene items --- */}
        <Point3D
          ref={pointRef}
          coords={centerAtom}
          color="cyan"
          radius={3}
          draggable="x"
        />
        <Overlay3D
          position={centerAtom}
          format="latex"
          content={centerLabelAtom}
          anchor="bottom"
          offset={{ x: 0, y: -8 }}
          style="color: cyan; font-size: 12px; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 3px;"
        />

        <Vector3D origin={centerAtom} vector={normalVecAtom} color="gold" thickness={1} />
        <Overlay3D
          position={normalTipAtom}
          format="latex"
          content={normalLabelAtom}
          anchor="bottom"
          offset={{ x: 0, y: -8 }}
          style="color: gold; font-size: 12px; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 3px;"
        />

        <Plane3D
          point={centerAtom}
          normal={normalDirAtom}
          width={planeWidth}
          height={planeHeight}
          color="dodgerblue"
          opacity={opacity}
          showEdges={showEdges}
          pointerEvents="none"
        />
        <Plane3D
          point={vec3(3, 0, 3)}
          normal={vec3(1, 0, 0)}
          width={4}
          height={4}
          color="hotpink"
          opacity={0.4}
          showEdges={true}
          pointerEvents="none"
        />

        <Axes3D x={[-8, 8]} y={[-8, 8]} z={[-8, 8]} thickness={0.7} />
        <Grid3D plane="xz" range1={[-8, 8]} range2={[-8, 8]} color="#444" thickness={2} />
      </Scene3DView>

      {/* Controls overlay */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          background: "rgba(0,0,0,0.65)",
          padding: "10px 14px",
          borderRadius: 6,
          minWidth: 260,
        }}
      >
        {/* --- Camera controls --- */}
        <span style={{ ...sliderStyle, fontWeight: "bold" }}>Camera Controls</span>

        {/* Switch active */}
        <div style={rowStyle}>
          <span style={sliderStyle}>Active:</span>
          {([1, 2, 3] as const).map((n) => (
            <button
              key={n}
              style={{
                ...btnStyle,
                background: activeCam === n ? "rgba(100,180,255,0.4)" : "rgba(255,255,255,0.1)",
                border: activeCam === n ? "1px solid rgba(100,180,255,0.8)" : "1px solid rgba(255,255,255,0.2)",
              }}
              onClick={() => setActiveCam(n)}
            >
              Cam {n}
            </button>
          ))}
        </div>

        {/* Mount/unmount toggles */}
        <div style={rowStyle}>
          <span style={sliderStyle}>Mounted:</span>
          <label style={sliderStyle}>
            <input type="checkbox" checked={cam1Mounted} onChange={(e) => setCam1Mounted(e.target.checked)} /> 1
          </label>
          <label style={sliderStyle}>
            <input type="checkbox" checked={cam2Mounted} onChange={(e) => setCam2Mounted(e.target.checked)} /> 2
          </label>
          <label style={sliderStyle}>
            <input type="checkbox" checked={cam3Mounted} onChange={(e) => setCam3Mounted(e.target.checked)} /> 3
          </label>
        </div>

        {/* Quick test scenarios */}
        <button style={btnStyle} onClick={() => {
          // Unmount the currently active camera to test fallback behavior
          if (activeCam === 1) setCam1Mounted(false);
          else if (activeCam === 2) setCam2Mounted(false);
          else setCam3Mounted(false);
        }}>
          Remove active camera
        </button>

        <button style={btnStyle} onClick={() => {
          // Unmount all cameras to test fallback camera creation
          setCam1Mounted(false);
          setCam2Mounted(false);
          setCam3Mounted(false);
        }}>
          Remove ALL cameras
        </button>

        <button style={btnStyle} onClick={() => {
          // Re-mount all and activate cam 1
          setCam1Mounted(true);
          setCam2Mounted(true);
          setCam3Mounted(false);
          setActiveCam(1);
        }}>
          Reset cameras
        </button>

        <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.2)", margin: "4px 0" }} />

        {/* --- Plane controls --- */}
        <span style={{ ...sliderStyle, fontWeight: "bold" }}>Plane Controls</span>
        <div style={rowStyle}>
          <label style={{ ...sliderStyle, minWidth: 50 }}>Width</label>
          <input type="range" min="0.5" max="12" step="0.1" value={planeWidth}
            onChange={(e) => setPlaneWidth(parseFloat(e.target.value))} />
          <span style={{ ...sliderStyle, minWidth: 32 }}>{planeWidth.toFixed(1)}</span>
        </div>
        <div style={rowStyle}>
          <label style={{ ...sliderStyle, minWidth: 50 }}>Height</label>
          <input type="range" min="0.5" max="12" step="0.1" value={planeHeight}
            onChange={(e) => setPlaneHeight(parseFloat(e.target.value))} />
          <span style={{ ...sliderStyle, minWidth: 32 }}>{planeHeight.toFixed(1)}</span>
        </div>
        <div style={rowStyle}>
          <label style={{ ...sliderStyle, minWidth: 50 }}>Opacity</label>
          <input type="range" min="0" max="1" step="0.01" value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))} />
          <span style={{ ...sliderStyle, minWidth: 32 }}>{opacity.toFixed(2)}</span>
        </div>
        <div style={rowStyle}>
          <label style={sliderStyle}>Edges</label>
          <input type="checkbox" checked={showEdges}
            onChange={(e) => setShowEdges(e.target.checked)} />
        </div>

        <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.2)", margin: "4px 0" }} />
        <button style={btnStyle} onClick={() => {
          const pt = pointRef.current;
          if (pt) console.log("Point3D ref:", pt.id, "coords:", pt.coords.get());
          else console.log("Point3D ref is null");
        }}>
          Log Point Ref
        </button>
      </div>
    </div>
  );
}
