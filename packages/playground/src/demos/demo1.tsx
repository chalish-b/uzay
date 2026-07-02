import { useMemo, useState } from "react";
import { Scene2D, vec2, type WritableBoundAtom } from "uzay";
import { Scene2DView, useAtomState } from "uzay/react";

// Function sampling torture bench.
//
// Each case is one scene rendered by BOTH backends side by side (threejs left,
// svg right) with a shared camera, so pan/zoom stays in sync and any visual
// difference between the backends is immediately obvious. The cases cover the
// hard parts of plotting: asymptotes, jumps, domain edges, removable holes,
// high frequencies, needle-thin features, and viewport-dependent resampling.
//
// General checks that apply to every case:
// - both backends look identical
// - pan and zoom stay smooth, the curve never shimmers while panning
// - zooming in never exposes polygon corners; zooming out never leaves gaps

type SliderSpec = {
  label: string;
  atom: WritableBoundAtom<number>;
  min: number;
  max: number;
  step: number;
};

type BenchCase = {
  id: string;
  title: string;
  notes: string[];
  build: () => {
    scene: Scene2D;
    camera: ReturnType<Scene2D["create"]>;
    sliders: SliderSpec[];
  };
};

function baseScene(center = vec2(0, 0), zoom = 1) {
  const scene = new Scene2D();
  const camera = scene.create("camera2d", { center, zoom });
  scene.create("grid2d", {
    rangeX: true,
    rangeY: true,
    gap: "auto",
    color: "white",
    opacity: 0.08,
  });
  scene.create("axes2d", {
    x: true,
    y: true,
    color: "#888",
    thickness: 1,
    tickmarks: true,
    tickStep: "auto",
    labels: true,
  });
  return { scene, camera };
}

