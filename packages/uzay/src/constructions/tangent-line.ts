import type { Scene3D } from "../core/scene3d";
import type { AtomLikeInput } from "../core/atom-wrapper";
import { ensureAtom } from "../core/atom-wrapper";
import type { Color } from "../core/common-types/colors";
import { Vec3 as Vec3Utils, vec3, type Vec3 } from "../core/common-types/vec3";

type ParametricFunc = (t: number) => Vec3;

type TangentLineOptions = {
  f: AtomLikeInput<ParametricFunc>;
  t: AtomLikeInput<number>;
  length?: AtomLikeInput<number>;
  color?: AtomLikeInput<Color>;
  showPoint?: AtomLikeInput<boolean>;
};

const EPSILON = 1e-5;

function numericalDerivative(f: ParametricFunc, t: number): Vec3 {
  const a = f(t - EPSILON);
  const b = f(t + EPSILON);
  return vec3(
    (b.x - a.x) / (2 * EPSILON),
    (b.y - a.y) / (2 * EPSILON),
    (b.z - a.z) / (2 * EPSILON),
  );
}

export function tangentLine(scene: Scene3D, options: TangentLineOptions) {
  const fAtom = ensureAtom(scene.atom, options.f, "value");
  const tAtom = ensureAtom(scene.atom, options.t);
  const lengthAtom = ensureAtom(scene.atom, options.length ?? 2);
  const colorAtom = ensureAtom(scene.atom, options.color ?? "yellow");

  const positionAtom = scene.atom((get) => get(fAtom)(get(tAtom)));

  const tangentAtom = scene.atom((get) => {
    return numericalDerivative(get(fAtom), get(tAtom));
  });

  const startAtom = scene.atom((get) => {
    const pos = get(positionAtom);
    const dir = Vec3Utils.normalized(get(tangentAtom));
    const halfLen = get(lengthAtom) / 2;
    return Vec3Utils.subtract(pos, Vec3Utils.scaled(dir, halfLen));
  });

  const endAtom = scene.atom((get) => {
    const pos = get(positionAtom);
    const dir = Vec3Utils.normalized(get(tangentAtom));
    const halfLen = get(lengthAtom) / 2;
    return Vec3Utils.add(pos, Vec3Utils.scaled(dir, halfLen));
  });

  const point = scene.create("point3d", {
    coords: positionAtom,
    color: colorAtom,
    draggable: "none",
    visible: options.showPoint ?? true,
  });

  const line = scene.create("line3d", {
    start: startAtom,
    end: endAtom,
    color: colorAtom,
  });

  return {
    point,
    line,
    tangent: tangentAtom,
    dispose: () => {
      scene.remove(point);
      scene.remove(line);
    },
  };
}
