import { useMemo } from "react";
import { Scene2D, transformedGrid2D, vec2, type WritableBoundAtom } from "uzay";
import { Scene2DView, useAtomState } from "uzay/react";

// transformedGrid2D options sandbox.
//
// One transformed grid whose every option is an atom driven by a slider:
// - map cycles shear / z² / swirl; morph lerps the identity toward it, so the
//   grid bends live through intermediate maps
// - extentX / extentY resize rangeX / rangeY: growing them past the initial
//   size forces the construction to create new line items on the fly
// - gap respaces the source lines; small gaps also grow the item pools
// - opacity and thickness restyle every line through the shared atoms
// - palette swaps colorX / colorY to check the family coloring stays put
// - visible toggles the whole construction
//
// The scene renders in BOTH backends side by side (threejs left, svg right)
// with a shared camera, so pan/zoom stays in sync and any visual difference
// between the backends is immediately obvious.

type SliderSpec = {
  label: string;
  atom: WritableBoundAtom<number>;
  min: number;
  max: number;
  step: number;
};

const MAPS = [
  {
    label: "shear",
    f: (x: number, y: number) => vec2(x + 0.4 * y * y, y),
  },
  {
    label: "z²",
    f: (x: number, y: number) => vec2((x * x - y * y) / 2, x * y),
  },
  {
    label: "swirl",
    f: (x: number, y: number) => {
      const a = 0.5 * Math.hypot(x, y);
      return vec2(x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a));
    },
  },
];

function buildScene() {
  const scene = new Scene2D();
  const camera = scene.create("camera2d", { center: vec2(0, 0), zoom: 0.8 });

  // Faint reference: the untransformed source plane.
  scene.create("grid2d", {
    rangeX: true,
    rangeY: true,
    gap: "auto",
    color: "white",
    opacity: 0.06,
  });
  scene.create("axes2d", {
    x: true,
    y: true,
    color: "#666",
    thickness: 1,
    tickmarks: true,
    tickStep: "auto",
  });

  const mapSlider = scene.atom(0);
  const morphSlider = scene.atom(1);
  const extentXSlider = scene.atom(3);
  const extentYSlider = scene.atom(3);
  const gapSlider = scene.atom(0.5);
  const opacitySlider = scene.atom(0.6);
  const thicknessSlider = scene.atom(1);
  const paletteToggle = scene.atom(0);
  const visibleToggle = scene.atom(1);

  const mapAtom = scene.atom((get) => {
    const F = MAPS[Math.round(get(mapSlider))].f;
    const t = get(morphSlider);
    return (x: number, y: number) => vec2(x, y).lerp(F(x, y), t);
  });

  transformedGrid2D(scene, {
    map: mapAtom,
    rangeX: scene.atom(
      (get) => [-get(extentXSlider), get(extentXSlider)] as [number, number]
    ),
    rangeY: scene.atom(
      (get) => [-get(extentYSlider), get(extentYSlider)] as [number, number]
    ),
    gap: gapSlider,
    colorX: scene.atom((get) =>
      get(paletteToggle) > 0.5 ? "#f472b6" : "#38bdf8"
    ),
    colorY: scene.atom((get) =>
      get(paletteToggle) > 0.5 ? "#facc15" : "#a78bfa"
    ),
    opacity: opacitySlider,
    thickness: thicknessSlider,
    visible: scene.atom((get) => get(visibleToggle) > 0.5),
  });

  const sliders: SliderSpec[] = [
    { label: "map", atom: mapSlider, min: 0, max: MAPS.length - 1, step: 1 },
    { label: "morph", atom: morphSlider, min: 0, max: 1, step: 0.01 },
    { label: "extentX", atom: extentXSlider, min: 1, max: 8, step: 0.5 },
    { label: "extentY", atom: extentYSlider, min: 1, max: 8, step: 0.5 },
    { label: "gap", atom: gapSlider, min: 0.25, max: 2, step: 0.25 },
    { label: "opacity", atom: opacitySlider, min: 0.1, max: 1, step: 0.05 },
    { label: "thickness", atom: thicknessSlider, min: 0.5, max: 4, step: 0.5 },
    { label: "palette", atom: paletteToggle, min: 0, max: 1, step: 1 },
    { label: "visible", atom: visibleToggle, min: 0, max: 1, step: 1 },
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

function ViewPane({
  scene,
  camera,
  renderer,
}: {
  scene: Scene2D;
  camera: ReturnType<Scene2D["create"]>;
  renderer: "threejs" | "svg";
}) {
  return (
    <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
      <Scene2DView
        scene={scene}
        camera={camera}
        renderer={renderer}
        style={{ width: "100%", height: "100%" }}
      />
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 10,
          color: "#777",
          fontSize: 12,
          pointerEvents: "none",
        }}
      >
        {renderer}
      </div>
    </div>
  );
}

export default function Demo1() {
  const { scene, camera, sliders } = useMemo(buildScene, []);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        <div style={{ width: 1, backgroundColor: "#2a2a2a" }} />
        <ViewPane scene={scene} camera={camera} renderer="threejs" />
      </div>
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
