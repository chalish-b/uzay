import type { Scene3D } from "../scene3d";
import type { AtomLikeInput } from "../../shared/atom-wrapper";
import { ensureAtom } from "../../shared/atom-wrapper";
import type { Color } from "../../shared/types/colors";
import { vec3, type Vec3 } from "../../shared/types/vec3";

type ParametricFunc = (t: number) => Vec3;

type TangentLineOptions = {
  f: AtomLikeInput<ParametricFunc>;
  t: AtomLikeInput<number>;
  length?: AtomLikeInput<number>;
  color?: AtomLikeInput<Color>;
  showPoint?: AtomLikeInput<boolean>;
  // Show or hide the whole construction, applied to every item it creates.
  // The point still honors showPoint: it shows only when both are true.
  visible?: AtomLikeInput<boolean>;
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
  const visibleAtom = ensureAtom(scene.atom, options.visible ?? true);
  const showPointAtom = ensureAtom(scene.atom, options.showPoint ?? true);

  const positionAtom = scene.atom((get) => get(fAtom)(get(tAtom)));

  const tangentAtom = scene.atom((get) => {
    return numericalDerivative(get(fAtom), get(tAtom));
  });

  const startAtom = scene.atom((get) => {
    const pos = get(positionAtom);
    const dir = get(tangentAtom).unit();
    const halfLen = get(lengthAtom) / 2;
    return pos.sub(dir.scale(halfLen));
  });

  const endAtom = scene.atom((get) => {
    const pos = get(positionAtom);
    const dir = get(tangentAtom).unit();
    const halfLen = get(lengthAtom) / 2;
    return pos.add(dir.scale(halfLen));
  });

  const point = scene.create("point3d", {
    coords: positionAtom,
    color: colorAtom,
    draggable: "none",
    visible: scene.atom((get) => get(visibleAtom) && get(showPointAtom)),
  });

  const line = scene.create("line3d", {
    start: startAtom,
    end: endAtom,
    color: colorAtom,
    visible: visibleAtom,
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
