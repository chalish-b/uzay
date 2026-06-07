import { useMemo } from "react";
import type { ReactNode } from "react";
import katex from "katex";
import { Scene2D, curvePoint2D, functionArea2D, vec2 } from "uzay";
import { Scene2DView, useAtomValue } from "uzay/react";

const a = 1.4;
const initialH = 1.8;
const xMin = -8;
const xMax = 8;
const nearZero = 1e-4;
const integralSamples = 180;

function f(x: number) {
  return 0.25 * x * x - 0.3 * x + 0.4;
}

function derivative(x: number) {
  return 0.5 * x - 0.3;
}

function integralFunction(x: number) {
  return 0.18 * (x + 0.6) * (x + 0.6) + 0.65 + 0.35 * Math.sin(1.4 * x);
}

function lineAtPoint(pointX: number, pointY: number, slope: number, x: number) {
  return pointY + slope * (x - pointX);
}

function integrateIntegralFunction(start: number, end: number) {
  if (start === end) return 0;

  const left = Math.min(start, end);
  const right = Math.max(start, end);
  const width = right - left;
  let sum = 0;

  for (let i = 0; i < integralSamples; i++) {
    const x0 = left + (width * i) / integralSamples;
    const x1 = left + (width * (i + 1)) / integralSamples;
    sum += ((integralFunction(x0) + integralFunction(x1)) / 2) * (x1 - x0);
  }

  return start <= end ? sum : -sum;
}

