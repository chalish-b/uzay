import type { Scene3D } from "../scene3d";
import type { AtomLikeInput, WritableInput } from "../../shared/atom-wrapper";
import { ensureAtom, ensureWritableAtom } from "../../shared/atom-wrapper";
import type { Color } from "../../shared/types/colors";
import { Vec3 as Vec3Utils, vec3, type Vec3 } from "../../shared/types/vec3";

type ParametricFunc = (t: number) => Vec3;

type CurvePointOptions = {
  f: AtomLikeInput<ParametricFunc>;
  tStart?: AtomLikeInput<number>;
  tEnd?: AtomLikeInput<number>;
  // The parameter, controlled or uncontrolled. A number (or omitted) seeds an
  // atom the construction owns; a writable atom hands ownership to the caller,
  // so the same one can drive several points at once. Returned as `t`.
  t?: WritableInput<number>;
  color?: AtomLikeInput<Color>;
};

const EPSILON = 1e-5;
const NEWTON_ITERATIONS = 8;

/**
 * Find the parameter t where the curve f is closest to a camera ray.
 * Minimizes the squared distance from f(t) to the ray (not to a point),
 * so the result is independent of camera angle.
 *
 * Uses Gauss-Newton iteration starting from currentT.
 */
function findNearestTToRay(
  f: ParametricFunc,
  rayOrigin: Vec3,
  rayDir: Vec3,
  currentT: number,
  tStart: number,
  tEnd: number,
): number {
  // Normalize ray direction once
  const d = Vec3Utils.normalized(rayDir);
  let t = currentT;

  for (let i = 0; i < NEWTON_ITERATIONS; i++) {
    const pos = f(t);
    const v = Vec3Utils.subtract(pos, rayOrigin);

    // Rejection of v from d: the component of (f(t) - rayOrigin) perpendicular to the ray
    const proj = Vec3Utils.dot(v, d);
    const rejection = Vec3Utils.subtract(v, Vec3Utils.scaled(d, proj));

    // f'(t) via central difference
    const fPrev = f(t - EPSILON);
    const fNext = f(t + EPSILON);
    const deriv = vec3(
      (fNext.x - fPrev.x) / (2 * EPSILON),
      (fNext.y - fPrev.y) / (2 * EPSILON),
      (fNext.z - fPrev.z) / (2 * EPSILON),
    );

    // g(t) = f'(t) · rejection(f(t) - origin, rayDir)
    // This is the derivative of the squared ray-curve distance w.r.t. t.
    const g = Vec3Utils.dot(deriv, rejection);

    // Gauss-Newton approximation of g'(t):
    // |f'(t)|² - (f'(t) · d)², i.e. the squared length of f'(t) rejected from the ray.
    const derivDotD = Vec3Utils.dot(deriv, d);
    const gPrime = Vec3Utils.dot(deriv, deriv) - derivDotD * derivDotD;

    if (Math.abs(gPrime) < 1e-12) break;

    t = t - g / gPrime;
    t = Math.max(tStart, Math.min(tEnd, t));
  }

  return t;
}

export function curvePoint(scene: Scene3D, options: CurvePointOptions) {
  const fAtom = ensureAtom(scene.atom, options.f, "value");
  const tStartAtom = ensureAtom(scene.atom, options.tStart ?? 0);
  const tEndAtom = ensureAtom(scene.atom, options.tEnd ?? 1);
  const colorAtom = ensureAtom(scene.atom, options.color ?? "white");

  const tAtom = ensureWritableAtom(scene.atom, options.t ?? 0);

  const coordsAtom = scene.atom((get) => get(fAtom)(get(tAtom)));

  const point = scene.create("point3d", {
    coords: coordsAtom,
    color: colorAtom,
    draggable: "custom",
  });

  point.on("drag", (event) => {
    if (event.phase === "start") return;

    const nearestT = findNearestTToRay(
      fAtom.get(),
      event.ray.origin,
      event.ray.direction,
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
