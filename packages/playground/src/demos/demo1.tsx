import { useMemo } from "react";
import { Scene3D, vec2, vec3, surfacePoint, surfaceNormal, ensureAtom } from "uzay";
import type { AtomLikeInput } from "uzay";
import type { Scene3D as Scene3DType } from "uzay";
import type { Vec3 } from "uzay";
import type { Color } from "uzay/src/core/common-types/colors";
import { Scene3DView, useAtomValue } from "uzay/react";

// Custom user-written construction: drops a vertical line from a point to the xz plane
function dropLine(
  scene: Scene3DType,
  options: {
    coords: AtomLikeInput<Vec3>;
    color?: AtomLikeInput<Color>;
  },
) {
  const coordsAtom = ensureAtom(scene.atom, options.coords);
  const colorAtom = ensureAtom(scene.atom, options.color ?? "gray");

  const groundAtom = scene.atom((get) => {
    const { x, z } = get(coordsAtom);
    return vec3(x, 0, z);
  });

  const line = scene.create("line3d", {
    start: coordsAtom,
    end: groundAtom,
    color: colorAtom,
  });

  const dot = scene.create("point3d", {
    coords: groundAtom,
    color: colorAtom,
    radius: 2,
    draggable: "none",
  });

  return {
    line,
    dot,
    dispose: () => {
      scene.remove(line);
      scene.remove(dot);
    },
  };
}

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
  sp.point.radius.set(4);

  surfaceNormal(scene, { f, xz: sp.xz, color: "tomato" });

  // Writable derived atom: reads the xz projection, writes back to sp.xz on drag
  const groundCoords = scene.atom(
    (get) => {
      const { x, z } = get(sp.point.coords);
      return vec3(x, 0, z);
    },
    (_get, set, newValue: Vec3) => {
      set(sp.xz, vec2(newValue.x, newValue.z));
    },
  );

  // Drop line using the writable ground coords
  scene.create("line3d", {
    start: sp.point.coords,
    end: groundCoords,
    color: "gray",
  });

  scene.create("point3d", {
    coords: groundCoords,
    color: "gray",
    radius: 2,
    draggable: "xz",
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
