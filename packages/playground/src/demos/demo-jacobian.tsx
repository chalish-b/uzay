import { useMemo, type CSSProperties } from "react";
import katex from "katex";
import {
  Scene2D,
  transformedGrid2D,
  vec2,
  type Vec2,
  type WritableBoundAtom,
} from "uzay";
import { Scene2DView, useAtomState, useAtomValue } from "uzay/react";

// The Jacobian conjecture, hands on.
//
// A polynomial map F: R^2 -> R^2 is applied to the coordinate grid: every
// grid line is rendered as a parametric curve s -> F_t(c, s), where
// F_t = (1 - t) * id + t * F and t is the morph slider. A draggable probe
// point p carries a little parallelogram spanned by the columns of the
// Jacobian at p (computed numerically), so det J is visible as the
// parallelogram's signed area: green preserves orientation, red is flipped.
//
// Five presets walk through the story:
// - Linear: det J is the same number everywhere, invertible iff nonzero
// - Shear: nonlinear, det J = 1 everywhere, polynomial inverse
// - Shear-then-shear: wild picture, still det J = 1, still a bijection
// - Fold: det J varies, vanishes on two lines, the plane folds (no inverse)
// - z^2: det J = 0 only at the origin, yet the map is 2-to-1
//
// The grid is the library's transformedGrid2D construction; the numeric
// Jacobian probe is demo-specific and lives in this file.

const EXTENT = 4;
const GRID_STEP = 0.5;
const PROBE_HOME = vec2(1.5, 1);
// Side length of the probe square before the Jacobian is applied to it.
const PAR_SIZE = 0.75;

const COLORS = {
  horizontal: "#38bdf8",
  vertical: "#a78bfa",
  probe: "#fbbf24",
  image: "#f8fafc",
  detPositive: "#34d399",
  detNegative: "#f87171",
  detZero: "#fbbf24",
  critical: "#f87171",
};

type ParamSpec = {
  label: string;
  min: number;
  max: number;
  step: number;
  initial: number;
};

type Preset = {
  key: string;
  // Title and explainer may contain $...$ inline math; formula and detText
  // are full LaTeX strings.
  title: string;
  formula: string;
  params: ParamSpec[];
  makeF: (p: number[]) => (x: number, y: number) => Vec2;
  detText: (p: number[]) => string;
  // For maps whose det J vanishes on vertical lines x = ±x0: returns x0,
  // or null when there is no critical line for the current params.
  criticalX?: (p: number[]) => number | null;
  explainer: string;
};

