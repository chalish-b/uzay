import { useMemo } from "react";
import { Scene3D, vec3, Vec3, tangentLine } from "uzay";
import { Scene3DView, useAtomValue } from "uzay/react";

function createScene() {
  const scene = new Scene3D();

  scene.create("camera3d", {
    position: vec3(8, 6, 8),
    lookAt: vec3(0, 0, 0),
  });

  scene.create("axes3d", { x: [-5, 5], y: [-5, 5], z: [-5, 5], thickness: 0.7 });
  scene.create("grid3d", { plane: "xz", range1: [-5, 5], range2: [-5, 5], color: "#333" });

  // A helix curve
  const curveFunc = (t: number) => vec3(
    3 * Math.cos(t),
    t * 0.3,
    3 * Math.sin(t),
  );

  scene.create("parametricfunction3d", {
    f: curveFunc,
    tStart: -10,
    tEnd: 10,
    samples: 200,
    color: "#4488ff",
    thickness: 1.5,
  });

  // Draggable control point: its x coordinate drives t
  const controlPoint = scene.create("point3d", {
    coords: vec3(1, 0, 0),
    color: "#ff6644",
    draggable: "x",
    radius: 4,
  });

  // t is derived from the control point's x coordinate
  const tAtom = scene.atom((get) => get(controlPoint.coords).x);

  const tangent = tangentLine(scene, {
    f: curveFunc,
    t: tAtom,
    length: 10,
    color: "#ffcc00",
  });

  const tangentLengthAtom = scene.atom((get) => Vec3.length(get(tangent.tangent)));

  scene.create("overlay3d", {
    position: tangent.point.coords,
    content: scene.atom((get) => `t = ${get(tAtom).toFixed(2)}`),
    anchor: "bottom",
  });

  return { scene, tAtom, tangentLengthAtom };
}

export default function Demo1() {
  const { scene, tAtom, tangentLengthAtom } = useMemo(() => createScene(), []);

  const t = useAtomValue(tAtom);
  const tangentLength = useAtomValue(tangentLengthAtom);

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
          minWidth: 220,
        }}
      >
        <span style={{ ...labelStyle, fontWeight: "bold", fontSize: 15 }}>
          Tangent Line (derived t)
        </span>
        <span style={{ ...labelStyle, fontFamily: "monospace" }}>
          t = {t.toFixed(2)} (drag the red point)
        </span>
        <span style={{ ...labelStyle, fontFamily: "monospace" }}>
          |tangent| = {tangentLength.toFixed(3)}
        </span>
      </div>
    </div>
  );
}
