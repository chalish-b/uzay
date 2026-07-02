import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import katex from "katex";
import { Scene2D, Scene3D, curvePoint2D, functionArea2D, vec2, vec3 } from "uzay";
import { Scene2DView, Scene3DView, useAtomValue } from "uzay/react";

const a = 1.4;
const initialH = 1.8;
const xMin = -8;
const xMax = 8;
const nearZero = 1e-4;
const integralSamples = 180;

type DemoThemeMode = "light" | "dark";

type DemoTheme = {
  page: {
    background: string;
    text: string;
    heading: string;
    kicker: string;
    controlBackground: string;
    controlBorder: string;
    controlText: string;
    activeControlBackground: string;
    activeControlText: string;
    embedBorder: string;
    embedShadow: string;
  };
  scene: {
    background: string;
    grid: string;
    gridOpacity: number;
    axes: string;
    axisLabel: string;
    axisLabelShadow: string;
    curve: string;
    tangent: string;
    accent: string;
    accentSoft: string;
    projection: string;
    projectionOpacity: number;
    point: string;
    label: string;
    labelShadow: string;
    rangeLabel: string;
    integralLabel: string;
    formula: string;
    formulaShadow: string;
    areaOpacity: number;
    areaStrokeOpacity: number;
  };
};

const demoThemes: Record<DemoThemeMode, DemoTheme> = {
  light: {
    page: {
      background: "#f4f1ea",
      text: "#2b2b2b",
      heading: "#151515",
      kicker: "#6d6256",
      controlBackground: "rgba(255, 255, 255, 0.68)",
      controlBorder: "rgba(42, 35, 25, 0.14)",
      controlText: "#4f473f",
      activeControlBackground: "#202020",
      activeControlText: "#ffffff",
      embedBorder: "transparent",
      embedShadow: "none",
    },
    scene: {
      background: "transparent",
      grid: "#756d63",
      gridOpacity: 0.1,
      axes: "#5f584f",
      axisLabel: "rgba(70, 63, 54, 0.78)",
      axisLabelShadow: "none",
      curve: "rgb(28, 105, 210)",
      tangent: "rgb(24, 145, 88)",
      accent: "rgb(221, 132, 21)",
      accentSoft: "rgb(230, 157, 62)",
      projection: "#3e3933",
      projectionOpacity: 0.24,
      point: "#1d1d1d",
      label: "#1f1f1f",
      labelShadow:
        "0 1px 0 rgba(255,255,255,0.9), 0 0 5px rgba(255,255,255,0.9)",
      rangeLabel: "rgb(169, 93, 8)",
      integralLabel: "#5b3406",
      formula: "rgba(31, 31, 31, 0.92)",
      formulaShadow:
        "0 1px 0 rgba(255,255,255,0.9), 0 0 6px rgba(255,255,255,0.85)",
      areaOpacity: 0.24,
      areaStrokeOpacity: 0.76,
    },
  },
  dark: {
    page: {
      background: "#111318",
      text: "#d6d2ca",
      heading: "#f4f0e8",
      kicker: "#c2a56e",
      controlBackground: "rgba(255, 255, 255, 0.06)",
      controlBorder: "rgba(255, 255, 255, 0.13)",
      controlText: "#cfc8bc",
      activeControlBackground: "#f1eee7",
      activeControlText: "#151515",
      embedBorder: "transparent",
      embedShadow: "none",
    },
    scene: {
      background: "transparent",
      grid: "white",
      gridOpacity: 0.1,
      axes: "white",
      axisLabel: "rgba(255, 255, 255, 0.72)",
      axisLabelShadow: "0 1px 2px black, 0 0 4px black",
      curve: "rgb(79, 156, 249)",
      tangent: "rgb(58, 196, 125)",
      accent: "rgb(255, 181, 71)",
      accentSoft: "rgb(255, 214, 143)",
      projection: "white",
      projectionOpacity: 0.3,
      point: "rgb(255, 255, 255)",
      label: "white",
      labelShadow: "0 1px 2px black, 0 0 6px black",
      rangeLabel: "rgb(255, 214, 143)",
      integralLabel: "rgb(255, 244, 224)",
      formula: "rgba(255, 255, 255, 0.9)",
      formulaShadow: "0 1px 2px black, 0 0 6px black",
      areaOpacity: 0.32,
      areaStrokeOpacity: 0.75,
    },
  },
};

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

