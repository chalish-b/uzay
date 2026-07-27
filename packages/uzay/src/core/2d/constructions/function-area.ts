import type { Scene2D } from "../scene2d";
import type { AtomLikeInput } from "../../shared/atom-wrapper";
import { ensureAtom } from "../../shared/atom-wrapper";
import type { Color } from "../../shared/types/colors";
import { type Vec2, vec2 } from "../../shared/types/vec2";

type Function2DFunc = (x: number) => number;

// The region's lower boundary: a constant height, or a second function g(x)
// to shade the region between two curves.
export type FunctionArea2DBaseline = number | Function2DFunc;

type FunctionArea2DOptions = {
  f: AtomLikeInput<Function2DFunc>;
  a: AtomLikeInput<number>;
  b: AtomLikeInput<number>;
  // Defaults to 0, the x axis.
  baseline?: AtomLikeInput<FunctionArea2DBaseline>;
  samples?: AtomLikeInput<number>;
  color?: AtomLikeInput<Color>;
  // Fill color for lobes below the baseline. Defaults to `color`, so the whole
  // region reads as one fill unless you opt into a two-tone look (e.g. shading
  // positive and negative parts of a signed area differently).
  colorBelow?: AtomLikeInput<Color>;
  opacity?: AtomLikeInput<number>;
  strokeColor?: AtomLikeInput<Color>;
  // Stroke color for lobes below the baseline. Defaults to `strokeColor`.
  strokeColorBelow?: AtomLikeInput<Color>;
  strokeOpacity?: AtomLikeInput<number>;
  strokeThickness?: AtomLikeInput<number>;
  // Show or hide the whole construction, applied to every item it creates.
  visible?: AtomLikeInput<boolean>;
};

const MIN_SAMPLES = 2;

// Standard shoelace: positive for counterclockwise winding. Our lobes run
// left-to-right along the curve and close right-to-left along the baseline,
// so lobes above the baseline wind clockwise (negative) and lobes below wind
// counterclockwise (positive). Negating recovers integral sign convention.
function lobeSignedArea(polygon: readonly Vec2[]): number {
  let sum = 0;
  for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i];
    const q = polygon[(i + 1) % polygon.length];
    sum += p.x * q.y - q.x * p.y;
  }
  return -sum / 2;
}

