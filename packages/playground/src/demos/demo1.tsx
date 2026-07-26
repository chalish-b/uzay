import { useMemo } from "react";
import { Scene3D, vec3, type Vec3, type WritableBoundAtom } from "uzay";
import { Scene3DView, useAtomState } from "uzay/react";

// polygon3d sandbox.
//
// Center: a square pyramid assembled the way a real figure would be. The four
// lateral faces are ONE polygon3d with Vec3[][] points (multi-ring), the base
// is its own polygon3d, and the apex height rides a slider through reactive
// points, so every drag rebuilds the fill triangulation and the strokes.
// Sliders drive the interacting options:
// - opacity restyles the lateral faces' fill
// - stroke opacity / thickness control the outlines; thickness 0 or opacity 0
//   must drop the stroke objects entirely
// - visible hides fill and strokes as one
// Left: a concave L-shaped hexagon embedded in a tilted (non-axis-aligned)
// plane, checking that triangulation happens in the polygon's own plane and
// handles concavity there. The collapse toggle replaces it with six collinear
// points: the fill must vanish silently (degenerate ring), while its stroke
// may still draw the line.
// Right: a quad whose far corner the bend slider lifts out of the plane. It
// must keep rendering as a folded surface, and the console must log the
// non-planar warning once per crossing out of planarity, not per frame.

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
    position: vec3(8, 6, 9),
    lookAt: vec3(0, 1, 0),
    fov: 55,
  });

  scene.create("axes3d", { x: [-8, 8], y: [-8, 8], z: [-8, 8], thickness: 0.7 });
  scene.create("grid3d", {
    plane: "xz",
    range1: [-8, 8],
    range2: [-8, 8],
    thickness: 2,
  });

  const heightSlider = scene.atom(2.5);
  const opacitySlider = scene.atom(0.35);
  const strokeOpacitySlider = scene.atom(1);
  const strokeThicknessSlider = scene.atom(2);
  const visibleToggle = scene.atom(1);
  const collapseToggle = scene.atom(0);
  const bendSlider = scene.atom(0);

  // The square pyramid. Base corners are fixed, the apex follows the slider.
  const A = vec3(-1.5, 0, -1.5);
  const B = vec3(1.5, 0, -1.5);
  const C = vec3(1.5, 0, 1.5);
  const D = vec3(-1.5, 0, 1.5);
  const apex = scene.atom((get) => vec3(0, get(heightSlider), 0));

  scene.create("polygon3d", {
    points: scene.atom((get) => {
      const T = get(apex);
      return [
        [A, B, T],
        [B, C, T],
        [C, D, T],
        [D, A, T],
      ];
    }),
    color: "#f472b6",
    opacity: opacitySlider,
    strokeColor: "#f9a8d4",
    strokeOpacity: strokeOpacitySlider,
    strokeThickness: strokeThicknessSlider,
    visible: scene.atom((get) => get(visibleToggle) > 0.5),
  });
  scene.create("polygon3d", {
    points: [A, B, C, D],
    color: "#38bdf8",
    opacity: 0.25,
    strokeColor: "#7dd3fc",
    strokeOpacity: strokeOpacitySlider,
    strokeThickness: strokeThicknessSlider,
    visible: scene.atom((get) => get(visibleToggle) > 0.5),
  });

  // The concave L-shape in a tilted plane. Local (l1, l2) coordinates are
  // embedded through an orthonormal basis that lines up with no world axis.
  const origin = vec3(-6, 1, 2);
  const u = vec3(1, 0.5, 0.3).unit();
  const normal = u.cross(vec3(0, 1, 0)).unit();
  const v = normal.cross(u);
  const embed = (l1: number, l2: number): Vec3 =>
    origin.add(u.scale(l1)).add(v.scale(l2));

  const L_SHAPE: [number, number][] = [
    [0, 0],
    [2, 0],
    [2, 1],
    [1, 1],
    [1, 2],
    [0, 2],
  ];
  const COLLINEAR: [number, number][] = [
    [0, 0],
    [2, 0],
    [3, 0],
    [1.5, 0],
    [0.5, 0],
    [2.5, 0],
  ];

  scene.create("polygon3d", {
    points: scene.atom((get) => {
      const local = get(collapseToggle) > 0.5 ? COLLINEAR : L_SHAPE;
      return local.map(([l1, l2]) => embed(l1, l2));
    }),
    color: "#a78bfa",
    opacity: opacitySlider,
    strokeColor: "#c4b5fd",
    strokeOpacity: strokeOpacitySlider,
    strokeThickness: strokeThicknessSlider,
  });

  // The bend quad. Three corners stay on the ground plane, the fourth rises
  // with the slider, making the ring non-planar.
  scene.create("polygon3d", {
    points: scene.atom((get) => [
      vec3(4, 0, -1),
      vec3(7, 0, -1),
      vec3(7, get(bendSlider), 2),
      vec3(4, 0, 2),
    ]),
    color: "#fbbf24",
    opacity: opacitySlider,
    strokeColor: "#fde68a",
    strokeOpacity: strokeOpacitySlider,
    strokeThickness: strokeThicknessSlider,
  });

  const sliders: SliderSpec[] = [
    { label: "height", atom: heightSlider, min: 0.2, max: 4, step: 0.1 },
    { label: "bend", atom: bendSlider, min: 0, max: 2.5, step: 0.05 },
    { label: "opacity", atom: opacitySlider, min: 0, max: 1, step: 0.05 },
    { label: "strokeOp", atom: strokeOpacitySlider, min: 0, max: 1, step: 0.05 },
    { label: "strokeTh", atom: strokeThicknessSlider, min: 0, max: 6, step: 0.5 },
    { label: "visible", atom: visibleToggle, min: 0, max: 1, step: 1 },
    { label: "collapse", atom: collapseToggle, min: 0, max: 1, step: 1 },
  ];

  return { scene, camera, sliders };
}

function Slider({ spec }: { spec: SliderSpec }) {
  const [value, setValue] = useAtomState(spec.atom);
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#999" }}>
      <span style={{ width: 84, flexShrink: 0 }}>
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
          width: 280,
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
          polygon3d sandbox
        </span>
        {sliders.map((spec) => (
          <Slider key={spec.label} spec={spec} />
        ))}
      </div>
    </div>
  );
}
