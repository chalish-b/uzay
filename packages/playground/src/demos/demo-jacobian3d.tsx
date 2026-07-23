import { useMemo, type CSSProperties } from "react";
import katex from "katex";
import { Scene3D, vec2, vec3, type Vec3, type WritableBoundAtom } from "uzay";
import { Scene3DView, useAtomState, useAtomValue } from "uzay/react";

// The Jacobian conjecture in dimension 3.
//
// Same idea as the 2D demo, one dimension up. A polynomial map
// F: R^3 -> R^3 is applied to the three coordinate planes: every grid line
// of each plane is rendered as a parametric curve s -> F_t(...), where
// F_t = (1 - t) * id + t * F and t is the morph slider. Each plane family
// has its own color and can be toggled on and off to isolate it, and an
// optional faint lattice fills in the interior grid lines.
//
// Three fixed test points are marked together with their images under the
// current map, so specific points can be tracked through the morph.
//
// Presets mirror the 2D story: Linear, Shear, a triple shear composition
// (still det J = 1), a Fold whose critical planes are drawn, and the 2D
// complex squaring map crossed with the identity in z.

const EXTENT = 2;
const GRID_STEP = 0.5;
const LATTICE_STEP = 1;
const CURVE_SAMPLES = 200;

const COLORS = {
  planeXY: "#38bdf8",
  planeXZ: "#2dd4bf",
  planeYZ: "#a78bfa",
  critical: "#f87171",
};

// Fixed test points to track through the map: each renders at its source
// position (dim) alongside its image under the current map (bright).
const TEST_POINTS = [
  { label: "p_1", color: "#fbbf24", coords: vec3(0, 0, -1 / 4) },
  { label: "p_2", color: "#f472b6", coords: vec3(1, -3 / 2, 13 / 2) },
  { label: "p_3", color: "#a3e635", coords: vec3(-1, 3 / 2, 13 / 2) },
];

// The three source planes, each embedded as (u, v) -> R^3.
const PLANES = [
  { key: "xy", label: String.raw`z = 0`, color: COLORS.planeXY, embed: (u: number, v: number) => vec3(u, v, 0) },
  { key: "xz", label: String.raw`y = 0`, color: COLORS.planeXZ, embed: (u: number, v: number) => vec3(u, 0, v) },
  { key: "yz", label: String.raw`x = 0`, color: COLORS.planeYZ, embed: (u: number, v: number) => vec3(0, u, v) },
] as const;

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
  makeF: (p: number[]) => (x: number, y: number, z: number) => Vec3;
  detText: (p: number[]) => string;
  // For maps whose det J vanishes on planes x = ±x0: returns x0, or null
  // when there is no critical plane for the current params.
  criticalX?: (p: number[]) => number | null;
  // Set when det J vanishes exactly on the z-axis.
  criticalZAxis?: boolean;
  explainer: string;
};

