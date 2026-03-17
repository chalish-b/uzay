import { useState } from "react";
import { Scene3D, vec3 } from "uzay";
import {
  Scene3DView,
  Camera3D,
  Point3D,
  Line3D,
  Axes3D,
  Grid3D,
  Sphere3D,
  Vector3D,
  Overlay3D,
} from "uzay/react";

const scene = new Scene3D();

export default function Demo1() {
  const [showPoint, setShowPoint] = useState(true);
  const [showLine, setShowLine] = useState(true);
  const [showSphere, setShowSphere] = useState(true);
  const [showVector, setShowVector] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showLabel, setShowLabel] = useState(true);

  const sliderStyle = { color: "white", fontSize: 13 } as const;
  const rowStyle = { display: "flex", alignItems: "center", gap: 8 } as const;

  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: "#141414", position: "relative" }}>
      <Scene3DView scene={scene} style={{ width: "100%", height: "100%" }}>
        <Camera3D position={vec3(10, 8, 10)} lookAt={vec3(0, 0, 0)} />

        <Point3D coords={vec3(2, 1, 0)} color="cyan" radius={3} visible={showPoint} draggable="xyz" />
        <Line3D start={vec3(-3, 0, 0)} end={vec3(3, 3, 2)} color="lime" thickness={1.5} visible={showLine} />
        <Sphere3D center={vec3(-2, 2, -1)} radius={1} color="hotpink" opacity={0.6} visible={showSphere} />
        <Vector3D origin={vec3(0, 0, 0)} vector={vec3(0, 4, 0)} color="gold" thickness={1} visible={showVector} />
        <Overlay3D
          position={vec3(2, 2.5, 0)}
          content="Point"
          anchor="bottom"
          visible={showLabel}
          style="color: cyan; font-size: 12px;"
        />

        <Axes3D x={[-6, 6]} y={[-6, 6]} z={[-6, 6]} thickness={0.7} visible={showAxes} />
        <Grid3D plane="xz" range1={[-6, 6]} range2={[-6, 6]} color="#444" thickness={2} visible={showGrid} />
      </Scene3DView>

      {/* Visibility toggles */}
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
          minWidth: 180,
        }}
      >
        <span style={{ ...sliderStyle, fontWeight: "bold" }}>Visibility</span>
        {[
          ["Point", showPoint, setShowPoint],
          ["Line", showLine, setShowLine],
          ["Sphere", showSphere, setShowSphere],
          ["Vector", showVector, setShowVector],
          ["Axes", showAxes, setShowAxes],
          ["Grid", showGrid, setShowGrid],
          ["Label", showLabel, setShowLabel],
        ].map(([label, value, setter]) => (
          <div key={label as string} style={rowStyle}>
            <label style={sliderStyle}>
              <input
                type="checkbox"
                checked={value as boolean}
                onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)}
              />{" "}
              {label as string}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
