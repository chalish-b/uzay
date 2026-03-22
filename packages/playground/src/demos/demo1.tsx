import { useMemo, useState } from "react";
import { Scene3D, vec3 } from "uzay";
import { Scene3DView, useAtomState } from "uzay/react";

function createScene() {
  const scene = new Scene3D();

  scene.create("camera3d", {
    position: vec3(8, 6, 8),
    lookAt: vec3(0, 0, 0),
  });

  const axes = scene.create("axes3d", {
    x: [-5, 5],
    y: [-5, 5],
    z: [-5, 5],
    thickness: 0.5,
    tickmarks: true,
    arrows: true,
  });

  scene.create("grid3d", {
    plane: "xz",
    range1: [-5, 5],
    range2: [-5, 5],
    color: "white",
    opacity: 0.1,
    thickness: 2.5,
  });

  return { scene, axes };
}

export default function Demo1() {
  const { scene, axes } = useMemo(() => createScene(), []);

  const [tickmarks, setTickmarks] = useAtomState(axes.tickmarks);
  const [arrows, setArrows] = useAtomState(axes.arrows);
  const [xAxis, setXAxis] = useAtomState(axes.x);
  const [yAxis, setYAxis] = useAtomState(axes.y);
  const [zAxis, setZAxis] = useAtomState(axes.z);

  const labelStyle = { color: "white", fontSize: 13 } as const;
  const checkboxStyle = { marginRight: 6 } as const;

  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: "#141414", position: "relative" }}>
      <Scene3DView scene={scene} style={{ width: "100%", height: "100%" }} />

      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          background: "rgba(0,0,0,0.7)",
          padding: "12px 16px",
          borderRadius: 8,
          minWidth: 200,
        }}
      >
        <span style={{ ...labelStyle, fontWeight: "bold", fontSize: 15 }}>
          Axes Controls
        </span>

        <label style={labelStyle}>
          <input
            type="checkbox"
            checked={tickmarks}
            onChange={(e) => setTickmarks(e.target.checked)}
            style={checkboxStyle}
          />
          Tick marks
        </label>

        <label style={labelStyle}>
          <input
            type="checkbox"
            checked={arrows}
            onChange={(e) => setArrows(e.target.checked)}
            style={checkboxStyle}
          />
          Arrows
        </label>

        <label style={labelStyle}>
          <input
            type="checkbox"
            checked={xAxis !== false}
            onChange={(e) => setXAxis(e.target.checked ? [-5, 5] : false)}
            style={checkboxStyle}
          />
          X axis
        </label>

        <label style={labelStyle}>
          <input
            type="checkbox"
            checked={yAxis !== false}
            onChange={(e) => setYAxis(e.target.checked ? [-5, 5] : false)}
            style={checkboxStyle}
          />
          Y axis
        </label>

        <label style={labelStyle}>
          <input
            type="checkbox"
            checked={zAxis !== false}
            onChange={(e) => setZAxis(e.target.checked ? [-5, 5] : false)}
            style={checkboxStyle}
          />
          Z axis
        </label>
      </div>
    </div>
  );
}
