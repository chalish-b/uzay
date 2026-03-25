import { useMemo } from "react";
import { Scene3D, vec2, vec3, Vec3, surfacePoint } from "uzay";
import { Scene3DView, useAtomValue } from "uzay/react";

function createScene() {
  const scene = new Scene3D();

  scene.create("camera3d", {
    position: vec3(8, 6, 8),
    lookAt: vec3(0, 0, 0),
  });

  scene.create("axes3d", {
    x: [-5, 5],
    y: [-5, 5],
    z: [-5, 5],
    thickness: 0.5,
    tickmarks: true,
    arrows: true,
  });

  scene.create("grid3d", {
    plane: "xz",
    range1: [-5, 5],
    range2: [-5, 5],
    color: "white",
    opacity: 0.1,
    thickness: 2.5,
  });

  const f = (x: number, z: number) => Math.sin(x) * Math.cos(z) + 2;

  scene.create("surface3d", {
    f,
    xRange: [-5, 5],
    zRange: [-5, 5],
    color: "steelblue",
    opacity: 1,
    samples: 64,
  });

  const sp = surfacePoint(scene, {
    f,
    xRange: [-5, 5],
    zRange: [-5, 5],
    initialXZ: vec2(1, 1),
    color: "tomato",
  });
  sp.point.radius.set(1);

  sp.point.radius.set(4);

  const EPSILON = 1e-5;
  const normalAtom = scene.atom((get) => {
    const xz = get(sp.xz);
    const x = xz.x;
    const z = xz.y;
    const dfdx = (f(x + EPSILON, z) - f(x - EPSILON, z)) / (2 * EPSILON);
    const dfdz = (f(x, z + EPSILON) - f(x, z - EPSILON)) / (2 * EPSILON);
    // normal = cross(dP/dx, dP/dz) where dP/dx = (1, dfdx, 0), dP/dz = (0, dfdz, 1)
    return Vec3.normalized(vec3(-dfdx, 1, -dfdz));
  });

  scene.create("vector3d", {
    origin: sp.point.coords,
    vector: normalAtom,
    color: "tomato",
    thickness: 1,
  });

  return { scene, sp };
}

export default function Demo1() {
  const { scene, sp } = useMemo(() => createScene(), []);
  const xz = useAtomValue(sp.xz);
  const coords = useAtomValue(sp.point.coords);

  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: "#141414", position: "relative" }}>
      <Scene3DView scene={scene} style={{ width: "100%", height: "100%" }} />

      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          background: "rgba(0,0,0,0.7)",
          padding: "12px 16px",
          borderRadius: 8,
          color: "white",
          fontSize: 13,
          fontFamily: "monospace",
        }}
      >
        <div>xz: ({xz.x.toFixed(2)}, {xz.y.toFixed(2)})</div>
        <div>pos: ({coords.x.toFixed(2)}, {coords.y.toFixed(2)}, {coords.z.toFixed(2)})</div>
      </div>
    </div>
  );
}