const PRESETS: Preset[] = [
  {
    key: "linear",
    title: "Linear",
    formula: String.raw`F(x, y, z) = (a\,x + d\,y,\; b\,y,\; c\,z)`,
    params: [
      { label: "a", min: -2, max: 2, step: 0.05, initial: 1.2 },
      { label: "b", min: -2, max: 2, step: 0.05, initial: 0.8 },
      { label: "c", min: -2, max: 2, step: 0.05, initial: 1 },
      { label: "d", min: -2, max: 2, step: 0.05, initial: -0.6 },
    ],
    makeF: ([a, b, c, d]) => (x, y, z) => vec3(a * x + d * y, b * y, c * z),
    detText: ([a, b, c]) =>
      String.raw`\det J = a\,b\,c = ${(a * b * c).toFixed(2)}\ \text{(constant)}`,
    explainer: String.raw`A linear map scales every volume by the same factor, $\det J = a\,b\,c$, at every point. Nonzero determinant means invertible, with a linear inverse. Push the product to $0$ and space collapses onto a plane. The conjecture asks whether this picture extends to polynomial maps.`,
  },
  {
    key: "shear",
    title: "Shear",
    formula: String.raw`F(x, y, z) = (x + a\,y^2 + b\,z^2,\; y,\; z)`,
    params: [
      { label: "a", min: -1, max: 1, step: 0.02, initial: 0.4 },
      { label: "b", min: -1, max: 1, step: 0.02, initial: 0.25 },
    ],
    makeF: ([a, b]) => (x, y, z) => vec3(x + a * y * y + b * z * z, y, z),
    detText: () => String.raw`\det J = 1\ \text{(constant)}`,
    explainer: String.raw`Each point slides along the $x$ direction by $a\,y^2 + b\,z^2$, so the planes bend into parabolic sheets. But $\det J$ is exactly $1$ at every point: cells tilt without changing volume, and nothing ever folds. The inverse is again polynomial: $(x - a\,y^2 - b\,z^2,\ y,\ z)$.`,
  },
  {
    key: "triple",
    title: String.raw`Shear $\circ$ Shear $\circ$ Shear`,
    formula: String.raw`F = (u,\; v,\; z + c\,u^2), \quad u = x + a\,y^2, \quad v = y + b\,z^2`,
    params: [
      { label: "a", min: -0.6, max: 0.6, step: 0.02, initial: 0.3 },
      { label: "b", min: -0.6, max: 0.6, step: 0.02, initial: 0.25 },
      { label: "c", min: -0.6, max: 0.6, step: 0.02, initial: 0.2 },
    ],
    makeF: ([a, b, c]) => (x, y, z) => {
      const u = x + a * y * y;
      const v = y + b * z * z;
      return vec3(u, v, z + c * u * u);
    },
    detText: () => String.raw`\det J = 1\ \text{(constant)}`,
    explainer: String.raw`Three shears composed, one along each axis. The picture gets wild, but $\det J$ is still exactly $1$, and the map is a bijection: undo the shears in reverse order. Keller asked whether every polynomial map with constant nonzero $\det J$ is invertible like this. For 87 years nobody knew; the last preset shows the answer is no.`,
  },
  {
    key: "fold",
    title: "Fold",
    formula: String.raw`F(x, y, z) = (x - a\,x^3,\; y,\; z)`,
    params: [{ label: "a", min: 0, max: 0.5, step: 0.01, initial: 0.2 }],
    makeF: ([a]) => (x, y, z) => vec3(x - a * x * x * x, y, z),
    detText: ([a]) =>
      String.raw`\det J = 1 - ${(3 * a).toFixed(2)}\,x^2\ \text{(varies with } x\text{)}`,
    criticalX: ([a]) => (a > 0.02 ? 1 / Math.sqrt(3 * a) : null),
    explainer: String.raw`Now $\det J = 1 - 3a\,x^2$ depends on position. It vanishes on the two red planes and turns negative beyond them: space folds over, distinct points share an image, and no inverse exists. Non-constant $\det J$ is exactly what the conjecture's hypothesis excludes.`,
  },
  {
    key: "zsq",
    title: String.raw`$z^2 \times \mathrm{id}$`,
    formula: String.raw`F(x, y, z) = (x^2 - y^2,\; 2xy,\; z)`,
    params: [],
    makeF: () => (x, y, z) => vec3(x * x - y * y, 2 * x * y, z),
    detText: () => String.raw`\det J = 4(x^2 + y^2)\ \text{(varies)}`,
    criticalZAxis: true,
    explainer: String.raw`Complex squaring in the $(x, y)$ pair, identity in $z$. $\det J = 4(x^2 + y^2)$ vanishes only on the red $z$-axis, yet the map is 2-to-1: $(x, y)$ and $(-x, -y)$ land on the same point, so space wraps twice around the axis. Nonzero $\det J$ at almost every point is not enough; constancy is the essential hypothesis.`,
  },
  {
    key: "wild",
    title: "An interesting example",
    formula: String.raw`\begin{aligned} u &= 1 + xy \\ X &= u^3\,z + y^2\,u\,(4 + 3xy) \\ Y &= y + 3x\,u^2\,z + 3x\,y^2\,(4 + 3xy) \\ Z &= 2x - 3x^2\,y - x^3\,z \end{aligned}`,
    params: [],
    makeF: () => (x, y, z) => {
      const u = 1 + x * y;
      return vec3(
        u ** 3 * z + y ** 2 * u * (4 + 3 * x * y),
        y + 3 * x * u ** 2 * z + 3 * x * y ** 2 * (4 + 3 * x * y),
        2 * x - 3 * x ** 2 * y - x ** 3 * z
      );
    },
    detText: () => String.raw`\det J = -2\ \text{(constant)}`,
    explainer: String.raw`A degree-7 map. $\det J$ is exactly $-2$ at every point, and the three marked points $p_1, p_2, p_3$ all land on $(-1/4,\ 0,\ 0)$: a 3-to-1 fiber, so no inverse exists and constant nonzero $\det J$ does not force invertibility. Ease the morph slider up from $0$ and watch the three bright points meet.`,
  },
];

