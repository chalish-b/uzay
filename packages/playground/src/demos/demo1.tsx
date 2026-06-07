import { useMemo } from "react";
import type { ReactNode } from "react";
import { Scene2D, curvePoint2D, vec2 } from "uzay";
import { Scene2DView } from "uzay/react";

const a = 1.4;
const initialH = 1.8;
const xMin = -8;
const xMax = 8;
const nearZero = 1e-4;

function f(x: number) {
  return 0.25 * x * x - 0.3 * x + 0.4;
}

function derivative(x: number) {
  return 0.5 * x - 0.3;
}

function lineAtPoint(pointX: number, pointY: number, slope: number, x: number) {
  return pointY + slope * (x - pointX);
}

function fmt(value: number) {
  return value.toFixed(2);
}

function createDerivativeScene() {
  const scene = new Scene2D();

  const camera = scene.create("camera2d", {
    center: vec2(1.25, 1.0),
    zoom: 1.65,
    enablePan: false,
    enableZoom: false,
  });

  scene.create("grid2d", {
    rangeX: [-8, 8],
    rangeY: [-5, 7],
    gap: 1,
    color: "white",
    opacity: 0.12,
  });

  scene.create("axes2d", {
    x: [-8, 8],
    y: [-5, 7],
    color: "white",
    thickness: 1.1,
    tickmarks: true,
    tickStep: 1,
    arrows: true,
  });

  scene.create("parametricfunction2d", {
    f: (x: number) => vec2(x, f(x)),
    tStart: xMin,
    tEnd: xMax,
    samples: 240,
    color: "rgb(79, 156, 249)",
    thickness: 3,
    pointerEvents: "none",
  });

  const pointA = scene.create("point2d", {
    coords: vec2(a, f(a)),
    color: "rgb(255, 255, 255)",
    radius: 5,
    draggable: "none",
    pointerEvents: "none",
  });

  const pointB = curvePoint2D(scene, {
    f: (x: number) => vec2(x, f(x)),
    tStart: xMin,
    tEnd: xMax,
    initialT: a + initialH,
    color: "rgb(255, 181, 71)",
  });
  pointB.point.radius.set(6);

  const hAtom = scene.atom((get) => get(pointB.t) - a);

  const bCoordsAtom = scene.atom((get) => {
    const x = get(pointB.t);
    return vec2(x, f(x));
  });

  const aProjectionAtom = scene.atom(vec2(a, 0));

  const bProjectionAtom = scene.atom((get) => {
    const b = get(bCoordsAtom);
    return vec2(b.x, 0);
  });

  const secantSlopeAtom = scene.atom((get) => {
    const h = get(hAtom);
    if (Math.abs(h) < nearZero) return derivative(a);
    return (f(a + h) - f(a)) / h;
  });

  const secantStartAtom = scene.atom((get) => {
    const slope = get(secantSlopeAtom);
    return vec2(xMin, lineAtPoint(a, f(a), slope, xMin));
  });

  const secantEndAtom = scene.atom((get) => {
    const slope = get(secantSlopeAtom);
    return vec2(xMax, lineAtPoint(a, f(a), slope, xMax));
  });

  const hLabelPositionAtom = scene.atom((get) => {
    const b = get(bCoordsAtom);
    return vec2((a + b.x) / 2, -0.18);
  });

  const hLabelAtom = scene.atom((get) => {
    const h = get(hAtom);
    return String.raw`h=${fmt(h)}`;
  });

  const tangentSlope = derivative(a);

  const slopeLabelAtom = scene.atom((get) => {
    const slope = get(secantSlopeAtom);
    return String.raw`\begin{aligned}\frac{f(a+h)-f(a)}{h}&=${slope.toFixed(3)}\\ f'(a)&=${tangentSlope.toFixed(3)}\end{aligned}`;
  });

  scene.create("line2d", {
    start: vec2(xMin, lineAtPoint(a, f(a), tangentSlope, xMin)),
    end: vec2(xMax, lineAtPoint(a, f(a), tangentSlope, xMax)),
    color: "rgb(58, 196, 125)",
    thickness: 2,
    pointerEvents: "none",
  });

  scene.create("line2d", {
    start: secantStartAtom,
    end: secantEndAtom,
    color: "rgb(255, 181, 71)",
    thickness: 3.5,
    pointerEvents: "none",
  });

  scene.create("line2d", {
    start: pointA.coords,
    end: bCoordsAtom,
    color: "rgb(255, 214, 143)",
    thickness: 1.5,
    pointerEvents: "none",
  });

  scene.create("line2d", {
    start: pointA.coords,
    end: aProjectionAtom,
    color: "white",
    opacity: 0.45,
    thickness: 1.2,
    pointerEvents: "none",
  });

  scene.create("line2d", {
    start: bCoordsAtom,
    end: bProjectionAtom,
    color: "white",
    opacity: 0.45,
    thickness: 1.2,
    pointerEvents: "none",
  });

  scene.create("line2d", {
    start: aProjectionAtom,
    end: bProjectionAtom,
    color: "rgb(255, 214, 143)",
    thickness: 2,
    pointerEvents: "none",
  });

  const pointLabelStyle = [
    "color: white",
    "font-size: 18px",
    "font-family: ui-serif, Georgia, Cambria, Times New Roman, Times, serif",
    "font-weight: 600",
    "text-shadow: 0 1px 2px black, 0 0 6px black",
    "white-space: nowrap",
  ].join(";");

  const hLabelStyle = [
    "color: rgb(255, 214, 143)",
    "font-size: 15px",
    "font-family: ui-serif, Georgia, Cambria, Times New Roman, Times, serif",
    "text-shadow: 0 1px 2px black, 0 0 6px black",
    "white-space: nowrap",
  ].join(";");

  const formulaLabelStyle = [
    "color: rgba(255, 255, 255, 0.9)",
    "font-size: 14px",
    "line-height: 1.35",
    "text-shadow: 0 1px 2px black, 0 0 6px black",
    "white-space: nowrap",
  ].join(";");

  scene.create("overlay2d", {
    position: pointA.coords,
    content: String.raw`A`,
    format: "latex",
    offset: vec2(-4, -4),
    anchor: "bottom-right",
    style: pointLabelStyle,
  });

  scene.create("overlay2d", {
    position: bCoordsAtom,
    content: String.raw`B`,
    format: "latex",
    offset: vec2(4, -4),
    anchor: "bottom-left",
    style: pointLabelStyle,
  });

  scene.create("overlay2d", {
    position: hLabelPositionAtom,
    content: hLabelAtom,
    format: "latex",
    offset: vec2(0, 0),
    anchor: "top",
    style: hLabelStyle,
  });

  scene.create("overlay2d", {
    position: vec2(-3.25, 3.65),
    content: slopeLabelAtom,
    format: "latex",
    offset: vec2(0, 0),
    anchor: "top-left",
    style: formulaLabelStyle,
  });

  return {
    scene,
    camera,
  };
}