function createDerivativeScene(initialTheme: DemoTheme) {
  const scene = new Scene2D();
  const themeAtom = scene.atom(initialTheme);

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
    color: scene.atom((get) => get(themeAtom).scene.grid),
    opacity: scene.atom((get) => get(themeAtom).scene.gridOpacity),
  });

  scene.create("axes2d", {
    x: true,
    y: true,
    color: scene.atom((get) => get(themeAtom).scene.axes),
    thickness: 1.1,
    tickmarks: true,
    tickStep: "auto",
    labels: true,
    labelStyle: scene.atom(
      (get) =>
        `color: ${get(themeAtom).scene.axisLabel}; font-size: 12px; ` +
        `font-family: ui-sans-serif, system-ui, sans-serif; ` +
        `text-shadow: ${get(themeAtom).scene.axisLabelShadow};`,
    ),
    arrows: true,
  });

  scene.create("function2d", {
    f,
    domain: "infinite",
    discontinuities: [],
    color: scene.atom((get) => get(themeAtom).scene.curve),
    thickness: 3,
    pointerEvents: "none",
  });

  const pointA = scene.create("point2d", {
    coords: vec2(a, f(a)),
    color: scene.atom((get) => get(themeAtom).scene.point),
    radius: 5,
    draggable: "none",
    pointerEvents: "none",
  });

  const pointB = curvePoint2D(scene, {
    f: (x: number) => vec2(x, f(x)),
    tStart: xMin,
    tEnd: xMax,
    t: a + initialH,
    color: scene.atom((get) => get(themeAtom).scene.accent),
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
    color: scene.atom((get) => get(themeAtom).scene.tangent),
    thickness: 2,
    pointerEvents: "none",
  });

  scene.create("function2d", {
    f: scene.atom((get) => {
      const slope = get(secantSlopeAtom);
      return (x: number) => lineAtPoint(a, f(a), slope, x);
    }),
    domain: "infinite",
    color: scene.atom((get) => get(themeAtom).scene.accent),
    thickness: 3.5,
    pointerEvents: "none",
  });

  scene.create("line2d", {
    start: pointA.coords,
    end: bCoordsAtom,
    color: scene.atom((get) => get(themeAtom).scene.accentSoft),
    thickness: 1.5,
    pointerEvents: "none",
  });

  scene.create("line2d", {
    start: pointA.coords,
    end: aProjectionAtom,
    color: scene.atom((get) => get(themeAtom).scene.projection),
    opacity: scene.atom((get) => get(themeAtom).scene.projectionOpacity),
    thickness: 3,
    pointerEvents: "none",
  });

  scene.create("line2d", {
    start: bCoordsAtom,
    end: bProjectionAtom,
    color: scene.atom((get) => get(themeAtom).scene.projection),
    opacity: scene.atom((get) => get(themeAtom).scene.projectionOpacity),
    thickness: 3,
    pointerEvents: "none",
  });

  scene.create("point2d", {
    coords: aProjectionAtom,
    color: scene.atom((get) => get(themeAtom).scene.accent),
    radius: 4,
    draggable: "none",
    pointerEvents: "none",
  });

  scene.create("point2d", {
    coords: bProjectionAtom,
    color: scene.atom((get) => get(themeAtom).scene.accent),
    radius: 4,
    draggable: "none",
    pointerEvents: "none",
  });

  scene.create("line2d", {
    start: aProjectionAtom,
    end: bProjectionAtom,
    color: scene.atom((get) => get(themeAtom).scene.accentSoft),
    thickness: 3,
    pointerEvents: "none",
  });

  const pointLabelStyle = scene.atom((get) => [
    `color: ${get(themeAtom).scene.label}`,
    "font-size: 18px",
    "font-family: ui-serif, Georgia, Cambria, Times New Roman, Times, serif",
    "font-weight: 600",
    `text-shadow: ${get(themeAtom).scene.labelShadow}`,
    "white-space: nowrap",
  ].join(";"));

  const hLabelStyle = scene.atom((get) => [
    `color: ${get(themeAtom).scene.rangeLabel}`,
    "font-size: 15px",
    "font-family: ui-serif, Georgia, Cambria, Times New Roman, Times, serif",
    `text-shadow: ${get(themeAtom).scene.labelShadow}`,
    "white-space: nowrap",
  ].join(";"));

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
    themeAtom,
    secantSlopeAtom,
    tangentSlope,
  };
}

