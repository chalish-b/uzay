import { useMemo } from "react";
import { Scene3D, vec3, Vec3 } from "uzay";
import { Scene3DView, useAtomState } from "uzay/react";

const COLORS = {
  ray: "#ff6b6b",
  rayDir: "#ff8787",
  sphere: "#4dabf7",
  hit: "#b95bfc",
};

const labelStyle =
  "font-size: 12px; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 3px;";

function createSphereLineScene() {
  const scene = new Scene3D();

  // Ray: origin + direction point (both draggable)
  const rayOrigin = scene.atom(vec3(-6, 3, 2));
  const rayDirPoint = scene.atom(vec3(4, 1, -1));

  // Sphere: center is draggable, radius + opacity controlled by sliders
  const sphereCenter = scene.atom(vec3(0, 0, 0));
  const sphereRadius = scene.atom(2.5);
  const sphereOpacity = scene.atom(0.3);

  // Derived: ray direction (normalized)
  const rayDir = scene.atom((get) => {
    const origin = get(rayOrigin);
    const target = get(rayDirPoint);
    return Vec3.normalized(Vec3.subtract(target, origin));
  });

  // Derived: sphere-line intersection
  // Solve |origin + t * dir - center|^2 = r^2
  const intersection = scene.atom((get) => {
    const origin = get(rayOrigin);
    const dir = get(rayDir);
    const center = get(sphereCenter);
    const r = get(sphereRadius);

    const oc = Vec3.subtract(origin, center);
    const a = Vec3.dot(dir, dir);
    const b = 2 * Vec3.dot(oc, dir);
    const c = Vec3.dot(oc, oc) - r * r;
    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
      return { hit: false as const, points: [] as Vec3[] };
    }

    const sqrtD = Math.sqrt(discriminant);
    const t1 = (-b - sqrtD) / (2 * a);
    const t2 = (-b + sqrtD) / (2 * a);

    const points: Vec3[] = [];
    if (Math.abs(t1 - t2) < 0.001) {
      points.push(Vec3.add(origin, Vec3.scaled(dir, t1)));
    } else {
      points.push(Vec3.add(origin, Vec3.scaled(dir, t1)));
      points.push(Vec3.add(origin, Vec3.scaled(dir, t2)));
    }

    return { hit: true as const, points };
  });

  // Derived atoms for rendering
  const rayExtent = scene.atom((get) =>
    Vec3.add(get(rayOrigin), Vec3.scaled(get(rayDir), 20))
  );
  const rayBack = scene.atom((get) =>
    Vec3.add(get(rayOrigin), Vec3.scaled(get(rayDir), -5))
  );

  const hit1 = scene.atom((get) => get(intersection).points[0] ?? vec3(0, 0, 0));
  const hit2 = scene.atom((get) => get(intersection).points[1] ?? vec3(0, 0, 0));
  const hasHit = scene.atom((get) => get(intersection).hit);
  const hasTwoHits = scene.atom((get) => get(intersection).points.length === 2);
  const hit1Radius = scene.atom((get) => (get(hasHit) ? 2.5 : 0));
  const hit2Radius = scene.atom((get) => (get(hasTwoHits) ? 2.5 : 0));

  // Build scene
  const camera = scene.create("camera3d", {
    position: vec3(10, 8, 10),
    lookAt: vec3(0, 0, 0),
    fov: 55,
  });

  scene.create("axes3d", { x: [-8, 8], y: [-8, 8], z: [-8, 8], thickness: 0.7 });
  scene.create("grid3d", {
    plane: "xz",
    range1: [-8, 8],
    range2: [-8, 8],
    thickness: 2,
  });

  // Sphere
  scene.create("sphere3d", {
    center: sphereCenter,
    radius: sphereRadius,
    color: COLORS.sphere,
    opacity: sphereOpacity,
    pointerEvents: "none",
  });

  // Ray line (extended both directions)
  scene.create("line3d", {
    start: rayBack,
    end: rayExtent,
    color: COLORS.ray,
    thickness: 1,
    pointerEvents: "none",
  });

  // Ray origin (draggable)
  scene.create("point3d", { coords: rayOrigin, color: COLORS.ray, radius: 2.5, draggable: "xyz" });
  scene.create("overlay3d", {
    position: rayOrigin,
    format: "text",
    content: "ray origin",
    anchor: "bottom",
    offset: { x: 0, y: -8 },
    style: `color: ${COLORS.ray}; ${labelStyle}`,
  });

  // Ray direction point (draggable)
  scene.create("point3d", { coords: rayDirPoint, color: COLORS.rayDir, radius: 2, draggable: "xyz" });
  scene.create("overlay3d", {
    position: rayDirPoint,
    format: "text",
    content: "direction",
    anchor: "bottom",
    offset: { x: 0, y: -8 },
    style: `color: ${COLORS.rayDir}; ${labelStyle}`,
  });

  // Sphere center (draggable)
  scene.create("point3d", { coords: sphereCenter, color: COLORS.sphere, radius: 2, draggable: "xyz" });

  // Intersection points
  scene.create("point3d", { coords: hit1, color: COLORS.hit, radius: hit1Radius, draggable: "none" });
  scene.create("overlay3d", {
    position: hit1,
    format: "latex",
    content: scene.atom((get) => {
      const p = get(hit1);
      return String.raw`(${p.x.toFixed(2)},\; ${p.y.toFixed(2)},\; ${p.z.toFixed(2)})`;
    }),
    anchor: "bottom",
    offset: { x: 0, y: -10 },
    style: `color: ${COLORS.hit}; ${labelStyle}`,
    visible: hasHit,
  });

  scene.create("point3d", { coords: hit2, color: COLORS.hit, radius: hit2Radius, draggable: "none" });
  scene.create("overlay3d", {
    position: hit2,
    format: "latex",
    content: scene.atom((get) => {
      const p = get(hit2);
      return String.raw`(${p.x.toFixed(2)},\; ${p.y.toFixed(2)},\; ${p.z.toFixed(2)})`;
    }),
    anchor: "bottom",
    offset: { x: 0, y: -10 },
    style: `color: ${COLORS.hit}; ${labelStyle}`,
    visible: hasTwoHits,
  });

  // Status label near sphere
  scene.create("overlay3d", {
    position: sphereCenter,
    format: "latex",
    content: scene.atom((get) => {
      const result = get(intersection);
      if (!result.hit) return String.raw`\text{No intersection}`;
      if (result.points.length === 1) return String.raw`\text{Tangent (1 point)}`;
      return String.raw`\text{2 intersections}`;
    }),
    anchor: "top",
    offset: { x: 0, y: 10 },
    style: `color: #ccc; ${labelStyle}`,
  });

  return { scene, camera, sphereRadius, sphereOpacity };
}