const PRESETS: Preset[] = [
  {
    key: "linear",
    title: "Linear",
    formula: String.raw`F(x, y) = (a\,x + b\,y,\; c\,x + d\,y)`,
    params: [
      { label: "a", min: -2, max: 2, step: 0.05, initial: 1 },
      { label: "b", min: -2, max: 2, step: 0.05, initial: -0.6 },
      { label: "c", min: -2, max: 2, step: 0.05, initial: 0.6 },
      { label: "d", min: -2, max: 2, step: 0.05, initial: 1 },
    ],
    makeF: ([a, b, c, d]) => (x, y) => vec2(a * x + b * y, c * x + d * y),
    detText: ([a, b, c, d]) =>
      String.raw`\det J = a\,d - b\,c = ${(a * d - b * c).toFixed(2)}\ \text{(constant)}`,
    explainer: String.raw`A linear map treats every point the same way: $\det J = a\,d - b\,c$ everywhere, so every cell of the grid scales by the same area factor. Nonzero determinant means invertible, with a linear inverse. Push $a\,d - b\,c$ to $0$ and watch the plane collapse onto a line. The conjecture asks whether this clean picture extends to polynomial maps.`,
  },
  {
    key: "shear",
    title: "Shear",
    formula: String.raw`F(x, y) = (x + a\,y^2,\; y)`,
    params: [{ label: "a", min: -1, max: 1, step: 0.02, initial: 0.5 }],
    makeF: ([a]) => (x, y) => vec2(x + a * y * y, y),
    detText: () => String.raw`\det J = 1\ \text{(constant)}`,
    explainer: String.raw`Each horizontal line slides sideways by $a\,y^2$. The grid bends, but $\det J$ is exactly $1$ at every point: cells tilt without changing area, and nothing ever folds. The inverse is again polynomial: $(x - a\,y^2,\ y)$. Move the probe around, the parallelogram tilts but keeps its area.`,
  },
  {
    key: "double",
    title: String.raw`Shear $\circ$ Shear`,
    formula: String.raw`F(x, y) = (u,\; y + b\,u^2), \quad u = x + a\,y^2`,
    params: [
      { label: "a", min: -0.6, max: 0.6, step: 0.02, initial: 0.25 },
      { label: "b", min: -0.6, max: 0.6, step: 0.02, initial: 0.15 },
    ],
    makeF: ([a, b]) => (x, y) => {
      const u = x + a * y * y;
      return vec2(u, y + b * u * u);
    },
    detText: () => String.raw`\det J = 1\ \text{(constant)}`,
    explainer: String.raw`A horizontal shear followed by a vertical one. The grid gets wild, but $\det J$ is still exactly $1$ (a composition of determinant-$1$ maps), and the map is a bijection: undo the shears in reverse order. Keller asked whether every polynomial map with constant nonzero $\det J$ is invertible like this. In the plane, nobody knows to this day; in dimension 3 the answer turned out to be no (see the 3D demo).`,
  },
  {
    key: "fold",
    title: "Fold",
    formula: String.raw`F(x, y) = (x - a\,x^3,\; y)`,
    params: [{ label: "a", min: 0, max: 0.5, step: 0.01, initial: 0.15 }],
    makeF: ([a]) => (x, y) => vec2(x - a * x * x * x, y),
    detText: ([a]) =>
      String.raw`\det J = 1 - ${(3 * a).toFixed(2)}\,x^2\ \text{(varies with } x\text{)}`,
    criticalX: ([a]) => (a > 0.02 ? 1 / Math.sqrt(3 * a) : null),
    explainer: String.raw`Now $\det J = 1 - 3a\,x^2$ depends on position. It vanishes on the two red lines and turns negative beyond them: the plane folds over, distinct points share an image, and no inverse exists. Drag the probe across a red line and watch the parallelogram flip orientation. Non-constant $\det J$ is exactly what the conjecture's hypothesis excludes.`,
  },
  {
    key: "zsq",
    title: String.raw`$z^2$`,
    formula: String.raw`F(x, y) = (x^2 - y^2,\; 2xy)`,
    params: [],
    makeF: () => (x, y) => vec2(x * x - y * y, 2 * x * y),
    detText: () => String.raw`\det J = 4(x^2 + y^2)\ \text{(varies)}`,
    explainer: String.raw`Complex squaring $z \mapsto z^2$ in real coordinates. $\det J = 4(x^2 + y^2)$ vanishes only at the origin (red dot), yet the map is 2-to-1: $z$ and $-z$ hit the same point, so the bent grid covers the plane twice. Nonzero $\det J$ at almost every point is not enough. Even nowhere-zero non-constant $\det J$ can fail over the reals (Pinchuk, 1994): constancy is the essential hypothesis.`,
  },
];