function createIntegralScene(initialTheme: DemoTheme) {
  const scene = new Scene2D();
  const themeAtom = scene.atom(initialTheme);

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
    color: scene.atom((get) => get(themeAtom).scene.grid),
    opacity: scene.atom((get) => get(themeAtom).scene.gridOpacity),
  });

  scene.create("axes2d", {
    x: true,
    y: true,
    color: scene.atom((get) => get(themeAtom).scene.axes),
    thickness: 1.1,
    tickmarks: true,
    tickStep: "auto",
    labels: true,
    labelStyle: scene.atom(
      (get) =>
        `color: ${get(themeAtom).scene.axisLabel}; font-size: 12px; ` +
        `font-family: ui-sans-serif, system-ui, sans-serif; ` +
        `text-shadow: ${get(themeAtom).scene.axisLabelShadow};`,
    ),
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
    color: scene.atom((get) => get(themeAtom).scene.accent),
    opacity: scene.atom((get) => get(themeAtom).scene.areaOpacity),
    strokeColor: scene.atom((get) => get(themeAtom).scene.accentSoft),
    strokeOpacity: scene.atom((get) => get(themeAtom).scene.areaStrokeOpacity),
    strokeThickness: 1.6,
  });

  scene.create("function2d", {
    f: integralFunction,
    domain: "infinite",
    discontinuities: [],
    color: scene.atom((get) => get(themeAtom).scene.curve),
    thickness: 3,
    pointerEvents: "none",
  });

  scene.create("line2d", {
    start: aCoords,
    end: aCurveCoordsAtom,
    color: scene.atom((get) => get(themeAtom).scene.projection),
    opacity: scene.atom((get) => get(themeAtom).scene.projectionOpacity),
    thickness: 3,
    pointerEvents: "none",
  });

  scene.create("line2d", {
    start: bCoords,
    end: bCurveCoordsAtom,
    color: scene.atom((get) => get(themeAtom).scene.projection),
    opacity: scene.atom((get) => get(themeAtom).scene.projectionOpacity),
    thickness: 3,
    pointerEvents: "none",
  });

  scene.create("line2d", {
    start: scene.atom((get) => vec2(get(sortedAAtom), 0)),
    end: scene.atom((get) => vec2(get(sortedBAtom), 0)),
    color: scene.atom((get) => get(themeAtom).scene.accentSoft),
    opacity: 1,
    thickness: 3,
    pointerEvents: "none",
  });

  scene.create("point2d", {
    coords: aCurveCoordsAtom,
    color: scene.atom((get) => get(themeAtom).scene.point),
    radius: 4.5,
    draggable: "none",
    pointerEvents: "none",
  });

  scene.create("point2d", {
    coords: bCurveCoordsAtom,
    color: scene.atom((get) => get(themeAtom).scene.point),
    radius: 4.5,
    draggable: "none",
    pointerEvents: "none",
  });

  const aPoint = scene.create("point2d", {
    coords: aCoords,
    color: scene.atom((get) => get(themeAtom).scene.accent),
    radius: 7,
    draggable: "x",
  });

  const bPoint = scene.create("point2d", {
    coords: bCoords,
    color: scene.atom((get) => get(themeAtom).scene.accent),
    radius: 7,
    draggable: "x",
  });

  const labelStyle = scene.atom((get) => [
    `color: ${get(themeAtom).scene.label}`,
    "font-size: 17px",
    "font-family: ui-serif, Georgia, Cambria, Times New Roman, Times, serif",
    "font-weight: 600",
    `text-shadow: ${get(themeAtom).scene.labelShadow}`,
    "white-space: nowrap",
  ].join(";"));

  const integralStyle = scene.atom((get) => [
    `color: ${get(themeAtom).scene.integralLabel}`,
    "font-size: 19px",
    "font-family: ui-serif, Georgia, Cambria, Times New Roman, Times, serif",
    "font-weight: 700",
    `text-shadow: ${get(themeAtom).scene.labelShadow}`,
    "white-space: nowrap",
  ].join(";"));

  const rangeStyle = scene.atom((get) => [
    `color: ${get(themeAtom).scene.rangeLabel}`,
    "font-size: 14px",
    "font-family: ui-serif, Georgia, Cambria, Times New Roman, Times, serif",
    `text-shadow: ${get(themeAtom).scene.labelShadow}`,
    "white-space: nowrap",
  ].join(";"));

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
    themeAtom,
    integralValueAtom,
    aAtom,
    bAtom,
  };
}

