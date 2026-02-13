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

// Create scene and atoms outside the component so they're stable singletons.
// This is the natural pattern: the scene is your "world", components just declare what's in it.
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
  // Plain-value props for plane controls
  const [planeWidth, setPlaneWidth] = useState(6);
  const [planeHeight, setPlaneHeight] = useState(6);
  const [opacity, setOpacity] = useState(0.5);
  const [showEdges, setShowEdges] = useState(true);

  // Ref test
  const pointRef = useRef<Point3DClass<any> | null>(null);

  const sliderStyle = { color: "white", fontSize: 13 } as const;
  const rowStyle = { display: "flex", alignItems: "center", gap: 8 } as const;

  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: "#141414", position: "relative" }}>
      <Scene3DView scene={scene} style={{ width: "100%", height: "100%" }}>
        {/* Camera (auto-registers as active since it's the only one) */}
        {/*<Camera3D position={cameraPosAtom} lookAt={vec3(0, 0, 0)} fov={60} />*/}
        <Camera3D lookAt={vec3(0, 0, 0)} fov={30} />

        {/* Draggable center point */}
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

        {/* Normal vector */}
        <Vector3D origin={centerAtom} vector={normalVecAtom} color="gold" thickness={1} />
        <Overlay3D
          position={normalTipAtom}
          format="latex"
          content={normalLabelAtom}
          anchor="bottom"
          offset={{ x: 0, y: -8 }}
          style="color: gold; font-size: 12px; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 3px;"
        />

        {/* Main plane (plain-value props for width/height/opacity) */}
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

        {/* Second plane */}
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

        {/* Axes and grid */}
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
          background: "rgba(0,0,0,0.5)",
          padding: "10px 14px",
          borderRadius: 6,
        }}
      >
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
        <button
          style={{ ...sliderStyle, padding: "4px 10px", borderRadius: 4, cursor: "pointer" }}
          onClick={() => {
            const pt = pointRef.current;
            if (pt) {
              console.log("Point3D ref works! Item id:", pt.id, "coords:", pt.coords.get());
            }
          }}
        >
          Log Point Ref
        </button>
      </div>
    </div>
  );
}