export default function Demo11() {
  const { scene, camera, sphereRadius, sphereOpacity } = useMemo(
    () => createSphereLineScene(),
    []
  );

  const [radius, setRadius] = useAtomState(sphereRadius);
  const [opacity, setOpacity] = useAtomState(sphereOpacity);

  const sliderStyle = { color: "white", fontSize: 13 } as const;
  const rowStyle = { display: "flex", alignItems: "center", gap: 8 } as const;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#141414",
        position: "relative",
      }}
    >
      <Scene3DView scene={scene} camera={camera} style={{ width: "100%", height: "100%" }} />

      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          background: "rgba(0,0,0,0.65)",
          padding: "10px 14px",
          borderRadius: 6,
          minWidth: 200,
        }}
      >
        <span style={{ ...sliderStyle, fontWeight: "bold" }}>
          Sphere-Line Intersection
        </span>
        <div style={rowStyle}>
          <label style={{ ...sliderStyle, minWidth: 50 }}>Radius</label>
          <input
            type="range"
            min="0.3"
            max="6"
            step="0.1"
            value={radius}
            onChange={(e) => setRadius(parseFloat(e.target.value))}
          />
          <span style={{ ...sliderStyle, minWidth: 32 }}>
            {radius.toFixed(1)}
          </span>
        </div>
        <div style={rowStyle}>
          <label style={{ ...sliderStyle, minWidth: 50 }}>Opacity</label>
          <input
            type="range"
            min="0.05"
            max="1"
            step="0.05"
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
          />
          <span style={{ ...sliderStyle, minWidth: 32 }}>
            {opacity.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
