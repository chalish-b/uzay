import { useMemo } from "react";
import type { ReactNode } from "react";
import { Scene3D, ensureAtom, surfaceNormal, surfacePoint, vec2, vec3 } from "uzay";
import type { AtomLikeInput, Scene3D as Scene3DType, Vec3 } from "uzay";
import { Camera3D, Scene3DView, useAtomValue } from "uzay/react";

// Custom user-written construction: drops a vertical line from a point to the xz plane
function dropLine(
  scene: Scene3DType,
  options: {
    coords: AtomLikeInput<Vec3>;
    color?: AtomLikeInput<string>;
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

function createSurfaceScene() {
  const scene = new Scene3D();

  scene.create("axes3d", {
    x: [-5, 5],
    y: [-1, 5],
    z: [-5, 5],
    thickness: 0.45,
    tickmarks: true,
    arrows: true,
  });

  scene.create("grid3d", {
    plane: "xz",
    range1: [-5, 5],
    range2: [-5, 5],
    color: "white",
    opacity: 0.12,
    thickness: 2,
  });

  const f = (x: number, z: number) => Math.sin(x) * Math.cos(z) + 2;

  scene.create("surface3d", {
    f,
    xRange: [-5, 5],
    zRange: [-5, 5],
    color: "steelblue",
    opacity: 0.9,
    samples: 56,
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
  dropLine(scene, { coords: sp.point.coords, color: "rgb(255, 255, 255)" });

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
    color: "white",
    radius: 2.5,
    draggable: "xz",
  });

  return { scene, sp };
}

function createCurveScene(phase: number) {
  const scene = new Scene3D();

  scene.create("axes3d", {
    x: [-4, 4],
    y: [-4, 4],
    z: [-4, 4],
    thickness: 0.4,
    tickmarks: false,
    arrows: true,
  });

  scene.create("grid3d", {
    plane: "xz",
    range1: [-4, 4],
    range2: [-4, 4],
    color: "white",
    opacity: 0.1,
    thickness: 1.5,
  });

  scene.create("parametricfunction3d", {
    f: (t: number) => vec3(
      2.7 * Math.cos(t + phase),
      1.5 * Math.sin(2 * t),
      2.7 * Math.sin(t + phase),
    ),
    tStart: 0,
    tEnd: Math.PI * 2,
    color: "mediumseagreen",
    thickness: 2.4,
    samples: 220,
  });

  scene.create("sphere3d", {
    center: vec3(0, 0, 0),
    radius: 0.35,
    color: "gold",
    opacity: 0.9,
  });

  return scene;
}

function createVectorScene() {
  const scene = new Scene3D();

  scene.create("axes3d", {
    x: [-3.5, 3.5],
    y: [-3.5, 3.5],
    z: [-3.5, 3.5],
    thickness: 0.4,
    tickmarks: true,
    arrows: true,
  });

  scene.create("grid3d", {
    plane: "xy",
    range1: [-3, 3],
    range2: [-3, 3],
    color: "white",
    opacity: 0.08,
    thickness: 1.5,
  });

  scene.create("plane3d", {
    normal: vec3(0, 0, 1),
    point: vec3(0, 0, -0.6),
    width: 6,
    height: 6,
    color: "slateblue",
    opacity: 0.22,
  });

  const vec = scene.create("vector3d", {
    origin: vec3(0, 0, 0),
    vector: vec3(1.7, 1.2, 0),
    color: "tomato",
    thickness: 1,
    draggable: "xy",
  });

  return { scene, vec };
}

function EmbeddedScene({
  children,
  height = 300,
}: {
  children: ReactNode;
  height?: number;
}) {
  return (
    <div className="article-embed" style={{ height }}>
      {children}
    </div>
  );
}

function SurfaceEmbed() {
  const { scene, sp } = useMemo(() => createSurfaceScene(), []);
  const xz = useAtomValue(sp.xz);
  const coords = useAtomValue(sp.point.coords);

  return (
    <EmbeddedScene height={360}>
      <Scene3DView scene={scene} style={{ width: "100%", height: "100%" }}>
        <Camera3D
          active
          position={vec3(7, 5, 7)}
          lookAt={vec3(0, 1.5, 0)}
          fov={42}
        />
      </Scene3DView>
      <div className="embed-readout">
        <div>xz: ({xz.x.toFixed(2)}, {xz.y.toFixed(2)})</div>
        <div>pos: ({coords.x.toFixed(2)}, {coords.y.toFixed(2)}, {coords.z.toFixed(2)})</div>
      </div>
    </EmbeddedScene>
  );
}

function CurveEmbed({ phase }: { phase: number }) {
  const scene = useMemo(() => createCurveScene(phase), [phase]);

  return (
    <EmbeddedScene height={260}>
      <Scene3DView scene={scene} style={{ width: "100%", height: "100%" }}>
        <Camera3D
          active
          position={vec3(5, 4, 6)}
          lookAt={vec3(0, 0, 0)}
          fov={45}
        />
      </Scene3DView>
    </EmbeddedScene>
  );
}

function VectorEmbed() {
  const { scene, vec } = useMemo(() => createVectorScene(), []);
  const coords = useAtomValue(vec.vector);

  return (
    <EmbeddedScene height={300}>
      <Scene3DView scene={scene} style={{ width: "100%", height: "100%" }}>
        <Camera3D
          active
          position={vec3(4, 4, 5)}
          lookAt={vec3(0, 0, 0)}
          fov={45}
        />
      </Scene3DView>
      <div className="embed-readout">
        tip: ({coords.x.toFixed(2)}, {coords.y.toFixed(2)}, {coords.z.toFixed(2)})
      </div>
    </EmbeddedScene>
  );
}

export default function Demo1() {
  return (
    <main className="article-page">
      <article className="article-shell">
        <p className="article-kicker">Uzay playground</p>
        <h1>Document-style embedded demos</h1>
        <p>
          This page is a stand-in for a math article that mounts several Uzay scenes inline.
          It is intentionally scrollable and each scene owns a small, non-fullscreen canvas.
        </p>

        <SurfaceEmbed />

        <p>
          The first embed is the old surface-point sandbox running inside a fixed-height
          article window. The point projection, normal, and readout all belong to this
          scene instance only.
        </p>

        <div className="article-two-up">
          <CurveEmbed phase={0} />
          <CurveEmbed phase={Math.PI / 4} />
        </div>

        <p>
          These two curve embeds intentionally use the same component twice with different
          scene instances. Orbiting one canvas should not move the other, and remounting
          this tab should clean up both WebGL renderers.
        </p>

        <VectorEmbed />

        <p>
          The last embed keeps a draggable point and vector in a smaller window, which is
          closer to the kind of interaction an explanatory page would place between
          paragraphs.
        </p>
      </article>
    </main>
  );
}