function buildScene() {
  const scene = new Scene2D();
  const camera = scene.create("camera2d", { center: vec2(1, 0), zoom: 1 });

  // Faint reference: the untransformed source plane.
  scene.create("grid2d", {
    rangeX: true,
    rangeY: true,
    gap: "auto",
    color: "white",
    opacity: 0.05,
  });
  scene.create("axes2d", {
    x: true,
    y: true,
    color: "#555",
    thickness: 1,
    tickmarks: true,
    tickStep: "auto",
  });

  const presetIndex = scene.atom(0);
  const morph = scene.atom(1);
  // Four param slots shared by all presets; each preset uses the first few.
  const params = [
    scene.atom(PRESETS[0].params[0].initial),
    scene.atom(PRESETS[0].params[1].initial),
    scene.atom(PRESETS[0].params[2].initial),
    scene.atom(PRESETS[0].params[3].initial),
  ];

  // The morphed map F_t = (1 - t) * id + t * F, rebuilt whenever the preset,
  // a param, or the morph slider changes.
  const mapAtom = scene.atom((get) => {
    const preset = PRESETS[get(presetIndex)];
    const F = preset.makeF(params.map((a) => get(a)));
    const t = get(morph);
    return (x: number, y: number) => vec2(x, y).lerp(F(x, y), t);
  });

  // The transformed grid: every line of the source grid becomes a parametric
  // curve through the current map.
  transformedGrid2D(scene, {
    map: mapAtom,
    rangeX: [-EXTENT, EXTENT],
    rangeY: [-EXTENT, EXTENT],
    gap: GRID_STEP,
    colorX: COLORS.horizontal,
    colorY: COLORS.vertical,
    opacity: 0.5,
  });

  // The images of the two axes, rendered heavier on top of the grid.
  for (const axis of ["x", "y"] as const) {
    scene.create("parametricfunction2d", {
      f: scene.atom((get) => {
        const F = get(mapAtom);
        return axis === "x"
          ? (s: number) => F(s, 0)
          : (s: number) => F(0, s);
      }),
      tStart: -EXTENT,
      tEnd: EXTENT,
      color: axis === "x" ? COLORS.horizontal : COLORS.vertical,
      thickness: 2.5,
      opacity: 0.95,
      pointerEvents: "none",
    });
  }

  // Critical lines for the Fold preset: the images of the source lines
  // x = ±x0 where det J = 0.
  for (const sign of [1, -1] as const) {
    scene.create("parametricfunction2d", {
      f: scene.atom((get) => {
        const F = get(mapAtom);
        const preset = PRESETS[get(presetIndex)];
        const x0 = preset.criticalX?.(params.map((a) => get(a))) ?? 0;
        return (s: number) => F(sign * x0, s);
      }),
      visible: scene.atom((get) => {
        const preset = PRESETS[get(presetIndex)];
        return (preset.criticalX?.(params.map((a) => get(a))) ?? null) != null;
      }),
      tStart: -EXTENT,
      tEnd: EXTENT,
      color: COLORS.critical,
      thickness: 2,
      opacity: 0.9,
      pointerEvents: "none",
    });
  }

  // Critical point for z^2: det J vanishes only at the origin.
  scene.create("point2d", {
    coords: vec2(0, 0),
    color: COLORS.critical,
    radius: 4,
    draggable: "none",
    visible: scene.atom((get) => PRESETS[get(presetIndex)].key === "zsq"),
    pointerEvents: "none",
  });

  // The probe: a draggable source point p, its image F_t(p), and the
  // Jacobian at p via central differences on the morphed map.
  const probe = scene.create("point2d", {
    coords: PROBE_HOME,
    color: COLORS.probe,
    radius: 5,
    draggable: "xy",
  });

  const jacobian = scene.atom((get) => {
    const F = get(mapAtom);
    const p = get(probe.coords);
    const h = 1e-3;
    const fx = F(p.x + h, p.y).sub(F(p.x - h, p.y)).scale(1 / (2 * h));
    const fy = F(p.x, p.y + h).sub(F(p.x, p.y - h)).scale(1 / (2 * h));
    return { q: F(p.x, p.y), fx, fy, det: fx.cross(fy) };
  });

  const imageCoords = scene.atom((get) => get(jacobian).q);
  const detColor = scene.atom((get) => {
    const d = get(jacobian).det;
    if (Math.abs(d) < 0.05) return COLORS.detZero;
    return d > 0 ? COLORS.detPositive : COLORS.detNegative;
  });

  scene.create("line2d", {
    start: probe.coords,
    end: imageCoords,
    color: COLORS.probe,
    thickness: 1,
    opacity: 0.35,
    dashed: true,
    pointerEvents: "none",
  });

  // The image of a small square at p: the parallelogram spanned by the
  // Jacobian columns. Its signed area is det J (times the square's area).
  scene.create("region2d", {
    points: scene.atom((get) => {
      const { q, fx, fy } = get(jacobian);
      const u = fx.scale(PAR_SIZE);
      const v = fy.scale(PAR_SIZE);
      return [q, q.add(u), q.add(u).add(v), q.add(v)];
    }),
    color: detColor,
    opacity: 0.25,
    strokeColor: detColor,
    strokeOpacity: 0.9,
    strokeThickness: 1.5,
    pointerEvents: "none",
  });

  // The Jacobian columns themselves: where unit steps in x and y land.
  scene.create("vector2d", {
    origin: imageCoords,
    vector: scene.atom((get) => get(jacobian).fx.scale(PAR_SIZE)),
    color: COLORS.horizontal,
    thickness: 1.5,
    headLength: 9,
    headWidth: 7,
    draggable: "none",
    pointerEvents: "none",
  });
  scene.create("vector2d", {
    origin: imageCoords,
    vector: scene.atom((get) => get(jacobian).fy.scale(PAR_SIZE)),
    color: COLORS.vertical,
    thickness: 1.5,
    headLength: 9,
    headWidth: 7,
    draggable: "none",
    pointerEvents: "none",
  });

  scene.create("point2d", {
    coords: imageCoords,
    color: COLORS.image,
    radius: 3.5,
    draggable: "none",
    pointerEvents: "none",
  });

  scene.create("overlay2d", {
    position: probe.coords,
    content: "p",
    format: "latex",
    offset: vec2(0, 14),
    anchor: "top",
    style: `color:${COLORS.probe};font-size:12px`,
  });
  scene.create("overlay2d", {
    position: imageCoords,
    content: "F(p)",
    format: "latex",
    offset: vec2(0, -14),
    anchor: "bottom",
    style: `color:${COLORS.image};font-size:12px`,
  });
  scene.create("overlay2d", {
    position: imageCoords,
    content: scene.atom(
      (get) => String.raw`\det J \approx ${get(jacobian).det.toFixed(2)}`
    ),
    format: "latex",
    offset: vec2(16, 16),
    anchor: "top-left",
    style: scene.atom(
      (get) =>
        `color:${get(detColor)};font-size:11px;` +
        "background:rgba(0,0,0,0.55);padding:2px 6px;border-radius:4px"
    ),
  });

  return { scene, camera, presetIndex, morph, params, probe, jacobian };
}

