import type { Scene2D } from "../scene2d";
import type { AtomLikeInput } from "../../shared/atom-wrapper";
import { ensureAtom } from "../../shared/atom-wrapper";
import type { Color } from "../../shared/types/colors";
import { vec2 } from "../../shared/types/vec2";

type Function2DFunc = (x: number) => number;

type FunctionArea2DOptions = {
  f: AtomLikeInput<Function2DFunc>;
  a: AtomLikeInput<number>;
  b: AtomLikeInput<number>;
  baseline?: AtomLikeInput<number>;
  samples?: AtomLikeInput<number>;
  color?: AtomLikeInput<Color>;
  opacity?: AtomLikeInput<number>;
  strokeColor?: AtomLikeInput<Color>;
  strokeOpacity?: AtomLikeInput<number>;
  strokeThickness?: AtomLikeInput<number>;
};

const MIN_SAMPLES = 2;

export function functionArea2D(scene: Scene2D, options: FunctionArea2DOptions) {
  const fAtom = ensureAtom(scene.atom, options.f, "value");
  const aAtom = ensureAtom(scene.atom, options.a);
  const bAtom = ensureAtom(scene.atom, options.b);
  const baselineAtom = ensureAtom(scene.atom, options.baseline ?? 0);
  const samplesAtom = ensureAtom(scene.atom, options.samples ?? 128);
  const colorAtom = ensureAtom(scene.atom, options.color ?? "white");
  const opacityAtom = ensureAtom(scene.atom, options.opacity ?? 0.35);
  const strokeColorAtom = ensureAtom(scene.atom, options.strokeColor ?? "white");
  const strokeOpacityAtom = ensureAtom(scene.atom, options.strokeOpacity ?? 0);
  const strokeThicknessAtom = ensureAtom(scene.atom, options.strokeThickness ?? 1);

  const pointsAtom = scene.atom((get) => {
    const f = get(fAtom);
    const a = get(aAtom);
    const b = get(bAtom);
    const baseline = get(baselineAtom);
    const left = Math.min(a, b);
    const right = Math.max(a, b);
    const width = right - left;
    const sampleCount = Math.round(Math.max(get(samplesAtom), MIN_SAMPLES));
    const points = [vec2(left, baseline)];

    for (let i = 0; i <= sampleCount; i++) {
      const x = width === 0 ? left : left + (width * i) / sampleCount;
      points.push(vec2(x, f(x)));
    }

    points.push(vec2(right, baseline));
    return points;
  });

  const region = scene.create("region2d", {
    points: pointsAtom,
    color: colorAtom,
    opacity: opacityAtom,
    strokeColor: strokeColorAtom,
    strokeOpacity: strokeOpacityAtom,
    strokeThickness: strokeThicknessAtom,
    pointerEvents: "none",
  });

  return {
    region,
    points: pointsAtom,
    dispose: () => {
      scene.remove(region);
    },
  };
}
