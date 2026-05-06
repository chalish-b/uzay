import { useEffect, useMemo, useRef, useState } from "react";
import { Scene2D, View2D, vec2, curvePoint2D } from "uzay";
import type { Vec2 } from "uzay";

function createScene() {
  const scene = new Scene2D();

  const camera = scene.create("camera2d", {
    center: vec2(0, 0),
    zoom: 1,
  });

  scene.create("grid2d", {
    rangeX: [-10, 10],
    rangeY: [-10, 10],
    gap: 1,
    color: "white",
    opacity: 0.15,
  });

  scene.create("axes2d", {
    x: [-9, 9],
    y: [-9, 9],
    color: "white",
    thickness: 1.2,
    tickmarks: true,
    tickStep: 1,
    arrows: true,
  });

  // Two draggable endpoints with a line connecting them. The line uses the
  // points' coords atoms directly so it follows automatically.
  const a = scene.create("point2d", {
    coords: vec2(-3, 1),
    color: "tomato",
    radius: 4,
    draggable: "xy",
  });
  const b = scene.create("point2d", {
    coords: vec2(3, 2),
    color: "tomato",
    radius: 4,
    draggable: "xy",
  });
  scene.create("line2d", {
    start: a.coords,
    end: b.coords,
    color: "tomato",
    thickness: 5,
  });

  // Free-drag vector starting from the origin.
  const v = scene.create("vector2d", {
    origin: vec2(0, 0),
    vector: vec2(2, 3),
    color: "steelblue",
  });

  // Mirror vector via a derived atom: always reflects v across the origin.
  const negV = scene.atom((get) => {
    const w = get(v.vector);
    return vec2(-w.x, -w.y);
  });
  scene.create("vector2d", {
    origin: vec2(0, 0),
    vector: negV,
    color: "lime",
    draggable: "none",
  });

  // Vector constrained to drag along x only.
  scene.create("vector2d", {
    origin: vec2(0, -4),
    vector: vec2(2.5, 0),
    color: "gold",
    draggable: "x",
  });

  // Y-only draggable point that controls sine wave amplitude. Demonstrates
  // a derived "function-valued" atom: the parametric function rebuilds
  // automatically whenever the point's y coord changes.
  const sineAmp = scene.create("point2d", {
    coords: vec2(-7, 2),
    color: "violet",
    radius: 4,
    draggable: "y",
  });

  const sineFn = scene.atom(
    (get) => {
      const amp = get(sineAmp.coords).y;
      return (t: number) => vec2(t, amp * Math.sin(t));
    },
  );

  scene.create("parametricfunction2d", {
    f: sineFn,
    tStart: -8,
    tEnd: 8,
    samples: 200,
    color: "violet",
    thickness: 3,
  });

  // Static unit circle as a parametric curve.
  scene.create("parametricfunction2d", {
    f: (t: number) => vec2(2.5 + Math.cos(t) * 1.2, 5 + Math.sin(t) * 1.2),
    tStart: 0,
    tEnd: Math.PI * 2,
    samples: 64,
    color: "cyan",
    thickness: 3,
  });

  // Curve-stuck point via the curvePoint2D construction. The orange wavy
  // curve is f(t) = (t, 0.6 * t * sin(t)); the orange point is constrained
  // to it and slides to the nearest position when dragged.
  const curveF = (t: number) => vec2(t, 0.6 * t * Math.sin(t));

  scene.create("parametricfunction2d", {
    f: curveF,
    tStart: -6,
    tEnd: 6,
    samples: 240,
    color: "orange",
    thickness: 3,
  });

  const stuck = curvePoint2D(scene, {
    f: curveF,
    tStart: -6,
    tEnd: 6,
    initialT: 0.5,
    color: "orange",
  });
  stuck.point.radius.set(5);

  return { scene, camera, a, b, v, sineAmp, stuckT: stuck.t };
}

function useAtom<T>(atom: { get: () => T; sub: (cb: () => void) => () => void }) {
  const [value, setValue] = useState<T>(() => atom.get());
  useEffect(() => {
    setValue(atom.get());
    return atom.sub(() => setValue(atom.get()));
  }, [atom]);
  return value;
}

export default function Demo2D() {
  const { scene, camera, a, b, v, sineAmp, stuckT } = useMemo(() => createScene(), []);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const view = new View2D(scene, camera.id, containerRef.current);
    return () => view.dispose();
  }, [scene, camera]);

  const aCoords = useAtom<Vec2>(a.coords);
  const bCoords = useAtom<Vec2>(b.coords);
  const vVec = useAtom<Vec2>(v.vector);
  const ampCoords = useAtom<Vec2>(sineAmp.coords);
  const stuckTValue = useAtom<number>(stuckT);

  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: "#141414", position: "relative" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          background: "rgba(0,0,0,0.7)",
          padding: "12px 16px",
          borderRadius: 8,
          color: "white",
          fontSize: 13,
          fontFamily: "monospace",
          maxWidth: 360,
          lineHeight: 1.5,
        }}
      >
        <div style={{ marginBottom: 8, fontWeight: "bold" }}>Demo 2D</div>
        <div>tomato points: drag both, line follows</div>
        <div>steelblue vec: drag tip (xy)</div>
        <div>lime vec: derived = -steelblue</div>
        <div>gold vec: x-axis drag only</div>
        <div>violet point: drag (y-only) to set sine amplitude</div>
        <div>cyan: static parametric circle</div>
        <div>orange point: stuck to curve (custom drag)</div>
        <div style={{ marginTop: 8, opacity: 0.7 }}>wheel: zoom · drag empty: pan</div>
        <div style={{ marginTop: 8 }}>
          a: ({aCoords.x.toFixed(2)}, {aCoords.y.toFixed(2)})
        </div>
        <div>b: ({bCoords.x.toFixed(2)}, {bCoords.y.toFixed(2)})</div>
        <div>v: ({vVec.x.toFixed(2)}, {vVec.y.toFixed(2)})</div>
        <div>sine amp: {ampCoords.y.toFixed(2)}</div>
        <div>stuck t: {stuckTValue.toFixed(2)}</div>
      </div>
    </div>
  );
}
