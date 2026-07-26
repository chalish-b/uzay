import { useMemo } from "react";
import { Scene3D, vec3, type Vec3, type WritableBoundAtom } from "uzay";
import { Scene3DView, useAtomState } from "uzay/react";

// parametricsurface3d sandbox.
//
// One surface, with a shape slider cycling through the item's interesting
// regimes:
// - torus: closes around both axes; flip closedU/closedV and eyeball the
//   shading seam appearing (open) and disappearing (welded), clearest with
//   wireframe on, where the welded seam's duplicate column vanishes
// - sphere: closedU welds the equator seam; the v poles are degenerate rows
//   (whole rows collapse to a point) and must shade correctly as-is; turning
//   closedV ON here is a deliberate misuse: it welds pole to pole and must
//   log the seam mismatch warning
// - cylinder: the classic closedU case
// - helicoid: open in both axes; closed flags here must warn
// - scroll: a cylinder whose radius grows with u, so the seam has a real gap;
//   drag param to 0 and the gap closes, then up again, and the closedU
//   warning must fire once per crossing, not per frame
// The param slider morphs each shape (tube/sphere/cylinder radius, helicoid
// pitch, scroll gap) through a reactive f, exercising the buffer-reuse path.
// uSamples/vSamples drive per-axis sampling; wireframe shows the topology.

const SHAPES = ["torus", "sphere", "cylinder", "helicoid", "scroll"] as const;
type Shape = (typeof SHAPES)[number];

type SurfaceFunc = (u: number, v: number) => Vec3;

const TAU = 2 * Math.PI;

function shapeFunc(shape: Shape, p: number): SurfaceFunc {
  switch (shape) {
    case "torus": {
      const r = 0.2 + p * 1.3;
      return (u, v) =>
        vec3(
          (2.2 + r * Math.cos(v)) * Math.cos(u),
          r * Math.sin(v),
          (2.2 + r * Math.cos(v)) * Math.sin(u)
        );
    }
    case "sphere": {
      const r = 0.5 + p * 2;
      return (u, v) =>
        vec3(
          r * Math.sin(v) * Math.cos(u),
          r * Math.cos(v),
          r * Math.sin(v) * Math.sin(u)
        );
    }
    case "cylinder": {
      const r = 0.5 + p * 1.5;
      return (u, v) => vec3(r * Math.cos(u), v, r * Math.sin(u));
    }
    case "helicoid": {
      const c = p;
      return (u, v) => vec3(v * Math.cos(u), c * u, v * Math.sin(u));
    }
    case "scroll": {
      const gap = p * 1.5;
      return (u, v) =>
        vec3(
          (1.5 + (gap * u) / TAU) * Math.cos(u),
          v,
          (1.5 + (gap * u) / TAU) * Math.sin(u)
        );
    }
  }
}

function shapeRanges(shape: Shape): {
  uRange: [number, number];
  vRange: [number, number];
} {
  switch (shape) {
    case "torus":
      return { uRange: [0, TAU], vRange: [0, TAU] };
    case "sphere":
      return { uRange: [0, TAU], vRange: [0, Math.PI] };
    case "helicoid":
      return { uRange: [-Math.PI, Math.PI], vRange: [-1.8, 1.8] };
    case "cylinder":
    case "scroll":
      return { uRange: [0, TAU], vRange: [-1.5, 1.5] };
  }
}

type SliderSpec = {
  label: string;
  atom: WritableBoundAtom<number>;
  min: number;
  max: number;
  step: number;
  display?: (value: number) => string;
};

function buildScene() {
  const scene = new Scene3D();
  const camera = scene.create("camera3d", {
    position: vec3(7, 5, 8),
    lookAt: vec3(0, 0, 0),
    fov: 55,
  });

  scene.create("axes3d", { x: [-6, 6], y: [-4, 4], z: [-6, 6], thickness: 0.7 });
  scene.create("grid3d", {
    plane: "xz",
    range1: [-6, 6],
    range2: [-6, 6],
    offset: -3,
    thickness: 2,
  });

  const shapeSlider = scene.atom(0);
  const paramSlider = scene.atom(0.5);
  const uSamplesSlider = scene.atom(96);
  const vSamplesSlider = scene.atom(48);
  const closedUToggle = scene.atom(1);
  const closedVToggle = scene.atom(0);
  const wireframeToggle = scene.atom(0);
  const opacitySlider = scene.atom(0.85);

  const shape = scene.atom((get) => SHAPES[Math.round(get(shapeSlider))]);

  scene.create("parametricsurface3d", {
    f: scene.atom((get) => shapeFunc(get(shape), get(paramSlider))),
    uRange: scene.atom((get) => shapeRanges(get(shape)).uRange),
    vRange: scene.atom((get) => shapeRanges(get(shape)).vRange),
    samples: scene.atom(
      (get) =>
        [
          Math.round(get(uSamplesSlider)),
          Math.round(get(vSamplesSlider)),
        ] as [number, number]
    ),
    closedU: scene.atom((get) => get(closedUToggle) > 0.5),
    closedV: scene.atom((get) => get(closedVToggle) > 0.5),
    wireframe: scene.atom((get) => get(wireframeToggle) > 0.5),
    opacity: opacitySlider,
    color: "#f472b6",
  });

  const sliders: SliderSpec[] = [
    {
      label: "shape",
      atom: shapeSlider,
      min: 0,
      max: SHAPES.length - 1,
      step: 1,
      display: (value) => SHAPES[Math.round(value)],
    },
    { label: "param", atom: paramSlider, min: 0, max: 1, step: 0.01 },
    { label: "uSamples", atom: uSamplesSlider, min: 3, max: 160, step: 1 },
    { label: "vSamples", atom: vSamplesSlider, min: 3, max: 160, step: 1 },
    { label: "closedU", atom: closedUToggle, min: 0, max: 1, step: 1 },
    { label: "closedV", atom: closedVToggle, min: 0, max: 1, step: 1 },
    { label: "wireframe", atom: wireframeToggle, min: 0, max: 1, step: 1 },
    { label: "opacity", atom: opacitySlider, min: 0.1, max: 1, step: 0.05 },
  ];

  return { scene, camera, sliders };
}

function Slider({ spec }: { spec: SliderSpec }) {
  const [value, setValue] = useAtomState(spec.atom);
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#999" }}>
      <span style={{ width: 96, flexShrink: 0 }}>
        {spec.label}:{" "}
        {spec.display
          ? spec.display(value)
          : value.toFixed(spec.step >= 1 ? 0 : 2)}
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
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        backgroundColor: "#141414",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <Scene3DView scene={scene} camera={camera} style={{ width: "100%", height: "100%" }} />
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          width: 300,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: 12,
          borderRadius: 6,
          backgroundColor: "rgba(22, 22, 22, 0.9)",
          border: "1px solid #2a2a2a",
        }}
      >
        <span style={{ fontSize: 11, color: "#ccc", fontWeight: "bold" }}>
          parametricsurface3d sandbox
        </span>
        {sliders.map((spec) => (
          <Slider key={spec.label} spec={spec} />
        ))}
      </div>
    </div>
  );
}
