import type { Scene3D } from "../scene3d";
import type { AtomLikeInput } from "../../shared/atom-wrapper";
import { ensureAtom } from "../../shared/atom-wrapper";
import type { Color } from "../../shared/types/colors";
import { vec3 } from "../../shared/types/vec3";
import type { Vec2 } from "../../shared/types/vec2";

type SurfaceFunc = (x: number, z: number) => number;

type SurfaceNormalOptions = {
  f: AtomLikeInput<SurfaceFunc>;
  xz: AtomLikeInput<Vec2>;
  color?: AtomLikeInput<Color>;
  scale?: AtomLikeInput<number>;
};

const EPSILON = 1e-5;

export function surfaceNormal(scene: Scene3D, options: SurfaceNormalOptions) {
  const fAtom = ensureAtom(scene.atom, options.f, "value");
  const xzAtom = ensureAtom(scene.atom, options.xz);
  const colorAtom = ensureAtom(scene.atom, options.color ?? "white");
  const scaleAtom = ensureAtom(scene.atom, options.scale ?? 1);

  const normalAtom = scene.atom((get) => {
    const xz = get(xzAtom);
    const x = xz.x;
    const z = xz.y;
    const f = get(fAtom);
    const dfdx = (f(x + EPSILON, z) - f(x - EPSILON, z)) / (2 * EPSILON);
    const dfdz = (f(x, z + EPSILON) - f(x, z - EPSILON)) / (2 * EPSILON);
    return vec3(-dfdx, 1, -dfdz).unit();
  });

  const originAtom = scene.atom((get) => {
    const xz = get(xzAtom);
    return vec3(xz.x, get(fAtom)(xz.x, xz.y), xz.y);
  });

  const scaledNormalAtom = scene.atom((get) => {
    return get(normalAtom).scale(get(scaleAtom));
  });

  const vector = scene.create("vector3d", {
    origin: originAtom,
    vector: scaledNormalAtom,
    color: colorAtom,
  });

  return {
    vector,
    normal: normalAtom,
    dispose: () => {
      scene.remove(vector);
    },
  };
}
