import type { Scene2D } from "../scene2d";
import type { AtomLikeInput } from "../../shared/atom-wrapper";
import { ensureAtom } from "../../shared/atom-wrapper";
import type { Color } from "../../shared/types/colors";
import { type Vec2 } from "../../shared/types/vec2";

type AngleMark2DOptions = {
  // The angle's vertex and the two points its arms point at. Read-only: the
  // construction never writes them, it only draws the mark they imply.
  vertex: AtomLikeInput<Vec2>;
  a: AtomLikeInput<Vec2>;
  b: AtomLikeInput<Vec2>;
  // Radius of the little arc, in world units.
  radius?: AtomLikeInput<number>;
  color?: AtomLikeInput<Color>;
  thickness?: AtomLikeInput<number>;
};

/**
 * A small arc marking the angle at `vertex` between the arms to `a` and `b`.
 * Always marks the non-reflex angle (the short way between the arms), drawn as
 * a bare arc with a circle2d. The measured angle is returned as `measure`, in
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

  const mark = scene.create("circle2d", {
    center: vertexAtom,
    radius: radiusAtom,
    thetaStart: scene.atom((get) => get(sweepAtom).start),
    thetaEnd: scene.atom((get) => {
      const { start, delta } = get(sweepAtom);
      return start + delta;
    }),
    strokeColor: colorAtom,
    strokeThickness: thicknessAtom,
    pointerEvents: "none",
  });

  const measure = scene.atom((get) => Math.abs(get(sweepAtom).delta));

  return {
    mark,
    measure,
    dispose: () => {
      scene.remove(mark);
    },
  };
}
