import type { Scene2D } from "../scene2d";
import type { AtomLikeInput } from "../../shared/atom-wrapper";
import { ensureAtom } from "../../shared/atom-wrapper";
import type { Color } from "../../shared/types/colors";
import { type Vec2 } from "../../shared/types/vec2";

type ParametricFunc = (t: number) => Vec2;

type CurvePoint2DOptions = {
  f: AtomLikeInput<ParametricFunc>;
  tStart?: AtomLikeInput<number>;
  tEnd?: AtomLikeInput<number>;
  initialT?: number;
  color?: AtomLikeInput<Color>;
};

const EPSILON = 1e-5;
const NEWTON_ITERATIONS = 8;

/**
 * Find the parameter t where the curve f is closest to a 2D world point p.
 * Minimizes ||f(t) - p||^2 with Gauss-Newton iteration starting from currentT.
 *
 * Cheaper than the 3D analog: orthographic projection means the cursor maps
 * directly to a world (x, y), so we minimize a plain point-curve distance
 * rather than a ray-curve distance.
 */
function findNearestTToPoint(
  f: ParametricFunc,
  p: Vec2,
  currentT: number,
  tStart: number,
  tEnd: number,
): number {
  let t = currentT;

  for (let i = 0; i < NEWTON_ITERATIONS; i++) {
    const ft = f(t);
    const fPrev = f(t - EPSILON);
    const fNext = f(t + EPSILON);
    const dx = (fNext.x - fPrev.x) / (2 * EPSILON);
    const dy = (fNext.y - fPrev.y) / (2 * EPSILON);

    const rx = ft.x - p.x;
    const ry = ft.y - p.y;

    // g(t) = (f(t) - p) · f'(t). Zero of g is the closest t.
    const g = rx * dx + ry * dy;

    // Gauss-Newton: g'(t) ≈ |f'(t)|^2 (drops the second-derivative term).
    const gPrime = dx * dx + dy * dy;
    if (gPrime < 1e-12) break;

    t -= g / gPrime;
    if (t < tStart) t = tStart;
    else if (t > tEnd) t = tEnd;
  }

  return t;
}

export function curvePoint2D(scene: Scene2D, options: CurvePoint2DOptions) {
  const fAtom = ensureAtom(scene.atom, options.f, "value");
  const tStartAtom = ensureAtom(scene.atom, options.tStart ?? 0);
  const tEndAtom = ensureAtom(scene.atom, options.tEnd ?? 1);
  const colorAtom = ensureAtom(scene.atom, options.color ?? "white");

  const tAtom = scene.atom(options.initialT ?? 0);

  const coordsAtom = scene.atom((get) => get(fAtom)(get(tAtom)));

  const point = scene.create("point2d", {
    coords: coordsAtom,
    color: colorAtom,
    draggable: "custom",
  });

  point.on("drag", (event) => {
    if (event.phase === "start") return;

    const nearestT = findNearestTToPoint(
      fAtom.get(),
      event.worldPosition,
      tAtom.get(),
      tStartAtom.get(),
      tEndAtom.get(),
    );
    tAtom.set(nearestT);
  });

  return {
    point,
    t: tAtom,
    dispose: () => {
      scene.remove(point);
    },
  };
}
