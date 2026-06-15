import type { Scene2D } from "../scene2d";
import type { AtomLikeInput } from "../../shared/atom-wrapper";
import { ensureAtom } from "../../shared/atom-wrapper";
import type { Color } from "../../shared/types/colors";
import { type Vec2, vec2 } from "../../shared/types/vec2";

type AngleMark2DOptions = {
  // The angle's vertex and the two points its arms point at. Read-only: the
  // construction never writes them, it only draws the mark they imply.
  vertex: AtomLikeInput<Vec2>;
  a: AtomLikeInput<Vec2>;
  b: AtomLikeInput<Vec2>;
  // Size of the mark, in world units: the arc radius, or the square's side.
  radius?: AtomLikeInput<number>;
  color?: AtomLikeInput<Color>;
  thickness?: AtomLikeInput<number>;
  // Show a right-angle square (instead of the arc) when the angle is 90°. On by
  // default; set false to keep the arc at every angle.
  squareRightAngle?: boolean;
};

// How close to 90° counts as a right angle. ±0.5° so the square appears exactly
// when a degree readout rounded with toFixed(0) reads "90".
const RIGHT_ANGLE_TOL_DEG = 0.5;

/**
 * A small mark for the angle at `vertex` between the arms to `a` and `b`. A bare
 * arc (a circle2d) sweeping the non-reflex angle, which by convention becomes
 * the right-angle square whenever the angle is 90° (pass `squareRightAngle:
 * false` to keep the arc). The measured angle is returned as `measure`, in
 * radians, so a readout and the mark share one source of truth.
 */
export function angleMark2D(scene: Scene2D, options: AngleMark2DOptions) {
  const vertexAtom = ensureAtom(scene.atom, options.vertex);
  const aAtom = ensureAtom(scene.atom, options.a);
  const bAtom = ensureAtom(scene.atom, options.b);
  const radiusAtom = ensureAtom(scene.atom, options.radius ?? 0.4);
  const colorAtom = ensureAtom(scene.atom, options.color ?? "white");
  const thicknessAtom = ensureAtom(scene.atom, options.thickness ?? 2);

  // Direction to arm a, and the signed short-way sweep from a to b. Sweeping by
  // this delta marks the non-reflex angle whichever side b falls on.
  const sweepAtom = scene.atom((get) => {
    const v = get(vertexAtom);
    const a = get(aAtom);
    const b = get(bAtom);
    const start = Math.atan2(a.y - v.y, a.x - v.x);
    let delta = Math.atan2(b.y - v.y, b.x - v.x) - start;
    delta = (((delta + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    return { start, delta };
  });

  const measure = scene.atom((get) => Math.abs(get(sweepAtom).delta));

  // The arc and square coexist and trade visibility as the angle crosses 90° (an
  // item's kind is fixed at creation, so a single item can't morph between them).
  const squareRightAngle = options.squareRightAngle !== false;
  const rightAngle = squareRightAngle
    ? scene.atom((get) => Math.abs((get(measure) * 180) / Math.PI - 90) < RIGHT_ANGLE_TOL_DEG)
    : null;

  const arc = scene.create("circle2d", {
    center: vertexAtom,
    radius: radiusAtom,
    thetaStart: scene.atom((get) => get(sweepAtom).start),
    thetaEnd: scene.atom((get) => {
      const { start, delta } = get(sweepAtom);
      return start + delta;
    }),
    strokeColor: colorAtom,
    strokeThickness: thicknessAtom,
    visible: rightAngle ? scene.atom((get) => !get(rightAngle)) : true,
    pointerEvents: "none",
  });

  // The conventional right-angle mark: the two outer sides of a small square in
  // the corner (an L), not a closed box — the other two sides would just lie on
  // the arms. p1 is r along arm a, p3 is r along arm b, p2 is the far corner.
  const corner = scene.atom((get) => {
    const v = get(vertexAtom);
    const a = get(aAtom);
    const b = get(bAtom);
    const r = get(radiusAtom);
    const ma = Math.hypot(a.x - v.x, a.y - v.y) || 1;
    const mb = Math.hypot(b.x - v.x, b.y - v.y) || 1;
    const uax = (a.x - v.x) / ma;
    const uay = (a.y - v.y) / ma;
    const ubx = (b.x - v.x) / mb;
    const uby = (b.y - v.y) / mb;
    return {
      p1: vec2(v.x + uax * r, v.y + uay * r),
      p2: vec2(v.x + (uax + ubx) * r, v.y + (uay + uby) * r),
      p3: vec2(v.x + ubx * r, v.y + uby * r),
    };
  });

  const squareSides = rightAngle
    ? [
        scene.create("line2d", {
          start: scene.atom((get) => get(corner).p1),
          end: scene.atom((get) => get(corner).p2),
          color: colorAtom,
          thickness: thicknessAtom,
          visible: rightAngle,
          pointerEvents: "none",
        }),
        scene.create("line2d", {
          start: scene.atom((get) => get(corner).p2),
          end: scene.atom((get) => get(corner).p3),
          color: colorAtom,
          thickness: thicknessAtom,
          visible: rightAngle,
          pointerEvents: "none",
        }),
      ]
    : [];

  return {
    mark: arc,
    measure,
    dispose: () => {
      scene.remove(arc);
      for (const side of squareSides) scene.remove(side);
    },
  };
}