const CASES: BenchCase[] = [
  {
    id: "reciprocal",
    title: "1/x — auto asymptote",
    notes: [
      "No declared discontinuities: the pole at x=0 is detected automatically",
      "Two branches, no vertical wall connecting them",
      "Branches hug the y-axis and run off-screen steeply, not at a shallow angle",
      "Zoom in near the pole: the plunge stays steep and smooth",
    ],
    build: () => {
      const { scene, camera } = baseScene();
      scene.create("function2d", {
        f: (x: number) => 1 / x,
        domain: "infinite",
        color: "#4f9cf9",
        thickness: 2,
      });
      return { scene, camera, sliders: [] };
    },
  },
  {
    id: "pole",
    title: "1/(x−c) — declared pole",
    notes: [
      "The pole is declared via `discontinuities` and follows the slider",
      "Gap slides along smoothly, never a vertical wall",
      "Compare with the 1/x case: declared and auto-detected should look alike",
    ],
    build: () => {
      const { scene, camera } = baseScene();
      const poleAtom = scene.atom(1);
      scene.create("function2d", {
        f: scene.atom((get) => {
          const c = get(poleAtom);
          return (x: number) => 1 / (x - c);
        }),
        discontinuities: scene.atom((get) => [get(poleAtom)]),
        domain: "infinite",
        color: "#f97583",
        thickness: 2,
      });
      return {
        scene,
        camera,
        sliders: [{ label: "pole c", atom: poleAtom, min: -3, max: 3, step: 0.05 }],
      };
    },
  },
  {
    id: "tan",
    title: "tan(x) — many asymptotes",
    notes: [
      "Every branch separate, no connector walls, nothing declared by hand",
      "Each branch runs off both the top and the bottom of the screen",
      "Zoom way out: branches become near-vertical strokes but stay separate",
    ],
    build: () => {
      const { scene, camera } = baseScene();
      scene.create("function2d", {
        f: Math.tan,
        domain: "infinite",
        color: "#34d399",
        thickness: 2,
      });
      return { scene, camera, sliders: [] };
    },
  },
  {
    id: "log",
    title: "log(x) — domain edge",
    notes: [
      "Curve plunges down the y-axis at x=0 instead of stopping short",
      "Nothing drawn for x < 0 (f is NaN there)",
      "Zoom in around the origin: the plunge keeps following the axis",
    ],
    build: () => {
      const { scene, camera } = baseScene(vec2(2, 0));
      scene.create("function2d", {
        f: Math.log,
        domain: "infinite",
        color: "#ffd166",
        thickness: 2,
      });
      return { scene, camera, sliders: [] };
    },
  },
  {
    id: "sinax",
    title: "sin(ax) — high frequency",
    notes: [
      "Crank `a` to the max: the wave stays smooth, no jagged corners",
      "No aliasing: the curve never collapses into a flat or misshapen line",
      "Extremely high a degrades to a dense band, never to garbage",
    ],
    build: () => {
      const { scene, camera } = baseScene();
      const freqAtom = scene.atom(5);
      scene.create("function2d", {
        f: scene.atom((get) => {
          const a = get(freqAtom);
          return (x: number) => 2 * Math.sin(a * x);
        }),
        domain: "infinite",
        color: "#4f9cf9",
        thickness: 1.5,
      });
      return {
        scene,
        camera,
        sliders: [{ label: "a", atom: freqAtom, min: 1, max: 120, step: 1 }],
      };
    },
  },
  {
    id: "sinrecip",
    title: "sin(1/x) — infinite oscillation",
    notes: [
      "Oscillates infinitely fast toward x=0: must stay responsive, no freeze",
      "Away from 0 the wave is clean; near 0 it degrades to a dense scribble",
      "Zoom into the chaos region: detail keeps resolving as far as it can",
    ],
    build: () => {
      const { scene, camera } = baseScene();
      scene.create("function2d", {
        f: (x: number) => Math.sin(1 / x),
        domain: "infinite",
        color: "#a78bfa",
        thickness: 1.5,
      });
      return { scene, camera, sliders: [] };
    },
  },
  {
    id: "floor",
    title: "floor(x) — jumps",
    notes: [
      "Flat treads with clean breaks: no vertical risers at the integers",
      "Each tread runs the full unit right up to both jumps",
      "Zoomed far out the treads merge visually but never grow risers",
    ],
    build: () => {
      const { scene, camera } = baseScene();
      scene.create("function2d", {
        f: Math.floor,
        domain: "infinite",
        color: "#f59e0b",
        thickness: 2,
      });
      return { scene, camera, sliders: [] };
    },
  },
  {
    id: "roots",
    title: "√x and ∛x — vertical tangents",
    notes: [
      "Steep but continuous: neither curve breaks at its vertical tangent",
      "√x starts exactly at the origin, nothing drawn for x < 0",
      "∛x passes through the origin in one unbroken S-curve",
    ],
    build: () => {
      const { scene, camera } = baseScene();
      scene.create("function2d", {
        f: Math.sqrt,
        domain: "infinite",
        color: "#4f9cf9",
        thickness: 2,
      });
      scene.create("function2d", {
        f: Math.cbrt,
        domain: "infinite",
        color: "#f97583",
        thickness: 2,
      });
      return { scene, camera, sliders: [] };
    },
  },
  {
    id: "sinc",
    title: "sin(x)/x — removable hole",
    notes: [
      "Undefined only at x=0: the curve still looks continuous through it",
      "Zoom into (0, 1) as far as you can: any gap stays below a pixel",
    ],
    build: () => {
      const { scene, camera } = baseScene();
      scene.create("function2d", {
        f: (x: number) => Math.sin(x) / x,
        domain: "infinite",
        color: "#34d399",
        thickness: 2,
      });
      return { scene, camera, sliders: [] };
    },
  },
  {
    id: "needle",
    title: "Gaussian needle — narrow spike",
    notes: [
      "Shrink σ: the spike keeps its full height instead of vanishing",
      "The spike's sides stay smooth at any zoom",
      "At extreme σ the needle is thinner than the seed grid; finding it is",
      "best-effort, so it may drop out at the very bottom of the range",
    ],
    build: () => {
      const { scene, camera } = baseScene();
      const sigmaAtom = scene.atom(0.3);
      scene.create("function2d", {
        f: scene.atom((get) => {
          const s = get(sigmaAtom);
          return (x: number) => 4 * Math.exp((-x * x) / (2 * s * s));
        }),
        domain: "infinite",
        color: "#ffd166",
        thickness: 2,
      });
      return {
        scene,
        camera,
        sliders: [{ label: "σ", atom: sigmaAtom, min: 0.002, max: 0.5, step: 0.002 }],
      };
    },
  },
  {
    id: "exp",
    title: "eˣ — runaway growth",
    notes: [
      "Exits the top of the screen steeply; no overflow artifacts anywhere",
      "Pan right: the exit point follows, the curve never disappears",
      "Coordinates blow up fast off-screen; clipping must keep things stable",
    ],
    build: () => {
      const { scene, camera } = baseScene();
      scene.create("function2d", {
        f: Math.exp,
        domain: "infinite",
        color: "#f97583",
        thickness: 2,
      });
      return { scene, camera, sliders: [] };
    },
  },
  {
    id: "finite",
    title: "x² on [−3, 3] — finite domain",
    notes: [
      "Ends exactly at x=±3",
      "Zoom deep into the curve: it stays smooth (finite domains resample on",
      "zoom too, there is no fixed sample count to run out of)",
    ],
    build: () => {
      const { scene, camera } = baseScene();
      scene.create("function2d", {
        f: (x: number) => x * x,
        domain: [-3, 3],
        color: "#4f9cf9",
        thickness: 2,
      });
      return { scene, camera, sliders: [] };
    },
  },
  {
    id: "astroid",
    title: "Parametric: astroid + spiral",
    notes: [
      "The astroid's four cusps stay razor sharp at any zoom",
      "The spiral runs far off-screen: the visible part stays smooth and the",
      "off-screen part is clipped away",
    ],
    build: () => {
      const { scene, camera } = baseScene();
      scene.create("parametricfunction2d", {
        f: (t: number) => vec2(3 * Math.cos(t) ** 3, 3 * Math.sin(t) ** 3),
        tStart: 0,
        tEnd: Math.PI * 2,
        color: "#34d399",
        thickness: 2,
      });
      scene.create("parametricfunction2d", {
        f: (t: number) =>
          vec2(0.05 * Math.exp(0.25 * t) * Math.cos(t), 0.05 * Math.exp(0.25 * t) * Math.sin(t)),
        tStart: 0,
        tEnd: Math.PI * 8,
        color: "#a78bfa",
        thickness: 1.5,
      });
      return { scene, camera, sliders: [] };
    },
  },
  {
    id: "ptan",
    title: "Parametric: (t, tan t)",
    notes: [
      "Same tan picture as the function case, drawn as a parametric curve",
      "Branches split automatically, no connector walls",
    ],
    build: () => {
      const { scene, camera } = baseScene();
      scene.create("parametricfunction2d", {
        f: (t: number) => vec2(t, Math.tan(t)),
        tStart: -8,
        tEnd: 8,
        color: "#f59e0b",
        thickness: 2,
      });
      return { scene, camera, sliders: [] };
    },
  },
];

