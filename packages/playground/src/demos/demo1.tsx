import { useMemo } from "react";
import { Scene3D, vec3 } from "uzay";
import { Scene3DView, useAtomState, useAtomValue } from "uzay/react";

type SurfaceFunc = (x: number, z: number) => number;
type SurfacePresetName =
  | "Ripple"
  | "Saddle"
  | "Waves"
  | "Gaussian"
  | "Checker"
  | "Flat plane";
type SurfaceParams = {
  amplitude: number;
  frequency: number;
  offset: number;
  skew: number;
};

const defaultParams: SurfaceParams = {
  amplitude: 1.4,
  frequency: 1,
  offset: 0,
  skew: 0.35,
};
const presetNames: SurfacePresetName[] = [
  "Ripple",
  "Saddle",
  "Waves",
  "Gaussian",
  "Checker",
  "Flat plane",
];
const samplePoints = [
  { label: "f(0, 0)", x: 0, z: 0 },
  { label: "f(1.5, -0.75)", x: 1.5, z: -0.75 },
  { label: "f(-2, 1.25)", x: -2, z: 1.25 },
];

function buildSurfaceFunction(
  preset: SurfacePresetName,
  params: SurfaceParams
): SurfaceFunc {
  const { amplitude, frequency, offset, skew } = params;

  if (preset === "Ripple") {
    return (x, z) => {
      const radius = Math.sqrt(x * x + z * z);
      return amplitude * Math.sin(frequency * radius) + offset + skew * 0.2 * x;
    };
  }

  if (preset === "Saddle") {
    return (x, z) =>
      amplitude * ((x * x - z * z) / 5 + skew * x * z * 0.15) + offset;
  }

  if (preset === "Waves") {
    return (x, z) =>
      amplitude *
        Math.sin(frequency * x + skew * z) *
        Math.cos(frequency * z - skew * x * 0.5) +
      offset;
  }

  if (preset === "Gaussian") {
    return (x, z) => {
      const radiusSquared = x * x + z * z;
      const falloff = Math.exp(-(frequency * radiusSquared) / 6);
      return amplitude * 2.2 * falloff + offset + skew * 0.1 * z;
    };
  }

  if (preset === "Checker") {
    return (x, z) => {
      const cells =
        Math.sin(frequency * x + skew) * Math.sin(frequency * z - skew);
      return amplitude * (cells >= 0 ? 1 : -1) + offset;
    };
  }

  return () => offset;
}

function createSurfaceScene() {
  const scene = new Scene3D();

  const preset = scene.atom<SurfacePresetName>("Ripple");
  const amplitude = scene.atom(defaultParams.amplitude);
  const frequency = scene.atom(defaultParams.frequency);
  const offset = scene.atom(defaultParams.offset);
  const skew = scene.atom(defaultParams.skew);
  const surfaceFunc = scene.atom((get) => {
    // Keep the function fully reactive by deriving it from the parameter atoms
    // instead of mirroring the same data through a manual React effect.
    return buildSurfaceFunction(get(preset), {
      amplitude: get(amplitude),
      frequency: get(frequency),
      offset: get(offset),
      skew: get(skew),
    });
  });
  const samples = scene.atom(64);
  const zRange = scene.atom<[number, number]>([-5, 5]);
  const color = scene.atom("#4488ff");
  const opacity = scene.atom(0.85);
  const wireframe = scene.atom(false);
  const visible = scene.atom(true);

  scene.create("camera3d", {
    position: vec3(10, 8, 10),
    lookAt: vec3(0, 0, 0),
  });


  scene.create("axes3d", { x: [-6, 6], y: [-6, 6], z: [-6, 6], thickness: 0.7 });
  scene.create("grid3d", { plane: "xz", range1: [-6, 6], range2: [-6, 6], color: "#333" });

  // Cross-section cutting plane along the x direction
  const cutX = scene.atom(0);
  const showCut = scene.atom(true);
  const planeOpacity = scene.atom(0.15);
  const xRange = scene.atom<[number, number]>((get) => {
    return [-5, get(showCut) ? get(cutX) : 5] as [number, number]
    });

  const surface = scene.create("surface3d", {
    f: surfaceFunc,
    xRange,
    zRange,
    samples,
    color,
    opacity,
    wireframe,
    visible,
  });

  scene.create("plane3d", {
    point: scene.atom((get) => vec3(get(cutX), 0, 0)),
    normal: vec3(1, 0, 0),
    width: 12,
    height: 12,
    color: "#ff4444",
    opacity: planeOpacity,
    showEdges: true,
    visible: showCut,
  });

  // Cross-section curve: for a fixed x, trace z -> f(x, z)
  const crossSectionFunc = scene.atom((get) => {
    const fn = get(surfaceFunc);
    const x0 = get(cutX);
    const zR = get(zRange);
    return (t: number) => {
      const z = zR[0] + t * (zR[1] - zR[0]);
      return vec3(x0, fn(x0, z), z);
    };
  });

  scene.create("parametricfunction3d", {
    f: crossSectionFunc,
    tStart: 0,
    tEnd: 1,
    samples: 128,
    color: "#ff4444",
    thickness: 1,
    visible: showCut,
  });

  return {
    scene,
    surface,
    preset,
    amplitude,
    frequency,
    offset,
    skew,
    samples,
    xRange,
    zRange,
    color,
    opacity,
    wireframe,
    visible,
    cutX,
    showCut,
    planeOpacity,
  };
}

