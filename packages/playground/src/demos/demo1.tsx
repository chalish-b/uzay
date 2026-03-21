import { useMemo } from "react";
import { Scene3D, vec3, Vec3, tangentLine } from "uzay";
import { Scene3DView, useAtomValue, useAtomState } from "uzay/react";

function createScene() {
  const scene = new Scene3D();

  scene.create("camera3d", {
    position: vec3(8, 6, 8),
    lookAt: vec3(0, 0, 0),
  });

  scene.create("axes3d", { x: [-5, 5], y: [-5, 5], z: [-5, 5], thickness: 0.7 });
  scene.create("grid3d", { plane: "xz", range1: [-5, 5], range2: [-5, 5], color: "white", opacity: 0.1, thickness: 2.5 });

  // Reactive parameters
  const atomAmplitude = scene.atom(3);
  const atomFrequency = scene.atom(1);

  // Reactive helix curve: amplitude and frequency are atoms
  const atomCurveFunc = scene.atom((get) => {
    const amp = get(atomAmplitude);
    const freq = get(atomFrequency);
    return (t: number) => vec3(
      amp * Math.cos(freq * t),
      t * 0.3,
      amp * Math.sin(freq * t),
    );
  });

  scene.create("parametricfunction3d", {
    f: atomCurveFunc,
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
  const atomT = scene.atom((get) => get(controlPoint.coords).x);

  const tangent = tangentLine(scene, {
    f: atomCurveFunc,
    t: atomT,
    length: 10,
    color: "#ffcc00",
  });

  const atomTangentLength = scene.atom((get) => Vec3.length(get(tangent.tangent)));

  scene.create("overlay3d", {
    position: tangent.point.coords,
    content: scene.atom((get) => `t = ${get(atomT).toFixed(2)}`),
    anchor: "bottom",
  });

  return { scene, atomT, atomTangentLength, atomAmplitude, atomFrequency };
}

export default function Demo1() {
  const { scene, atomT, atomTangentLength, atomAmplitude, atomFrequency } = useMemo(() => createScene(), []);

  const t = useAtomValue(atomT);
  const tangentLength = useAtomValue(atomTangentLength);
  const [amplitude, setAmplitude] = useAtomState(atomAmplitude);
  const [frequency, setFrequency] = useAtomState(atomFrequency);

  const labelStyle = { color: "white", fontSize: 13 } as const;
  const sliderLabelStyle = { ...labelStyle, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 } as const;

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
          Reactive Tangent Line
        </span>
        <span style={{ ...labelStyle, fontFamily: "monospace" }}>
          t = {t.toFixed(2)} (drag the red point)
        </span>
        <span style={{ ...labelStyle, fontFamily: "monospace" }}>
          |tangent| = {tangentLength.toFixed(3)}
        </span>

        <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.2)", margin: "4px 0" }} />

        <div style={sliderLabelStyle}>
          <span>Amplitude</span>
          <span style={{ fontFamily: "monospace" }}>{amplitude.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={5}
          step={0.1}
          value={amplitude}
          onChange={(e) => setAmplitude(Number(e.target.value))}
          style={{ width: "100%" }}
        />

        <div style={sliderLabelStyle}>
          <span>Frequency</span>
          <span style={{ fontFamily: "monospace" }}>{frequency.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={0.2}
          max={3}
          step={0.1}
          value={frequency}
          onChange={(e) => setFrequency(Number(e.target.value))}
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
}