function buildScene() {
  const scene = new Scene3D();
  const camera = scene.create("camera3d", {
    position: vec3(5.5, 4.5, 5.5),
    lookAt: vec3(0, 0, 0),
  });

  scene.create("axes3d", {
    x: true,
    y: true,
    z: true,
    color: "#555",
    thickness: 1,
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
  const planeOn = {
    xy: scene.atom(true),
    xz: scene.atom(true),
    yz: scene.atom(true),
  };
  const latticeOn = scene.atom(false);

  // The morphed map F_t = (1 - t) * id + t * F.
  const mapAtom = scene.atom((get) => {
    const preset = PRESETS[get(presetIndex)];
    const F = preset.makeF(params.map((a) => get(a)));
    const t = get(morph);
    return (x: number, y: number, z: number) => vec3(x, y, z).lerp(F(x, y, z), t);
  });

  // The transformed coordinate planes: every grid line of each plane becomes
  // a parametric curve through the current map. Lines through the origin are
  // the images of the axes and render heavier.
  for (const plane of PLANES) {
    for (let i = -EXTENT / GRID_STEP; i <= EXTENT / GRID_STEP; i++) {
      const c = i * GRID_STEP;
      const isAxis = i === 0;
      for (const dir of ["u", "v"] as const) {
        scene.create("parametricfunction3d", {
          f: scene.atom((get) => {
            const F = get(mapAtom);
            return (s: number) => {
              const p = dir === "u" ? plane.embed(s, c) : plane.embed(c, s);
              return F(p.x, p.y, p.z);
            };
          }),
          tStart: -EXTENT,
          tEnd: EXTENT,
          samples: CURVE_SAMPLES,
          color: plane.color,
          thickness: isAxis ? 2 : 1.25,
          opacity: isAxis ? 0.6 : 0.5,
          style: "flat",
          visible: planeOn[plane.key],
          pointerEvents: "none",
        });
      }
    }
  }

  // Optional faint lattice: every interior grid line of the volume, one
  // family of curves per axis direction.
  const latticeEmbeds = [
    (s: number, b: number, c: number) => vec3(s, b, c),
    (s: number, b: number, c: number) => vec3(b, s, c),
    (s: number, b: number, c: number) => vec3(b, c, s),
  ];
  for (const embed of latticeEmbeds) {
    for (let bi = -EXTENT; bi <= EXTENT; bi += LATTICE_STEP) {
      for (let ci = -EXTENT; ci <= EXTENT; ci += LATTICE_STEP) {
        const b = bi;
        const c = ci;
        scene.create("parametricfunction3d", {
          f: scene.atom((get) => {
            const F = get(mapAtom);
            return (s: number) => {
              const p = embed(s, b, c);
              return F(p.x, p.y, p.z);
            };
          }),
          tStart: -EXTENT,
          tEnd: EXTENT,
          samples: 48,
          color: "white",
          thickness: 1,
          opacity: 0.12,
          style: "flat",
          visible: latticeOn,
          pointerEvents: "none",
        });
      }
    }
  }

  // Critical planes for the Fold preset: the images of the source planes
  // x = ±x0 where det J = 0 (the map keeps them flat, so plane3d works).
  for (const sign of [1, -1] as const) {
    scene.create("plane3d", {
      point: scene.atom((get) => {
        const F = get(mapAtom);
        const preset = PRESETS[get(presetIndex)];
        const x0 = preset.criticalX?.(params.map((a) => get(a))) ?? 0;
        return F(sign * x0, 0, 0);
      }),
      normal: vec3(1, 0, 0),
      width: EXTENT * 2 + 1,
      height: EXTENT * 2 + 1,
      color: COLORS.critical,
      opacity: 0.15,
      showEdges: true,
      visible: scene.atom((get) => {
        const preset = PRESETS[get(presetIndex)];
        return (preset.criticalX?.(params.map((a) => get(a))) ?? null) != null;
      }),
      pointerEvents: "none",
    });
  }

  // Critical line for the z² preset: det J vanishes exactly on the z-axis,
  // which the map leaves in place.
  scene.create("line3d", {
    start: vec3(0, 0, -EXTENT - 1),
    end: vec3(0, 0, EXTENT + 1),
    color: COLORS.critical,
    thickness: 1.5,
    style: "flat",
    visible: scene.atom(
      (get) => PRESETS[get(presetIndex)].criticalZAxis === true
    ),
    pointerEvents: "none",
  });

  // The test points: each source point stays put while its image follows
  // the current map, with a faint connector between the two.
  for (const tp of TEST_POINTS) {
    const p = tp.coords;
    const image = scene.atom((get) => {
      const F = get(mapAtom);
      return F(p.x, p.y, p.z);
    });
    scene.create("point3d", {
      coords: p,
      color: tp.color,
      radius: 1,
      opacity: 0.45,
      draggable: "none",
      pointerEvents: "none",
    });
    scene.create("point3d", {
      coords: image,
      color: tp.color,
      radius: 1,
      draggable: "none",
      pointerEvents: "none",
    });
    scene.create("line3d", {
      start: p,
      end: image,
      color: tp.color,
      thickness: 1,
      opacity: 0.25,
      style: "flat",
      pointerEvents: "none",
    });
    scene.create("overlay3d", {
      position: p,
      content: tp.label,
      format: "latex",
      offset: vec2(0, 14),
      anchor: "top",
      style: `color:${tp.color};opacity:0.6;font-size:12px`,
    });
    scene.create("overlay3d", {
      position: image,
      content: String.raw`F(${tp.label})`,
      format: "latex",
      offset: vec2(0, -14),
      anchor: "bottom",
      style: `color:${tp.color};font-size:12px`,
    });
  }

  return { scene, camera, presetIndex, morph, params, planeOn, latticeOn };
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

function PlaneToggle({
  label,
  color,
  atom,
}: {
  label: string;
  color: string;
  atom: WritableBoundAtom<boolean>;
}) {
  const [on, setOn] = useAtomState(atom);
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, cursor: "pointer" }}>
      <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} />
      <span style={{ color }}>
        <Tex tex={label} />
      </span>
    </label>
  );
}

