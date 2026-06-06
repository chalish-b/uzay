"use client";

import { useMemo } from "react";
import katex from "katex";
import { Scene3D, curvePoint, tangentLine, vec2, vec3 } from "uzay";
import { Scene3DView, useAtomState } from "uzay/react";

const SURFACE_LATEX = katex.renderToString(
  String.raw`f(x, z) = \sin(x)\,e^{-z^2/20}`,
  { throwOnError: false },
);

const X_RANGE: [number, number] = [-5.5, 5.5];
const Z_RANGE: [number, number] = [-5.5, 5.5];
const SLICE_HALF_WIDTH = 0.2;

const RED = "#db798a";
const WHITE = "#f8fafc";

function surfaceHeight(x: number, z: number) {
  return Math.sin(x) * Math.exp(-(z * z) / 20);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function createScene() {
  const scene = new Scene3D();

  // Drive the slice position from the React slider.
  const sliceZ = scene.atom(1.75);

  // Derive the highlighted strip from the current slice.
  const sliceRange = scene.atom((get) => {
    const z = get(sliceZ);
    return [
      clamp(z - SLICE_HALF_WIDTH, Z_RANGE[0], Z_RANGE[1]),
      clamp(z + SLICE_HALF_WIDTH, Z_RANGE[0], Z_RANGE[1]),
    ] as [number, number];
  });

  // Treat the cross-section as a regular parametric curve in 3D.
  const sliceCurve = scene.atom((get) => {
    const z = get(sliceZ);
    return (x: number) => vec3(x, surfaceHeight(x, z), z);
  });

  const camera = scene.create("camera3d", {
    position: vec3(3, 4, 10),
    lookAt: vec3(2, -1, 0),
    fov: 42,
  });

  // Add a subtle ground reference below the surface.
  scene.create("grid3d", {
    plane: "xz",
    range1: [-6, 6],
    range2: [-6, 6],
    offset: -2.1,
    gap: 1,
    color: "#aaaaaa",
    opacity: 0.2,
    pointerEvents: "none",
  });

  scene.create("axes3d", {
    x: [-5, 5],
    y: [-2, 3],
    z: [-6, 6],
    color: "#aaaaaa",
    thickness: 0.6,
    pointerEvents: "none",
  });

  // Render the full surface faintly so the slice reads as a focused inspection.
  scene.create("surface3d", {
    f: surfaceHeight,
    xRange: X_RANGE,
    zRange: scene.atom((get) => [Z_RANGE[0], get(sliceZ)]),
    samples: 84,
    color: WHITE,
    opacity: 0.1,
    pointerEvents: "none",
  });

  scene.create("surface3d", {
    f: surfaceHeight,
    xRange: X_RANGE,
    zRange: scene.atom((get) => [get(sliceRange)[0], get(sliceZ)]),
    samples: 84,
    color: RED,
    opacity: 0.5,
    pointerEvents: "none",
  });

  scene.create("parametricfunction3d", {
    f: sliceCurve,
    tStart: X_RANGE[0],
    tEnd: X_RANGE[1],
    samples: 240,
    color: RED,
    thickness: 1,
    pointerEvents: "none",
  });

  // Let the user inspect the cross-section directly on the curve.
  const point = curvePoint(scene, {
    f: sliceCurve,
    tStart: X_RANGE[0],
    tEnd: X_RANGE[1],
    initialT: 2.5,
    color: WHITE,
  });
  point.point.radius.set(3);

  const tangent = tangentLine(scene, {
    f: sliceCurve,
    t: point.t,
    color: WHITE,
    length: 6,
  });

  // Convert the 3D tangent into the 2D cross-section slope.
  const slope = scene.atom((get) => {
    const dir = get(tangent.tangent);
    return Math.abs(dir.x) < 1e-6 ? 0 : dir.y / dir.x;
  });

  scene.create("overlay3d", {
    position: point.point.coords,
    content: scene.atom((get) => {
      const value = get(slope);
      return String.raw`dy/dx = ${value.toFixed(2)}`;
    }),
    format: "latex",
    anchor: "bottom-left",
    offset: vec2(10, -12),
    className:
      "text-slate-50 bg-neutral-900/[0.8] rounded px-2 py-1 text-xs pointer-events-none shadow-lg",
  });

  return {
    scene,
    camera,
    sliceZ,
    pointT: point.t,
  };
}

export default function HomeSurfaceDemo() {
  const { scene, camera, sliceZ, pointT } = useMemo(() => createScene(), []);
  const [slice, setSlice] = useAtomState(sliceZ);
  const [tValue, setTValue] = useAtomState(pointT);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-fd-border bg-fd-card">
      <div className="relative h-110 bg-[#0c0c0f]">
        <Scene3DView scene={scene} camera={camera} style={{ width: "100%", height: "100%" }} />
        <div
          className="pointer-events-none absolute left-3 top-3 rounded bg-neutral-900/[0.2] px-2 py-1 text-base text-slate-50 shadow-lg"
          dangerouslySetInnerHTML={{ __html: SURFACE_LATEX }}
        />
        <p className="pointer-events-none absolute bottom-3 left-3 text-sm text-white/40">
          Drag the point to explore the tangent
        </p>
      </div>

      <div className="space-y-2 border-t border-fd-border px-4 py-3">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={Z_RANGE[0]}
            max={Z_RANGE[1]}
            step="0.05"
            value={slice}
            onChange={(event) => setSlice(parseFloat(event.target.value))}
            className="w-full accent-fd-primary"
            aria-label="Move the surface slice"
          />
          <span className="w-16 shrink-0 text-right text-xs text-fd-muted-foreground tabular-nums">
            z = {slice.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="range"
            min={X_RANGE[0]}
            max={X_RANGE[1]}
            step="0.05"
            value={tValue}
            onChange={(event) => setTValue(parseFloat(event.target.value))}
            className="w-full accent-fd-primary"
            aria-label="Move the point along the curve"
          />
          <span className="w-16 shrink-0 text-right text-xs text-fd-muted-foreground tabular-nums">
            x = {tValue.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