// Touch-scroll test: a 2D scene whose camera has panning disabled. Drag-to-pan
// is off; dragging the point and pinch-zoom stay on.
function createPanDisabledScene(initialTheme: DemoTheme) {
  const scene = new Scene2D();
  const themeAtom = scene.atom(initialTheme);

  const camera = scene.create("camera2d", {
    center: vec2(0, 0),
    zoom: 1.5,
    enablePan: false,
    enableZoom: true,
  });

  scene.create("grid2d", {
    rangeX: true,
    rangeY: true,
    gap: "auto",
    color: scene.atom((get) => get(themeAtom).scene.grid),
    opacity: scene.atom((get) => get(themeAtom).scene.gridOpacity),
  });

  scene.create("axes2d", {
    x: true,
    y: true,
    color: scene.atom((get) => get(themeAtom).scene.axes),
    thickness: 1.1,
    tickmarks: true,
    tickStep: "auto",
    arrows: true,
  });

  scene.create("point2d", {
    coords: vec2(1.4, 1.0),
    color: scene.atom((get) => get(themeAtom).scene.accent),
    radius: 7,
    draggable: "xy",
  });

  return { scene, camera, themeAtom };
}

// Touch-scroll test: a 3D scene whose camera has orbiting disabled. One-finger
// orbit is off; two-finger pan/zoom stay on.
function createOrbitDisabledScene(initialTheme: DemoTheme) {
  const scene = new Scene3D();
  const themeAtom = scene.atom(initialTheme);

  const camera = scene.create("camera3d", {
    position: vec3(7, 5, 7),
    lookAt: vec3(0, 0, 0),
    fov: 55,
    enableOrbit: false,
    enablePan: true,
    enableZoom: true,
  });

  scene.create("axes3d", {
    x: [-5, 5],
    y: [-5, 5],
    z: [-5, 5],
    thickness: 0.7,
    color: scene.atom((get) => get(themeAtom).scene.axes),
  });

  scene.create("grid3d", {
    plane: "xz",
    range1: [-5, 5],
    range2: [-5, 5],
    thickness: 2,
    color: scene.atom((get) => get(themeAtom).scene.grid),
    opacity: scene.atom((get) => get(themeAtom).scene.gridOpacity),
  });

  scene.create("sphere3d", {
    center: vec3(0, 1.6, 0),
    radius: 1.6,
    color: scene.atom((get) => get(themeAtom).scene.accent),
  });

  return { scene, camera, themeAtom };
}

function EmbeddedScene({
  children,
  theme,
  height = 480,
}: {
  children: ReactNode;
  theme: DemoTheme;
  height?: number;
}) {
  return (
    <div
      className="article-embed"
      style={{
        height,
        width: "min(100%, 760px)",
        margin: "24px auto",
        background: theme.scene.background,
        borderColor: theme.page.embedBorder,
        boxShadow: theme.page.embedShadow,
      }}
    >
      {children}
    </div>
  );
}

function IntegralAreaEmbed({ theme }: { theme: DemoTheme }) {
  const { scene, camera, themeAtom, integralValueAtom, aAtom, bAtom } = useMemo(
    () => createIntegralScene(theme),
    [],
  );

  useEffect(() => {
    themeAtom.set(theme);
  }, [theme, themeAtom]);

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
    <EmbeddedScene theme={theme}>
      <Scene2DView scene={scene} camera={camera} style={{ width: "100%", height: "100%" }} />
      <div
        style={{
          position: "absolute",
          top: 18,
          left: 20,
          color: theme.scene.formula,
          fontSize: 14,
          lineHeight: 1.35,
          textShadow: theme.scene.formulaShadow,
          pointerEvents: "none",
        }}
        dangerouslySetInnerHTML={{ __html: formulaHtml }}
      />
    </EmbeddedScene>
  );
}