export default function DemoJacobian3D() {
  const { scene, camera, presetIndex, morph, params, planeOn, latticeOn } =
    useMemo(buildScene, []);

  const [presetI, setPresetI] = useAtomState(presetIndex);
  const preset = PRESETS[presetI];
  const paramValues = [
    useAtomValue(params[0]),
    useAtomValue(params[1]),
    useAtomValue(params[2]),
    useAtomValue(params[3]),
  ];

  const selectPreset = (i: number) => {
    setPresetI(i);
    PRESETS[i].params.forEach((spec, j) => params[j].set(spec.initial));
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", fontFamily: "system-ui, sans-serif" }}>
      <Scene3DView scene={scene} camera={camera} style={{ width: "100%", height: "100%" }} />
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
          The Jacobian Conjecture, in 3D
        </div>
        <div style={{ fontSize: 11.5, color: "#888" }}>
          <Prose
            text={String.raw`A polynomial map $F$ sends each point $(x, y, z)$ to a new point given by three polynomials. Its Jacobian determinant $\det J$ measures how $F$ scales volume near a point. Keller (1939) conjectured: if $\det J$ is a nonzero constant, $F$ has a polynomial inverse.`}
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

        <div style={{ display: "flex", gap: 14 }}>
          {PLANES.map((plane) => (
            <PlaneToggle
              key={plane.key}
              label={plane.label}
              color={plane.color}
              atom={planeOn[plane.key]}
            />
          ))}
          <PlaneToggle
            label={String.raw`\text{lattice}`}
            color="#9ca3af"
            atom={latticeOn}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {preset.params.map((spec, j) => (
            <Slider key={`${preset.key}-${spec.label}`} {...spec} atom={params[j]} />
          ))}
          <Slider label="morph" min={0} max={1} step={0.01} initial={1} atom={morph} />
        </div>

        <div style={{ fontSize: 12, color: "#999" }}>
          <Tex tex={preset.detText(paramValues)} />
        </div>

        <div>
          <Prose text={preset.explainer} />
        </div>

        <div style={{ fontSize: 11, color: "#777" }}>
          <Prose
            text={String.raw`The marked points $p_1, p_2, p_3$ sit at fixed source positions (dim), and their images under the map are drawn bright in the same color. Each colored curve family is the image of one coordinate plane, and the lattice toggle fills in the interior grid lines faintly.`}
          />
        </div>
        <div style={{ fontSize: 11, color: "#555" }}>
          drag: orbit · wheel: zoom · right-drag: pan
        </div>
      </div>
    </div>
  );
}
