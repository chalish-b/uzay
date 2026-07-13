import type { Scene2D } from "../scene2d";
import type { AtomLikeInput } from "../../shared/atom-wrapper";
import { ensureAtom } from "../../shared/atom-wrapper";
import type { Color } from "../../shared/types/colors";
import { type Vec2, vec2 } from "../../shared/types/vec2";

type Function2DFunc = (x: number) => number;

type FunctionArea2DOptions = {
  f: AtomLikeInput<Function2DFunc>;
  a: AtomLikeInput<number>;
  b: AtomLikeInput<number>;
  baseline?: AtomLikeInput<number>;
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
  const baselineAtom = ensureAtom(scene.atom, options.baseline ?? 0);
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

  // One simple polygon per lobe, split where the curve crosses the baseline.
  // A single polygon would self-intersect there and break triangulation.
  const polygonsAtom = scene.atom((get) => {
    const f = get(fAtom);
    const a = get(aAtom);
    const b = get(bAtom);
    const baseline = get(baselineAtom);
    const left = Math.min(a, b);
    const right = Math.max(a, b);
    const width = right - left;
    const sampleCount = Math.round(Math.max(get(samplesAtom), MIN_SAMPLES));

    const samples: Vec2[] = [];
    for (let i = 0; i <= sampleCount; i++) {
      const x = width === 0 ? left : left + (width * i) / sampleCount;
      samples.push(vec2(x, f(x)));
    }

    const polygons: Vec2[][] = [];
    let lobe: Vec2[] = [vec2(samples[0].x, baseline), samples[0]];

    for (let i = 1; i < samples.length; i++) {
      const prev = samples[i - 1];
      const next = samples[i];
      const prevSide = prev.y - baseline;
      const nextSide = next.y - baseline;

      if (nextSide === 0) {
        // The sample lands exactly on the baseline, so it is itself the meeting
        // point: it closes the current lobe and opens the next, no interpolation.
        lobe.push(next);
        polygons.push(lobe);
        lobe = [next];
      } else if ((prevSide > 0 && nextSide < 0) || (prevSide < 0 && nextSide > 0)) {
        const t = prevSide / (prevSide - nextSide);
        const root = vec2(prev.x + (next.x - prev.x) * t, baseline);
        lobe.push(root);
        polygons.push(lobe);
        lobe = [root, next];
      } else {
        lobe.push(next);
      }
    }

    lobe.push(vec2(samples[samples.length - 1].x, baseline));
    polygons.push(lobe);
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