export default function Demo1() {
  const {
    scene,
    surface,
    preset,
    amplitude,
    frequency,
    offset,
    skew,
    samples,
    xRange,
    zRange,
    color,
    opacity,
    wireframe,
    visible,
    cutX,
    showCut,
    planeOpacity,
  } = useMemo(() => createSurfaceScene(), []);

  // Read the derived function atom directly so the panel can verify that the
  // current function value updates whenever its source atoms change.
  const surfaceFunc = useAtomValue(surface.f);
  const [presetVal, setPreset] = useAtomState(preset);
  const [amplitudeVal, setAmplitude] = useAtomState(amplitude);
  const [frequencyVal, setFrequency] = useAtomState(frequency);
  const [offsetVal, setOffset] = useAtomState(offset);
  const [skewVal, setSkew] = useAtomState(skew);
  const [samplesVal, setSamplesVal] = useAtomState(samples);
  const xRangeVal = useAtomValue(xRange);
  const [zRangeVal, setZRange] = useAtomState(zRange);
  const [colorVal, setColor] = useAtomState(color);
  const [opacityVal, setOpacity] = useAtomState(opacity);
  const [wireframeVal, setWireframe] = useAtomState(wireframe);
  const [visibleVal, setVisible] = useAtomState(visible);
  const [cutXVal, setCutX] = useAtomState(cutX);
  const [showCutVal, setShowCut] = useAtomState(showCut);
  const [planeOpacityVal, setPlaneOpacity] = useAtomState(planeOpacity);

  const labelStyle = { color: "white", fontSize: 13 } as const;
  const rowStyle = { display: "flex", alignItems: "center", gap: 8 } as const;

  const sampleValues = samplePoints.map((point) => ({
    ...point,
    value: surfaceFunc(point.x, point.z),
  }));

  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: "#141414", position: "relative" }}>
      {/* Render the scene while the control panel updates the source atoms. */}
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
          maxWidth: 300,
        }}
      >
        <span style={{ ...labelStyle, fontWeight: "bold", fontSize: 15 }}>
          Surface3D Derived Function Test
        </span>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={labelStyle}>Preset</span>
          <select
            value={presetVal}
            onChange={(e) => setPreset(e.target.value as SurfacePresetName)}
            style={{ fontSize: 13, padding: "2px 4px" }}
          >
            {presetNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <div style={rowStyle}>
          <span style={{ ...labelStyle, minWidth: 90 }}>
            Amplitude: {amplitudeVal.toFixed(2)}
          </span>
          <input
            type="range"
            min={0}
            max={3}
            step={0.05}
            value={amplitudeVal}
            onChange={(e) => setAmplitude(Number(e.target.value))}
            style={{ flex: 1 }}
          />
        </div>

        <div style={rowStyle}>
          <span style={{ ...labelStyle, minWidth: 90 }}>
            Frequency: {frequencyVal.toFixed(2)}
          </span>
          <input
            type="range"
            min={0.2}
            max={3}
            step={0.05}
            value={frequencyVal}
            onChange={(e) => setFrequency(Number(e.target.value))}
            style={{ flex: 1 }}
          />
        </div>

        <div style={rowStyle}>
          <span style={{ ...labelStyle, minWidth: 90 }}>
            Offset: {offsetVal.toFixed(2)}
          </span>
          <input
            type="range"
            min={-3}
            max={3}
            step={0.05}
            value={offsetVal}
            onChange={(e) => setOffset(Number(e.target.value))}
            style={{ flex: 1 }}
          />
        </div>

        <div style={rowStyle}>
          <span style={{ ...labelStyle, minWidth: 90 }}>
            Skew: {skewVal.toFixed(2)}
          </span>
          <input
            type="range"
            min={-2}
            max={2}
            step={0.05}
            value={skewVal}
            onChange={(e) => setSkew(Number(e.target.value))}
            style={{ flex: 1 }}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            padding: "8px 10px",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 6,
          }}
        >
          <span style={{ ...labelStyle, fontWeight: "bold" }}>
            Function samples (live read)
          </span>
          {sampleValues.map((sample) => (
            <span key={sample.label} style={{ ...labelStyle, fontFamily: "monospace" }}>
              {sample.label} = {sample.value.toFixed(3)}
            </span>
          ))}
          <span style={{ ...labelStyle, color: "#aaa", fontSize: 12 }}>
            Changing the parameter atoms updates this derived function automatically.
          </span>
        </div>

        <div style={rowStyle}>
          <span style={{ ...labelStyle, minWidth: 70 }}>Samples: {samplesVal}</span>
          <input
            type="range" min={4} max={200}
            value={samplesVal}
            onChange={(e) => setSamplesVal(Number(e.target.value))}
            style={{ flex: 1 }}
          />
        </div>

        <div style={rowStyle}>
          <span style={{ ...labelStyle, minWidth: 70 }}>Z range</span>
          <input
            type="number" value={zRangeVal[0]}
            onChange={(e) => setZRange([Number(e.target.value), zRangeVal[1]])}
            style={{ width: 50, fontSize: 13 }}
          />
          <input
            type="number" value={zRangeVal[1]}
            onChange={(e) => setZRange([zRangeVal[0], Number(e.target.value)])}
            style={{ width: 50, fontSize: 13 }}
          />
        </div>

        <div style={rowStyle}>
          <span style={{ ...labelStyle, minWidth: 70 }}>Color</span>
          <input type="color" value={colorVal} onChange={(e) => setColor(e.target.value)} />
        </div>

        <div style={rowStyle}>
          <span style={{ ...labelStyle, minWidth: 70 }}>Opacity: {opacityVal.toFixed(2)}</span>
          <input
            type="range" min={0} max={1} step={0.05}
            value={opacityVal}
            onChange={(e) => setOpacity(Number(e.target.value))}
            style={{ flex: 1 }}
          />
        </div>

        <label style={labelStyle}>
          <input type="checkbox" checked={wireframeVal} onChange={(e) => setWireframe(e.target.checked)} />{" "}
          Wireframe
        </label>

        <label style={labelStyle}>
          <input type="checkbox" checked={visibleVal} onChange={(e) => setVisible(e.target.checked)} />{" "}
          Visible
        </label>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            padding: "8px 10px",
            background: "rgba(255,68,68,0.1)",
            borderRadius: 6,
            borderLeft: "3px solid #ff4444",
          }}
        >
          <label style={{ ...labelStyle, fontWeight: "bold" }}>
            <input type="checkbox" checked={showCutVal} onChange={(e) => setShowCut(e.target.checked)} />{" "}
            Cross Section Plane
          </label>
          <div style={rowStyle}>
            <span style={{ ...labelStyle, minWidth: 90 }}>
              X = {cutXVal.toFixed(2)}
            </span>
            <input
              type="range"
              min={-5}
              max={5}
              step={0.05}
              value={cutXVal}
              onChange={(e) => setCutX(Number(e.target.value))}
              style={{ flex: 1 }}
            />
          </div>
          <div style={rowStyle}>
            <span style={{ ...labelStyle, minWidth: 90 }}>
              Opacity: {planeOpacityVal.toFixed(2)}
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={planeOpacityVal}
              onChange={(e) => setPlaneOpacity(Number(e.target.value))}
              style={{ flex: 1 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
