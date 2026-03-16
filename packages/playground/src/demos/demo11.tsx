import { useState } from "react";
import { Scene3D, vec3, Vec3 } from "uzay";
import {
  Scene3DView,
  Camera3D,
  Point3D,
  Line3D,
  Sphere3D,
  Overlay3D,
  Axes3D,
  Grid3D,
} from "uzay/react";

const COLORS = {
  ray: "#ff6b6b",
  rayDir: "#ff8787",
  sphere: "#4dabf7",
  hit: "#b95bfc",
};

const scene = new Scene3D();

// Ray: defined by an origin point and a direction point (both draggable)
const rayOriginAtom = scene.atom(vec3(-6, 3, 2));
const rayDirPointAtom = scene.atom(vec3(2, 1, -1));

// Sphere: center is draggable, radius controlled by slider
const sphereCenterAtom = scene.atom(vec3(0, 0, 0));
const sphereRadiusAtom = scene.atom(2.5);

// Compute ray direction (normalized)
const rayDirAtom = scene.atom((get) => {
  const origin = get(rayOriginAtom);
  const target = get(rayDirPointAtom);
  return Vec3.normalized(Vec3.subtract(target, origin));
});

// Sphere-line intersection
// Solve |origin + t * dir - center|^2 = r^2
const intersectionAtom = scene.atom((get) => {
  const origin = get(rayOriginAtom);
  const dir = get(rayDirAtom);
  const center = get(sphereCenterAtom);
  const r = get(sphereRadiusAtom);

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
    // Tangent: single intersection
    points.push(Vec3.add(origin, Vec3.scaled(dir, t1)));
  } else {
    points.push(Vec3.add(origin, Vec3.scaled(dir, t1)));
    points.push(Vec3.add(origin, Vec3.scaled(dir, t2)));
  }

  return { hit: true as const, points };
});

// Extend the ray visually past the direction point
const rayExtentAtom = scene.atom((get) => {
  const origin = get(rayOriginAtom);
  const dir = get(rayDirAtom);
  return Vec3.add(origin, Vec3.scaled(dir, 20));
});

const rayBackAtom = scene.atom((get) => {
  const origin = get(rayOriginAtom);
  const dir = get(rayDirAtom);
  return Vec3.add(origin, Vec3.scaled(dir, -5));
});

// Intersection point atoms (for rendering)
const hit1Atom = scene.atom((get) => {
  const result = get(intersectionAtom);
  return result.points[0] ?? vec3(0, 0, 0);
});

const hit2Atom = scene.atom((get) => {
  const result = get(intersectionAtom);
  return result.points[1] ?? vec3(0, 0, 0);
});

const hasHitAtom = scene.atom((get) => get(intersectionAtom).hit);
const hasTwoHitsAtom = scene.atom(
  (get) => get(intersectionAtom).points.length === 2
);

// Use radius to show/hide intersection points (Point3D has no `visible` prop)
const hit1RadiusAtom = scene.atom((get) => (get(hasHitAtom) ? 2.5 : 0));
const hit2RadiusAtom = scene.atom((get) => (get(hasTwoHitsAtom) ? 2.5 : 0));

// Labels
const labelStyle =
  "font-size: 12px; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 3px;";

const hit1LabelAtom = scene.atom((get) => {
  const p = get(hit1Atom);
  return String.raw`(${p.x.toFixed(2)},\; ${p.y.toFixed(2)},\; ${p.z.toFixed(2)})`;
});

const hit2LabelAtom = scene.atom((get) => {
  const p = get(hit2Atom);
  return String.raw`(${p.x.toFixed(2)},\; ${p.y.toFixed(2)},\; ${p.z.toFixed(2)})`;
});

const statusLabelAtom = scene.atom((get) => {
  const result = get(intersectionAtom);
  if (!result.hit) return String.raw`\text{No intersection}`;
  if (result.points.length === 1) return String.raw`\text{Tangent (1 point)}`;
  return String.raw`\text{2 intersections}`;
});

