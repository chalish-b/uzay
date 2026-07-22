import { useMemo } from "react";
import { Scene3D, vec3, type WritableBoundAtom } from "uzay";
import { Scene3DView, useAtomState } from "uzay/react";

// Flat 3D line style sandbox.
//
// - left: the same helix as a lit tube (pink) and as a flat stroke (blue),
//   sharing the thickness slider: at the default framing the two should have
//   about the same on-screen weight at any slider value
// - center: a sphere ringed by a flat circle: orbit the camera and the ring
//   must be occluded correctly where it passes behind the sphere; above it a
//   trefoil knot whose style flips live between tube and flat
// - below the sphere: a star of 60 thin translucent flat chords, the cheap
//   "many subtle lines" case the flat style exists for
// - right: a dashed flat segment and a dashed flat sine curve
// - sliders: style flips the trefoil (and its dashed flag only takes effect
//   while flat); dashed/thickness/opacity retarget materials in place

const TAU = Math.PI * 2;

type SliderSpec = {
  label: string;
  atom: WritableBoundAtom<number>;
  min: number;
  max: number;
  step: number;
};

function buildScene() {
  const scene = new Scene3D();
  const camera = scene.create("camera3d", {
    position: vec3(2, 7, 14),
    lookAt: vec3(0, 0, 0),
  });

  scene.create("grid3d", {
    plane: "xz",
    range1: [-8, 8],
    range2: [-8, 8],
    offset: -2,
    color: "#222",
    thickness: 1,
    gap: 1,
  });

  const styleToggle = scene.atom(1);
  const dashedToggle = scene.atom(1);
  const thicknessSlider = scene.atom(2);
  const opacitySlider = scene.atom(0.35);

  const styleAtom = scene.atom((get) =>
    get(styleToggle) > 0.5 ? ("flat" as const) : ("tube" as const)
  );
  const dashedAtom = scene.atom((get) => get(dashedToggle) > 0.5);

  // Tube vs flat: the same helix twice, sharing the thickness slider.
  const helix = (cx: number) => (t: number) =>
    vec3(cx + Math.cos(t) * 1.2, -2 + t * 0.3, Math.sin(t) * 1.2);
  scene.create("parametricfunction3d", {
    f: helix(-5.5),
    tStart: 0,
    tEnd: 3 * TAU,
    color: "#f472b6",
    thickness: thicknessSlider,
    samples: 256,
    style: "tube",
  });
  scene.create("parametricfunction3d", {
    f: helix(-2.8),
    tStart: 0,
    tEnd: 3 * TAU,
    color: "#4f9cf9",
    thickness: thicknessSlider,
    samples: 256,
    style: "flat",
  });

  // Occlusion: a flat ring around a solid sphere.
  scene.create("sphere3d", {
    center: vec3(1.5, 0, 0),
    radius: 1.2,
    color: "#8a7f96",
  });
  scene.create("parametricfunction3d", {
    f: (t: number) => vec3(1.5 + 2 * Math.cos(t), 0, 2 * Math.sin(t)),
    tStart: 0,
    tEnd: TAU,
    color: "#4f9cf9",
    thickness: 1.5,
    samples: 128,
    style: "flat",
  });

  // Style toggle: a trefoil knot that flips between tube and flat live.
  scene.create("parametricfunction3d", {
    f: (t: number) =>
      vec3(
        (Math.sin(t) + 2 * Math.sin(2 * t)) * 0.5 + 1.5,
        (Math.cos(t) - 2 * Math.cos(2 * t)) * 0.5 + 3.2,
        -Math.sin(3 * t) * 0.5
      ),
    tStart: 0,
    tEnd: TAU,
    color: "#facc15",
    thickness: thicknessSlider,
    samples: 256,
    style: styleAtom,
    dashed: dashedAtom,
  });

  // Many subtle lines: a star of flat chords sharing the opacity slider.
  const CHORDS = 60;
  const starPoint = (i: number) => {
    const angle = (i / CHORDS) * TAU;
    return vec3(1.5 + Math.cos(angle) * 3.5, -2, Math.sin(angle) * 3.5);
  };
  for (let i = 0; i < CHORDS; i++) {
    scene.create("line3d", {
      start: starPoint(i),
      end: starPoint(i + 27),
      color: "#34d399",
      thickness: 1,
      opacity: opacitySlider,
      style: "flat",
    });
  }

  // Dashed flat lines: a straight segment and a sine curve.
  scene.create("line3d", {
    start: vec3(4.5, -2, -2),
    end: vec3(4.5, 3, -2),
    color: "#f97583",
    thickness: thicknessSlider,
    style: "flat",
    dashed: dashedAtom,
  });
  scene.create("parametricfunction3d", {
    f: (t: number) => vec3(4.5, Math.sin(t * 2) * 0.8 + 0.5, t),
    tStart: -3,
    tEnd: 3,
    color: "#f97583",
    thickness: thicknessSlider,
    samples: 128,
    style: "flat",
    dashed: dashedAtom,
  });

  const sliders: SliderSpec[] = [
    { label: "style", atom: styleToggle, min: 0, max: 1, step: 1 },
    { label: "dashed", atom: dashedToggle, min: 0, max: 1, step: 1 },
    { label: "thickness", atom: thicknessSlider, min: 0.5, max: 6, step: 0.5 },
    { label: "opacity", atom: opacitySlider, min: 0.05, max: 1, step: 0.05 },
  ];

  return { scene, camera, sliders };
}

function Slider({ spec }: { spec: SliderSpec }) {
  const [value, setValue] = useAtomState(spec.atom);
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#999" }}>
      <span style={{ width: 64, flexShrink: 0 }}>
        {spec.label}: {value.toFixed(spec.step >= 1 ? 0 : 2)}
      </span>
      <input
        type="range"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={value}
        onChange={(e) => setValue(parseFloat(e.target.value))}
        style={{ width: "100%" }}
      />
    </label>
  );
}

export default function Demo1() {
  const { scene, camera, sliders } = useMemo(buildScene, []);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", fontFamily: "system-ui, sans-serif" }}>
      <Scene3DView scene={scene} camera={camera} style={{ width: "100%", height: "100%" }} />
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          width: 260,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: 12,
          borderRadius: 6,
          backgroundColor: "rgba(22, 22, 22, 0.9)",
          border: "1px solid #2a2a2a",
        }}
      >
        {sliders.map((spec) => (
          <Slider key={spec.label} spec={spec} />
        ))}
      </div>
    </div>
  );
}