function EmbeddedScene({
  children,
  height = 480,
}: {
  children: ReactNode;
  height?: number;
}) {
  return (
    <div className="article-embed" style={{ height, width: "min(100%, 760px)", margin: "24px auto" }}>
      {children}
    </div>
  );
}

function SecantDerivativeEmbed() {
  const { scene, camera } = useMemo(
    () => createDerivativeScene(),
    [],
  );

  return (
    <EmbeddedScene>
      <Scene2DView scene={scene} camera={camera} style={{ width: "100%", height: "100%" }} />
    </EmbeddedScene>
  );
}

export default function Demo1() {
  return (
    <main className="article-page">
      <article className="article-shell">
        <p className="article-kicker">Derivative intuition</p>
        <h1>From secant slope to tangent slope</h1>
        <p>
          Pick a fixed point A on a smooth curve, then place another point B nearby on the
          same curve. The line through the two points measures the average rate of change
          over the horizontal step h.
        </p>

        <SecantDerivativeEmbed />

        <p>
          Drag B along the graph toward A. As h gets smaller, the secant line rotates around
          A and its slope approaches the slope of the green tangent line.
        </p>

        <p>
          In symbols, the changing orange line has slope (f(a+h) - f(a)) / h. The derivative
          f&apos;(a) is the limiting value this slope approaches as h tends to zero.
        </p>
      </article>
    </main>
  );
}
