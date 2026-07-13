import type { Scene2D } from "../scene2d";
import type { AtomLikeInput, WritableInput } from "../../shared/atom-wrapper";
import { ensureAtom } from "../../shared/atom-wrapper";
import type { Color } from "../../shared/types/colors";
import { vec2 } from "../../shared/types/vec2";
import { curvePoint2D } from "./curve-point";

type Function2DFunc = (x: number) => number;

type FunctionPoint2DOptions = {
  f: AtomLikeInput<Function2DFunc>;
  // Optional clamp on x. Omit it and the point slides anywhere along the graph;
  // pass [min, max] to confine it to a sub-interval (a curve with real
  // endpoints).
  domain?: [number, number];
  // The x parameter, controlled or uncontrolled. A number (or omitted) seeds an
  // atom the construction owns; a writable atom hands ownership to the caller,
  // so the same one can drive several points at once. Returned as `x`.
  x?: WritableInput<number>;
  color?: AtomLikeInput<Color>;
  // Show or hide the whole construction, applied to every item it creates.
  visible?: AtomLikeInput<boolean>;
};

/**
 * A draggable point that rides the graph of y = f(x). The ergonomic special
 * case of curvePoint2D for ordinary functions, and the one to reach for in most
 * 2D work.
 *
 * It takes the same f as function2d, so you drop a handle onto a curve using the
 * exact function you plotted. Because a function is single-valued in x, its
 * parameter is x itself, and the returned `x` atom is that coordinate. Dragging
 * still snaps the point to the nearest spot on the graph (curvePoint2D's
 * projection), so the handle stays under the cursor even where the curve is
 * steep, and it is unbounded unless you pass a domain.
 */
export function functionPoint2D(
  scene: Scene2D,
  options: FunctionPoint2DOptions,
) {
  const fAtom = ensureAtom(scene.atom, options.f, "value");

  // Lift y = f(x) into the parametric form curvePoint2D expects, parametrized by
  // x. Derived from fAtom, so swapping f reactively moves the point onto the new
  // graph at the same x.
  const parametric = scene.atom((get) => {
    const f = get(fAtom);
    return (x: number) => vec2(x, f(x));
  });

  const curve = curvePoint2D(scene, {
    f: parametric,
    tStart: options.domain?.[0],
    tEnd: options.domain?.[1],
    t: options.x,
    color: options.color,
    visible: options.visible,
  });

  return {
    point: curve.point,
    // curvePoint2D's parameter is the x-coordinate here, so expose it as x.
    x: curve.t,
    dispose: curve.dispose,
  };
}