// A LaTeX string rendered with KaTeX.
function Tex({
  tex,
  display,
  style,
}: {
  tex: string;
  display?: boolean;
  style?: CSSProperties;
}) {
  const html = useMemo(
    () =>
      katex.renderToString(tex, {
        throwOnError: false,
        displayMode: !!display,
      }),
    [tex, display]
  );
  return <span style={style} dangerouslySetInnerHTML={{ __html: html }} />;
}

// Prose with $...$ inline math segments.
function Prose({ text }: { text: string }) {
  const parts = text.split(/\$([^$]+)\$/);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <Tex key={i} tex={part} /> : part
      )}
    </>
  );
}

function Slider({
  label,
  atom,
  min,
  max,
  step,
}: ParamSpec & { atom: WritableBoundAtom<number> }) {
  const [value, setValue] = useAtomState(atom);
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#999" }}>
      <span style={{ width: 84, flexShrink: 0, fontFamily: "ui-monospace, monospace" }}>
        {label}: {value.toFixed(2)}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(parseFloat(e.target.value))}
        style={{ width: "100%" }}
      />
    </label>
  );
}

export default function DemoJacobian() {
  const { scene, camera, presetIndex, morph, params, probe, jacobian } =
    useMemo(buildScene, []);

  const [presetI, setPresetI] = useAtomState(presetIndex);
  const preset = PRESETS[presetI];
  const paramValues = [
    useAtomValue(params[0]),
    useAtomValue(params[1]),
    useAtomValue(params[2]),
    useAtomValue(params[3]),
  ];
  const jac = useAtomValue(jacobian);
  const detColor =
    Math.abs(jac.det) < 0.05
      ? COLORS.detZero
      : jac.det > 0
        ? COLORS.detPositive
        : COLORS.detNegative;

  const selectPreset = (i: number) => {
    setPresetI(i);
    PRESETS[i].params.forEach((spec, j) => params[j].set(spec.initial));
    probe.coords.set(PROBE_HOME);
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", fontFamily: "system-ui, sans-serif" }}>
      <Scene2DView scene={scene} camera={camera} style={{ width: "100%", height: "100%" }} />
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          width: 340,
          maxHeight: "calc(100% - 24px)",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          padding: 14,
          borderRadius: 8,
          backgroundColor: "rgba(20, 20, 20, 0.92)",
          border: "1px solid #2a2a2a",
          color: "#bbb",
          fontSize: 12.5,
          lineHeight: 1.55,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: "#eee" }}>
          The Jacobian Conjecture
        </div>
        <div style={{ fontSize: 11.5, color: "#888" }}>
          <Prose
            text={String.raw`A polynomial map $F$ sends each point $(x, y)$ to a new point given by two polynomials. Its Jacobian determinant $\det J$ measures how $F$ scales area near a point. Keller (1939) conjectured: if $\det J$ is a nonzero constant, $F$ has a polynomial inverse. An explicit counterexample in dimension 3 disproved it in July 2026; the planar case shown here is still open.`}
          />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {PRESETS.map((pr, i) => (
            <button
              key={pr.key}
              onClick={() => selectPreset(i)}
              style={{
                padding: "5px 10px",
                border: "none",
                borderRadius: 4,
                backgroundColor: i === presetI ? "#333" : "transparent",
                color: i === presetI ? "#fff" : "#888",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              <Prose text={pr.title} />
            </button>
          ))}
        </div>

        <div
          style={{
            padding: "6px 10px",
            borderRadius: 4,
            backgroundColor: "#222",
            color: "#ddd",
          }}
        >
          <Tex tex={preset.formula} display />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {preset.params.map((spec, j) => (
            <Slider key={`${preset.key}-${spec.label}`} {...spec} atom={params[j]} />
          ))}
          <Slider label="morph" min={0} max={1} step={0.01} initial={1} atom={morph} />
        </div>

        <div>
          <Tex
            tex={String.raw`\det J \approx ${jac.det.toFixed(2)}\ \text{at } p`}
            style={{ color: detColor, fontSize: 13 }}
          />
          <div style={{ fontSize: 11, color: "#777" }}>
            <Tex tex={preset.detText(paramValues)} />
          </div>
        </div>

        <div>
          <Prose text={preset.explainer} />
        </div>

        <div style={{ fontSize: 11, color: "#777" }}>
          <Prose
            text={String.raw`Drag the gold probe $p$; the white point is its image $F(p)$. Blue and violet curves are the images of horizontal and vertical grid lines. The shaded parallelogram shows where a small square at $p$ lands: green keeps orientation, red is flipped, amber means $\det J \approx 0$.`}
          />
        </div>
        <div style={{ fontSize: 11, color: "#555" }}>
          wheel: zoom · drag empty space: pan
        </div>
      </div>
    </div>
  );
}
