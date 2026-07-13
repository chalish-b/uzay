import type { Scene3D } from "../scene3d";
import type { AtomLikeInput, WritableInput } from "../../shared/atom-wrapper";
import { ensureAtom, ensureWritableAtom } from "../../shared/atom-wrapper";
import type { Color } from "../../shared/types/colors";
import { vec3, type Vec3 } from "../../shared/types/vec3";
import { vec2, type Vec2 } from "../../shared/types/vec2";

type SurfaceFunc = (x: number, z: number) => number;

type SurfacePointOptions = {
  f: AtomLikeInput<SurfaceFunc>;
  xRange?: AtomLikeInput<[number, number]>;
  zRange?: AtomLikeInput<[number, number]>;
  // The (x, z) parameter, controlled or uncontrolled. A Vec2 (or omitted) seeds
  // an atom the construction owns; a writable atom hands ownership to the caller,
  // so the same one can drive several points at once. Returned as `xz`.
  xz?: WritableInput<Vec2>;
  color?: AtomLikeInput<Color>;
  // Show or hide the whole construction, applied to every item it creates.
  visible?: AtomLikeInput<boolean>;
};

const EPSILON = 1e-5;
const NEWTON_ITERATIONS = 8;

/**
 * Find the (x, z) on the surface f where the point (x, f(x,z), z) is closest
 * to a camera ray. Uses Gauss-Newton iteration on the 2D parameter space.
 */
function findNearestXZToRay(
  f: SurfaceFunc,
  rayOrigin: Vec3,
  rayDir: Vec3,
  currentXZ: Vec2,
  xRange: [number, number],
  zRange: [number, number],
): Vec2 {
  const d = rayDir.unit();
  let x = currentXZ.x;
  let z = currentXZ.y;

  for (let i = 0; i < NEWTON_ITERATIONS; i++) {
    const y = f(x, z);
    const pos = vec3(x, y, z);
    const v = pos.sub(rayOrigin);

    // Rejection of v from ray direction (perpendicular component)
    const proj = v.dot(d);
    const rx = v.x - d.x * proj;
    const ry = v.y - d.y * proj;
    const rz = v.z - d.z * proj;

    // Partial derivatives of f via central differences
    const dfdx = (f(x + EPSILON, z) - f(x - EPSILON, z)) / (2 * EPSILON);
    const dfdz = (f(x, z + EPSILON) - f(x, z - EPSILON)) / (2 * EPSILON);

    // Jacobian columns: dP/dx = (1, dfdx, 0), dP/dz = (0, dfdz, 1)
    // Reject each from the ray direction
    const Jx = vec3(1, dfdx, 0);
    const JxProj = Jx.dot(d);
    const jx_rx = Jx.x - d.x * JxProj;
    const jx_ry = Jx.y - d.y * JxProj;
    const jx_rz = Jx.z - d.z * JxProj;

    const Jz = vec3(0, dfdz, 1);
    const JzProj = Jz.dot(d);
    const jz_rx = Jz.x - d.x * JzProj;
    const jz_ry = Jz.y - d.y * JzProj;
    const jz_rz = Jz.z - d.z * JzProj;

    // Gradient: g = J^T * r (2x1)
    const gx = jx_rx * rx + jx_ry * ry + jx_rz * rz;
    const gz = jz_rx * rx + jz_ry * ry + jz_rz * rz;

    // Approximate Hessian: H = J^T * J (2x2)
    const h00 = jx_rx * jx_rx + jx_ry * jx_ry + jx_rz * jx_rz;
    const h01 = jx_rx * jz_rx + jx_ry * jz_ry + jx_rz * jz_rz;
    const h11 = jz_rx * jz_rx + jz_ry * jz_ry + jz_rz * jz_rz;

    // Solve 2x2 system via Cramer's rule: H * [dx, dz] = -g
    const det = h00 * h11 - h01 * h01;
    if (Math.abs(det) < 1e-12) break;

    const dx = -(h11 * gx - h01 * gz) / det;
    const dz = -(h00 * gz - h01 * gx) / det;

    x = Math.max(xRange[0], Math.min(xRange[1], x + dx));
    z = Math.max(zRange[0], Math.min(zRange[1], z + dz));
  }

  return vec2(x, z);
}

export function surfacePoint(scene: Scene3D, options: SurfacePointOptions) {
  const fAtom = ensureAtom(scene.atom, options.f, "value");
  const xRangeAtom = ensureAtom(scene.atom, options.xRange ?? [-5, 5] as [number, number]);
  const zRangeAtom = ensureAtom(scene.atom, options.zRange ?? [-5, 5] as [number, number]);
  const colorAtom = ensureAtom(scene.atom, options.color ?? "white");
  const visibleAtom = ensureAtom(scene.atom, options.visible ?? true);

  const xzAtom = ensureWritableAtom(scene.atom, options.xz ?? vec2(0, 0));

  const coordsAtom = scene.atom((get) => {
    const xz = get(xzAtom);
    return vec3(xz.x, get(fAtom)(xz.x, xz.y), xz.y);
  });

  const point = scene.create("point3d", {
    coords: coordsAtom,
    color: colorAtom,
    draggable: "custom",
    visible: visibleAtom,
  });

  point.on("drag", (event) => {
    if (event.phase === "start") return;

    const nearestXZ = findNearestXZToRay(
      fAtom.get(),
      event.ray.origin,
      event.ray.direction,
      xzAtom.get(),
      xRangeAtom.get(),
      zRangeAtom.get(),
    );
    xzAtom.set(nearestXZ);
  });

  return {
    point,
    xz: xzAtom,
    dispose: () => {
      scene.remove(point);
    },
  };
}