export default function Demo11() {
  const [radius, setRadius] = useState(2.5);
  const [opacity, setOpacity] = useState(0.3);

  const handleRadiusChange = (value: number) => {
    setRadius(value);
    sphereRadiusAtom.set(value);
  };

  const sliderStyle = { color: "white", fontSize: 13 } as const;
  const rowStyle = {
    display: "flex",
    alignItems: "center",
    gap: 8,
  } as const;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#141414",
        position: "relative",
      }}
    >
      <Scene3DView scene={scene} style={{ width: "100%", height: "100%" }}>
        <Camera3D
          position={vec3(10, 8, 10)}
          lookAt={vec3(0, 0, 0)}
          fov={55}
          active
        />

        <Axes3D x={[-8, 8]} y={[-8, 8]} z={[-8, 8]} thickness={0.7} />
        <Grid3D
          plane="xz"
          range1={[-8, 8]}
          range2={[-8, 8]}
          color="#333"
          thickness={2}
        />

        {/* Sphere */}
        <Sphere3D
          center={sphereCenterAtom}
          radius={sphereRadiusAtom}
          color={COLORS.sphere}
          opacity={opacity}
          pointerEvents="none"
        />

        {/* Ray line (extended in both directions) */}
        <Line3D
          start={rayBackAtom}
          end={rayExtentAtom}
          color={COLORS.ray}
          thickness={1}
          pointerEvents="none"
        />

        {/* Ray origin point (draggable) */}
        <Point3D
          coords={rayOriginAtom}
          color={COLORS.ray}
          radius={2.5}
          draggable="xyz"
        />
        <Overlay3D
          position={rayOriginAtom}
          format="text"
          content="ray origin"
          anchor="bottom"
          offset={{ x: 0, y: -8 }}
          style={`color: ${COLORS.ray}; ${labelStyle}`}
        />

        {/* Ray direction point (draggable) */}
        <Point3D
          coords={rayDirPointAtom}
          color={COLORS.rayDir}
          radius={2}
          draggable="xyz"
        />
        <Overlay3D
          position={rayDirPointAtom}
          format="text"
          content="direction"
          anchor="bottom"
          offset={{ x: 0, y: -8 }}
          style={`color: ${COLORS.rayDir}; ${labelStyle}`}
        />

        {/* Sphere center (draggable) */}
        <Point3D
          coords={sphereCenterAtom}
          color={COLORS.sphere}
          radius={2}
          draggable="xyz"
        />

        {/* Intersection points (radius=0 when no hit) */}
        <Point3D
          coords={hit1Atom}
          color={COLORS.hit}
          radius={hit1RadiusAtom}
          draggable="none"
        />
        <Overlay3D
          position={hit1Atom}
          format="latex"
          content={hit1LabelAtom}
          anchor="bottom"
          offset={{ x: 0, y: -10 }}
          style={`color: ${COLORS.hit}; ${labelStyle}`}
          visible={hasHitAtom}
        />

        <Point3D
          coords={hit2Atom}
          color={COLORS.hit}
          radius={hit2RadiusAtom}
          draggable="none"
        />
        <Overlay3D
          position={hit2Atom}
          format="latex"
          content={hit2LabelAtom}
          anchor="bottom"
          offset={{ x: 0, y: -10 }}
          style={`color: ${COLORS.hit}; ${labelStyle}`}
          visible={hasTwoHitsAtom}
        />

        {/* Status label near sphere */}
        <Overlay3D
          position={sphereCenterAtom}
          format="latex"
          content={statusLabelAtom}
          anchor="top"
          offset={{ x: 0, y: 10 }}
          style={`color: #ccc; ${labelStyle}`}
        />
      </Scene3DView>

      {/* Controls */}
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
            onChange={(e) => handleRadiusChange(parseFloat(e.target.value))}
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
