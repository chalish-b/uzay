import { useMemo } from "react";
import { Scene3D, vec3, Vec3, curvePoint } from "uzay";
import { Scene3DView, useAtomValue } from "uzay/react";

function createScene() {
  const scene = new Scene3D();

  scene.create("camera3d", {
    position: vec3(8, 6, 8),
    lookAt: vec3(0, 0, 0),
  });

  scene.create("axes3d", { x: [-5, 5], y: [-5, 5], z: [-5, 5], thickness: 0.7 });
  scene.create("grid3d", { plane: "xz", range1: [-5, 5], range2: [-5, 5], color: "white", opacity: 0.1, thickness: 2.5 });

  // A trefoil knot: a curve with lots of curvature changes and self-crossings
  const trefoilFunc = (t: number) => vec3(
    Math.sin(t) + 2 * Math.sin(2 * t),
    Math.cos(t) - 2 * Math.cos(2 * t),
    -Math.sin(3 * t),
  );

  scene.create("parametricfunction3d", {
    f: trefoilFunc,
    tStart: 0,
    tEnd: 2 * Math.PI,
    samples: 300,
    color: "#4488ff",
    thickness: 1.5,
  });

  const cp = curvePoint(scene, {
    f: trefoilFunc,
    tStart: 0,
    tEnd: 2 * Math.PI,
    initialT: 0,
    color: "#ff6644",
  });
  cp.point.radius.set(4);

  scene.create("overlay3d", {
    position: cp.point.coords,
    content: scene.atom((get) => `t = ${get(cp.t).toFixed(2)}`),
    anchor: "bottom",
  });

  return { scene, atomT: cp.t };
}

export default function Demo1() {
  const { scene, atomT } = useMemo(() => createScene(), []);

  const t = useAtomValue(atomT);

  const labelStyle = { color: "white", fontSize: 13 } as const;

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
          minWidth: 240,
        }}
      >
        <span style={{ ...labelStyle, fontWeight: "bold", fontSize: 15 }}>
          Curve Point
        </span>
        <span style={{ ...labelStyle, fontFamily: "monospace" }}>
          t = {t.toFixed(2)} (drag the point along the curve)
        </span>
      </div>
    </div>
  );
}