function createDerivativeScene() {
  const scene = new Scene2D();

  const camera = scene.create("camera2d", {
    center: vec2(1.25, 1.0),
    zoom: 1.65,
    enablePan: true,
    enableZoom: true,
  });

  scene.create("grid2d", {
    rangeX: true,
    rangeY: true,
    gap: "auto",
    color: "white",
    opacity: 0.12,
  });

  scene.create("axes2d", {
    x: true,
    y: true,
    color: "white",
    thickness: 1.1,
    tickmarks: true,
    tickStep: "auto",
    labels: true,
    labelStyle: "color: rgba(255, 255, 255, 0.72); font-size: 12px;",
    arrows: true,
  });

  scene.create("function2d", {
    f,
    domain: "infinite",
    discontinuities: [],
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

  const hLabelPositionAtom = scene.atom((get) => {
    const b = get(bCoordsAtom);
    return vec2((a + b.x) / 2, -0.18);
  });

  const hLabelAtom = scene.atom((get) => {
    const h = get(hAtom);
    return String.raw`h=${h.toFixed(2)}`;
  });

  const tangentSlope = derivative(a);

  scene.create("function2d", {
    f: (x: number) => lineAtPoint(a, f(a), tangentSlope, x),
    domain: "infinite",
    samples: 32,
    color: "rgb(58, 196, 125)",
    thickness: 2,
    pointerEvents: "none",
  });

  scene.create("function2d", {
    f: scene.atom((get) => {
      const slope = get(secantSlopeAtom);
      return (x: number) => lineAtPoint(a, f(a), slope, x);
    }),
    domain: "infinite",
    samples: 32,
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
    opacity: 0.3,
    thickness: 3,
    pointerEvents: "none",
  });

  scene.create("line2d", {
    start: bCoordsAtom,
    end: bProjectionAtom,
    color: "white",
    opacity: 0.3,
    thickness: 3,
    pointerEvents: "none",
  });

  scene.create("point2d", {
    coords: aProjectionAtom,
    color: "rgb(255, 181, 71)",
    radius: 4,
    draggable: "none",
    pointerEvents: "none",
  })

  scene.create("point2d", {
    coords: bProjectionAtom,
    color: "rgb(255, 181, 71)",
    radius: 4,
    draggable: "none",
    pointerEvents: "none",
  })

  scene.create("line2d", {
    start: aProjectionAtom,
    end: bProjectionAtom,
    color: "rgb(255, 214, 143)",
    thickness: 3,
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

  return {
    scene,
    camera,
    secantSlopeAtom,
    tangentSlope,
  };
}

function createIntegralScene() {
  const scene = new Scene2D();

  const camera = scene.create("camera2d", {
    center: vec2(0.3, 1.25),
    zoom: 1.35,
    enablePan: true,
    enableZoom: true,
  });

  scene.create("grid2d", {
    rangeX: true,
    rangeY: true,
    gap: "auto",
    color: "white",
    opacity: 0.12,
  });

  scene.create("axes2d", {
    x: true,
    y: true,
    color: "white",
    thickness: 1.1,
    tickmarks: true,
    tickStep: "auto",
    labels: true,
    labelStyle: "color: rgba(255, 255, 255, 0.72); font-size: 12px;",
    arrows: true,
  });

  const aCoords = scene.atom(vec2(-2.4, 0));
  const bCoords = scene.atom(vec2(2.2, 0));
  const aAtom = scene.atom((get) => get(aCoords).x);
  const bAtom = scene.atom((get) => get(bCoords).x);

  const sortedAAtom = scene.atom((get) => Math.min(get(aAtom), get(bAtom)));
  const sortedBAtom = scene.atom((get) => Math.max(get(aAtom), get(bAtom)));

  const aCurveCoordsAtom = scene.atom((get) => {
    const x = get(aAtom);
    return vec2(x, integralFunction(x));
  });

  const bCurveCoordsAtom = scene.atom((get) => {
    const x = get(bAtom);
    return vec2(x, integralFunction(x));
  });

  const integralValueAtom = scene.atom((get) => (
    integrateIntegralFunction(get(aAtom), get(bAtom))
  ));

  const labelPositionAtom = scene.atom((get) => {
    const left = get(sortedAAtom);
    const right = get(sortedBAtom);
    const mid = (left + right) / 2;
    return vec2(mid, Math.max(0.3, integralFunction(mid) * 0.45));
  });

  const integralLabelAtom = scene.atom((get) => {
    return get(integralValueAtom).toFixed(2);
  });

  const rangeLabelPositionAtom = scene.atom((get) => {
    const left = get(sortedAAtom);
    const right = get(sortedBAtom);
    return vec2((left + right) / 2, -0.18);
  });

  const rangeLabelAtom = scene.atom((get) => {
    const width = get(bAtom) - get(aAtom);
    return String.raw`b-a=${width.toFixed(2)}`;
  });

  functionArea2D(scene, {
    f: integralFunction,
    a: aAtom,
    b: bAtom,
    baseline: 0,
    samples: integralSamples,
    color: "rgb(255, 181, 71)",
    opacity: 0.32,
    strokeColor: "rgb(255, 214, 143)",
    strokeOpacity: 0.75,
    strokeThickness: 1.6,
  });

  scene.create("function2d", {
    f: integralFunction,
    domain: "infinite",
    discontinuities: [],
    samples: 260,
    color: "rgb(79, 156, 249)",
    thickness: 3,
    pointerEvents: "none",
  });

  scene.create("line2d", {
    start: aCoords,
    end: aCurveCoordsAtom,
    color: "white",
    opacity: 0.34,
    thickness: 3,
    pointerEvents: "none",
  });

  scene.create("line2d", {
    start: bCoords,
    end: bCurveCoordsAtom,
    color: "white",
    opacity: 0.34,
    thickness: 3,
    pointerEvents: "none",
  });

  scene.create("line2d", {
    start: scene.atom((get) => vec2(get(sortedAAtom), 0)),
    end: scene.atom((get) => vec2(get(sortedBAtom), 0)),
    color: "rgb(255, 214, 143)",
    opacity: 1,
    thickness: 3,
    pointerEvents: "none",
  });

  scene.create("point2d", {
    coords: aCurveCoordsAtom,
    color: "rgb(255, 255, 255)",
    radius: 4.5,
    draggable: "none",
    pointerEvents: "none",
  });

  scene.create("point2d", {
    coords: bCurveCoordsAtom,
    color: "rgb(255, 255, 255)",
    radius: 4.5,
    draggable: "none",
    pointerEvents: "none",
  });

  const aPoint = scene.create("point2d", {
    coords: aCoords,
    color: "rgb(255, 181, 71)",
    radius: 7,
    draggable: "x",
  });

  const bPoint = scene.create("point2d", {
    coords: bCoords,
    color: "rgb(255, 181, 71)",
    radius: 7,
    draggable: "x",
  });

  const labelStyle = [
    "color: white",
    "font-size: 17px",
    "font-family: ui-serif, Georgia, Cambria, Times New Roman, Times, serif",
    "font-weight: 600",
    "text-shadow: 0 1px 2px black, 0 0 6px black",
    "white-space: nowrap",
  ].join(";");

  const integralStyle = [
    "color: rgb(255, 244, 224)",
    "font-size: 19px",
    "font-family: ui-serif, Georgia, Cambria, Times New Roman, Times, serif",
    "font-weight: 700",
    "text-shadow: 0 1px 2px black, 0 0 8px black",
    "white-space: nowrap",
  ].join(";");

  const rangeStyle = [
    "color: rgb(255, 214, 143)",
    "font-size: 14px",
    "font-family: ui-serif, Georgia, Cambria, Times New Roman, Times, serif",
    "text-shadow: 0 1px 2px black, 0 0 6px black",
    "white-space: nowrap",
  ].join(";");

  scene.create("overlay2d", {
    position: aPoint.coords,
    content: String.raw`a`,
    format: "latex",
    offset: vec2(0, 10),
    anchor: "top",
    style: labelStyle,
  });

  scene.create("overlay2d", {
    position: bPoint.coords,
    content: String.raw`b`,
    format: "latex",
    offset: vec2(0, 10),
    anchor: "top",
    style: labelStyle,
  });

  scene.create("overlay2d", {
    position: labelPositionAtom,
    content: integralLabelAtom,
    format: "latex",
    offset: vec2(0, 0),
    anchor: "center",
    style: integralStyle,
  });

  scene.create("overlay2d", {
    position: rangeLabelPositionAtom,
    content: rangeLabelAtom,
    format: "latex",
    offset: vec2(0, 0),
    anchor: "top",
    style: rangeStyle,
  });

  return {
    scene,
    camera,
    integralValueAtom,
    aAtom,
    bAtom,
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

function IntegralAreaEmbed() {
  const { scene, camera, integralValueAtom, aAtom, bAtom } = useMemo(
    () => createIntegralScene(),
    [],
  );
  const integralValue = useAtomValue(integralValueAtom);
  const currentA = useAtomValue(aAtom);
  const currentB = useAtomValue(bAtom);
  const formulaHtml = useMemo(
    () => katex.renderToString(
      String.raw`\begin{array}{l}a=${currentA.toFixed(2)}\\ b=${currentB.toFixed(2)}\\ \displaystyle\int_a^b f(x)\,dx=${integralValue.toFixed(2)}\end{array}`,
      {
        throwOnError: false,
        displayMode: true,
    },
    ),
    [currentA, currentB, integralValue],
  );

  return (
    <EmbeddedScene>
      <Scene2DView scene={scene} camera={camera} style={{ width: "100%", height: "100%" }} />
      <div
        style={{
          position: "absolute",
          top: 18,
          left: 20,
          color: "rgba(255, 255, 255, 0.9)",
          fontSize: 14,
          lineHeight: 1.35,
          textShadow: "0 1px 2px black, 0 0 6px black",
          pointerEvents: "none",
        }}
        dangerouslySetInnerHTML={{ __html: formulaHtml }}
      />
    </EmbeddedScene>
  );
}

function SecantDerivativeEmbed() {
  const { scene, camera, secantSlopeAtom, tangentSlope } = useMemo(
    () => createDerivativeScene(),
    [],
  );
  const secantSlope = useAtomValue(secantSlopeAtom);
  const formulaHtml = useMemo(
    () => katex.renderToString(
      String.raw`\begin{aligned}\frac{f(a+h)-f(a)}{h}&=${secantSlope.toFixed(3)}\\ f'(a)&=${tangentSlope.toFixed(3)}\end{aligned}`,
      {
        throwOnError: false,
        displayMode: true,
      },
    ),
    [secantSlope, tangentSlope],
  );

  return (
    <EmbeddedScene>
      <Scene2DView scene={scene} camera={camera} style={{ width: "100%", height: "100%" }} />
      <div
        style={{
          position: "absolute",
          top: 18,
          left: 20,
          color: "rgba(255, 255, 255, 0.9)",
          fontSize: 14,
          lineHeight: 1.35,
          textShadow: "0 1px 2px black, 0 0 6px black",
          pointerEvents: "none",
        }}
        dangerouslySetInnerHTML={{ __html: formulaHtml }}
      />
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

        <h2>Accumulating area under a curve</h2>
        <p>
          A definite integral tracks the signed accumulation between two x-values. Move the
          handles on the x-axis to change the interval and watch the highlighted region update.
        </p>

        <IntegralAreaEmbed />

        <p>
          The shaded region is built from sampled points on the curve, then closed back down to
          the x-axis. The value shown inside the region is recomputed from the same interval.
        </p>
      </article>
    </main>
  );
}