function SecantDerivativeEmbed({ theme }: { theme: DemoTheme }) {
  const { scene, camera, themeAtom, secantSlopeAtom, tangentSlope } = useMemo(
    () => createDerivativeScene(theme),
    [],
  );

  useEffect(() => {
    themeAtom.set(theme);
  }, [theme, themeAtom]);

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
    <EmbeddedScene theme={theme}>
      <Scene2DView scene={scene} camera={camera} style={{ width: "100%", height: "100%" }} />
      <div
        style={{
          position: "absolute",
          top: 18,
          left: 20,
          color: theme.scene.formula,
          fontSize: 14,
          lineHeight: 1.35,
          textShadow: theme.scene.formulaShadow,
          pointerEvents: "none",
        }}
        dangerouslySetInnerHTML={{ __html: formulaHtml }}
      />
    </EmbeddedScene>
  );
}

function PanDisabledEmbed({ theme }: { theme: DemoTheme }) {
  const { scene, camera, themeAtom } = useMemo(
    () => createPanDisabledScene(theme),
    [],
  );

  useEffect(() => {
    themeAtom.set(theme);
  }, [theme, themeAtom]);

  return (
    <EmbeddedScene theme={theme} height={360}>
      <Scene2DView scene={scene} camera={camera} style={{ width: "100%", height: "100%" }} />
    </EmbeddedScene>
  );
}

function OrbitDisabledEmbed({ theme }: { theme: DemoTheme }) {
  const { scene, camera, themeAtom } = useMemo(
    () => createOrbitDisabledScene(theme),
    [],
  );

  useEffect(() => {
    themeAtom.set(theme);
  }, [theme, themeAtom]);

  return (
    <EmbeddedScene theme={theme} height={360}>
      <Scene3DView scene={scene} camera={camera} style={{ width: "100%", height: "100%" }} />
    </EmbeddedScene>
  );
}

export default function Demo12() {
  const [themeMode, setThemeMode] = useState<DemoThemeMode>("light");
  const theme = demoThemes[themeMode];
  const themeStyles = {
    "--article-heading": theme.page.heading,
    "--article-text": theme.page.text,
    "--article-kicker": theme.page.kicker,
  } as CSSProperties;

  return (
    <main
      className="article-page"
      style={{
        ...themeStyles,
        background: theme.page.background,
        color: theme.page.text,
      }}
    >
      <article className="article-shell">
        <div className="article-topbar">
          <p className="article-kicker">Derivative intuition</p>
          <div
            className="theme-toggle"
            style={{
              background: theme.page.controlBackground,
              borderColor: theme.page.controlBorder,
            }}
          >
            {(["light", "dark"] as DemoThemeMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={themeMode === mode}
                onClick={() => setThemeMode(mode)}
                style={{
                  background:
                    themeMode === mode ? theme.page.activeControlBackground : "transparent",
                  color:
                    themeMode === mode ? theme.page.activeControlText : theme.page.controlText,
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        <h1>From secant slope to tangent slope</h1>
        <p>
          Pick a fixed point A on a smooth curve, then place another point B nearby on the
          same curve. The line through the two points measures the average rate of change
          over the horizontal step h.
        </p>

        <SecantDerivativeEmbed theme={theme} />

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

        <IntegralAreaEmbed theme={theme} />

        <p>
          The shaded region is built from sampled points on the curve, then closed back down to
          the x-axis. The value shown inside the region is recomputed from the same interval.
        </p>

        <h2>Touch scrolling test</h2>
        <p>
          On a touchscreen, try to scroll the page by dragging up and down directly over each
          figure below. The 2D figure has panning disabled, and the 3D figure has orbiting
          disabled, so a one-finger drag has nothing to do inside the scene.
        </p>

        <PanDisabledEmbed theme={theme} />

        <p>
          The point above is still draggable, and a two-finger gesture still zooms (and, in 3D,
          pans). The question is whether a one-finger drag over empty space lets the page scroll
          past the figure, or gets swallowed.
        </p>

        <OrbitDisabledEmbed theme={theme} />

        <p>
          Same question for 3D: with orbiting off, does a one-finger drag over the scene scroll
          the article, or does it stick?
        </p>
      </article>
    </main>
  );
}