export function functionArea2D(scene: Scene2D, options: FunctionArea2DOptions) {
  const fAtom = ensureAtom(scene.atom, options.f, "value");
  const aAtom = ensureAtom(scene.atom, options.a);
  const bAtom = ensureAtom(scene.atom, options.b);
  // Value mode because the baseline may be a function; plain numbers take the
  // ordinary primitive-atom path inside.
  const baselineAtom = ensureAtom(scene.atom, options.baseline ?? 0, "value");
  const samplesAtom = ensureAtom(scene.atom, options.samples ?? 128);
  const colorAtom = ensureAtom(scene.atom, options.color ?? "white");
  const colorBelowAtom =
    options.colorBelow != null
      ? ensureAtom(scene.atom, options.colorBelow)
      : colorAtom;
  const opacityAtom = ensureAtom(scene.atom, options.opacity ?? 0.35);
  const strokeColorAtom = ensureAtom(scene.atom, options.strokeColor ?? "white");
  const strokeColorBelowAtom =
    options.strokeColorBelow != null
      ? ensureAtom(scene.atom, options.strokeColorBelow)
      : strokeColorAtom;
  const strokeOpacityAtom = ensureAtom(scene.atom, options.strokeOpacity ?? 0);
  const strokeThicknessAtom = ensureAtom(scene.atom, options.strokeThickness ?? 1);
  const visibleAtom = ensureAtom(scene.atom, options.visible ?? true);

  // One simple polygon per lobe, split where f crosses the baseline. A single
  // polygon would self-intersect there and break triangulation. Each lobe
  // traces f left to right, then closes back along the baseline right to
  // left; with a constant baseline the return run is a straight edge.
  const polygonsAtom = scene.atom((get) => {
    const f = get(fAtom);
    const baseline = get(baselineAtom);
    const g: Function2DFunc =
      typeof baseline === "number" ? () => baseline : baseline;
    const a = get(aAtom);
    const b = get(bAtom);
    const left = Math.min(a, b);
    const right = Math.max(a, b);
    const width = right - left;
    const sampleCount = Math.round(Math.max(get(samplesAtom), MIN_SAMPLES));

    const polygons: Vec2[][] = [];
    // The current lobe as two runs on a shared x grid, both left to right:
    // f's samples and the baseline's samples. Lobes closed at a crossing get
    // the meeting point once, as the tip joining the two runs.
    let top: Vec2[] = [];
    let bottom: Vec2[] = [];

    const closeLobe = (meet?: Vec2) => {
      const polygon = meet ? [...top, meet] : [...top];
      for (let i = bottom.length - 1; i >= 0; i--) {
        polygon.push(bottom[i]);
      }
      // Lobes closed right at their opening point degenerate to a segment;
      // they enclose nothing and would only feed the renderer slivers.
      if (polygon.length >= 3) polygons.push(polygon);
    };

    let prevX = left;
    let prevDiff = 0;
    for (let i = 0; i <= sampleCount; i++) {
      const x = width === 0 ? left : left + (width * i) / sampleCount;
      const fy = f(x);
      const gy = g(x);
      const diff = fy - gy;

      if (i === 0) {
        top.push(vec2(x, fy));
        // When the curves already meet at the left bound, that single point
        // is the lobe's tip; seeding the bottom run too would duplicate it.
        if (diff !== 0) bottom.push(vec2(x, gy));
      } else if (diff === 0) {
        // The sample lands exactly on a crossing, so it is itself the meeting
        // point: it closes the current lobe and opens the next.
        const meet = vec2(x, gy);
        closeLobe(meet);
        top = [meet];
        bottom = [];
      } else {
        if ((prevDiff > 0 && diff < 0) || (prevDiff < 0 && diff > 0)) {
          const tRoot = prevDiff / (prevDiff - diff);
          const xRoot = prevX + (x - prevX) * tRoot;
          const meet = vec2(xRoot, g(xRoot));
          closeLobe(meet);
          top = [meet];
          bottom = [];
        }
        top.push(vec2(x, fy));
        bottom.push(vec2(x, gy));
      }

      prevX = x;
      prevDiff = diff;
    }
    closeLobe();
    return polygons;
  });

  // Each lobe is wholly above or wholly below the baseline (the split above
  // cuts at every crossing), and lobeSignedArea is positive above / negative
  // below. So the sign of a lobe's area is exactly which group it belongs to.
  const abovePolygonsAtom = scene.atom((get) =>
    get(polygonsAtom).filter((polygon) => lobeSignedArea(polygon) >= 0)
  );
  const belowPolygonsAtom = scene.atom((get) =>
    get(polygonsAtom).filter((polygon) => lobeSignedArea(polygon) < 0)
  );

  const signedAreaAtom = scene.atom((get) => {
    let total = 0;
    for (const polygon of get(polygonsAtom)) {
      total += lobeSignedArea(polygon);
    }
    return total;
  });

  const absoluteAreaAtom = scene.atom((get) => {
    let total = 0;
    for (const polygon of get(polygonsAtom)) {
      total += Math.abs(lobeSignedArea(polygon));
    }
    return total;
  });

  // Two regions so the two sides can be colored independently. With no
  // colorBelow given they share one fill and read as a single region; the
  // unused side is an empty polygon list, which renders nothing.
  const regionAbove = scene.create("region2d", {
    points: abovePolygonsAtom,
    color: colorAtom,
    opacity: opacityAtom,
    strokeColor: strokeColorAtom,
    strokeOpacity: strokeOpacityAtom,
    strokeThickness: strokeThicknessAtom,
    visible: visibleAtom,
    pointerEvents: "none",
  });

  const regionBelow = scene.create("region2d", {
    points: belowPolygonsAtom,
    color: colorBelowAtom,
    opacity: opacityAtom,
    strokeColor: strokeColorBelowAtom,
    strokeOpacity: strokeOpacityAtom,
    strokeThickness: strokeThicknessAtom,
    visible: visibleAtom,
    pointerEvents: "none",
  });

  return {
    regionAbove,
    regionBelow,
    polygons: polygonsAtom,
    abovePolygons: abovePolygonsAtom,
    belowPolygons: belowPolygonsAtom,
    signedArea: signedAreaAtom,
    absoluteArea: absoluteAreaAtom,
    dispose: () => {
      scene.remove(regionAbove);
      scene.remove(regionBelow);
    },
  };
}