function Slider({ spec }: { spec: SliderSpec }) {
  const [value, setValue] = useAtomState(spec.atom);
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#999" }}>
      <span style={{ width: 64, flexShrink: 0 }}>
        {spec.label}: {value.toFixed(spec.step >= 1 ? 0 : 3)}
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
  const [caseId, setCaseId] = useState(CASES[0].id);
  const activeCase = CASES.find((c) => c.id === caseId) ?? CASES[0];
  const { scene, camera, sliders } = useMemo(() => activeCase.build(), [activeCase]);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", fontFamily: "system-ui, sans-serif" }}>
      <div
        style={{
          width: 300,
          flexShrink: 0,
          overflowY: "auto",
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          backgroundColor: "#161616",
          borderRight: "1px solid #2a2a2a",
        }}
      >
        <div style={{ color: "#ccc", fontSize: 12, fontWeight: 600 }}>
          Sampling torture bench
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {CASES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCaseId(c.id)}
              style={{
                textAlign: "left",
                padding: "5px 8px",
                border: "1px solid #333",
                borderRadius: 4,
                backgroundColor: c.id === caseId ? "#26364d" : "#1d1d1d",
                color: c.id === caseId ? "#dbe9ff" : "#aaa",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              {c.title}
            </button>
          ))}
        </div>

        {sliders.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sliders.map((spec) => (
              <Slider key={spec.label} spec={spec} />
            ))}
          </div>
        )}

        <div style={{ color: "#ccc", fontSize: 11, fontWeight: 600 }}>What to check</div>
        <ul style={{ margin: 0, paddingLeft: 16, color: "#888", fontSize: 11, lineHeight: 1.5 }}>
          {activeCase.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
        <div style={{ color: "#666", fontSize: 10, lineHeight: 1.5 }}>
          Both panes share one camera: pan/zoom in either and compare. The two
          backends must look identical.
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0, display: "flex" }}>
        <ViewPane scene={scene} camera={camera} renderer="threejs" />
        <div style={{ width: 1, backgroundColor: "#2a2a2a" }} />
        <ViewPane scene={scene} camera={camera} renderer="svg" />
      </div>
    </div>
  );
}
