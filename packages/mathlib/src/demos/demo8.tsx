import { useEffect, useRef } from "react";
import { Scene3D } from "../core/scene3d";
import { Vec3, vec3 } from "../core/common-types/vec3";
import { View3D } from "../core/view3d";

// Compute centroid (center of mass) of triangle
function centroid(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  return vec3((a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3, (a.z + b.z + c.z) / 3);
}

// Compute circumcenter (center of circumscribed circle)
function circumcenter(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  // Using barycentric coordinates formula
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 0.0001) return centroid(a, b, c); // Degenerate case

  const ax2 = a.x * a.x + a.y * a.y;
  const bx2 = b.x * b.x + b.y * b.y;
  const cx2 = c.x * c.x + c.y * c.y;

  const ux = (ax2 * (b.y - c.y) + bx2 * (c.y - a.y) + cx2 * (a.y - b.y)) / d;
  const uy = (ax2 * (c.x - b.x) + bx2 * (a.x - c.x) + cx2 * (b.x - a.x)) / d;

  return vec3(ux, uy, (a.z + b.z + c.z) / 3);
}

// Compute incenter (center of inscribed circle)
function incenter(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  const ab = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2);
  const bc = Math.sqrt((c.x - b.x) ** 2 + (c.y - b.y) ** 2 + (c.z - b.z) ** 2);
  const ca = Math.sqrt((a.x - c.x) ** 2 + (a.y - c.y) ** 2 + (a.z - c.z) ** 2);
  const p = ab + bc + ca;

  if (p < 0.0001) return centroid(a, b, c);

  return vec3(
    (bc * a.x + ca * b.x + ab * c.x) / p,
    (bc * a.y + ca * b.y + ab * c.y) / p,
    (bc * a.z + ca * b.z + ab * c.z) / p
  );
}

export default function Demo8() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const scene = new Scene3D();

    // Triangle vertices - draggable on XY plane
    const vertexA = scene.create("point3d", {
      coords: vec3(-3, -2, 0),
      color: "#ff6b6b",
      radius: 3,
      draggable: "xy",
    });

    const vertexB = scene.create("point3d", {
      coords: vec3(3, -2, 0),
      color: "#4ecdc4",
      radius: 3,
      draggable: "xy",
    });

    const vertexC = scene.create("point3d", {
      coords: vec3(0, 3, 0),
      color: "#45b7d1",
      radius: 3,
      draggable: "xy",
    });

    // Triangle edges
    scene.create("line3d", {
      start: vertexA.coords,
      end: vertexB.coords,
      color: "#888",
      thickness: 1,
    });
    scene.create("line3d", {
      start: vertexB.coords,
      end: vertexC.coords,
      color: "#888",
      thickness: 1,
    });
    scene.create("line3d", {
      start: vertexC.coords,
      end: vertexA.coords,
      color: "#888",
      thickness: 1,
    });

    // Centroid - computed point (not draggable)
    const centroidPoint = scene.create("point3d", {
      coords: scene.atom((get) =>
        centroid(get(vertexA.coords), get(vertexB.coords), get(vertexC.coords))
      ),
      color: "#ffd93d",
      radius: 2.5,
      draggable: "none",
    });

    // Medians (lines from vertices to opposite midpoints, passing through centroid)
    scene.create("line3d", {
      start: vertexA.coords,
      end: scene.atom((get) => {
        const b = get(vertexB.coords);
        const c = get(vertexC.coords);
        return vec3((b.x + c.x) / 2, (b.y + c.y) / 2, (b.z + c.z) / 2);
      }),
      color: "#ffd93d",
      thickness: 0.5,
    });
    scene.create("line3d", {
      start: vertexB.coords,
      end: scene.atom((get) => {
        const a = get(vertexA.coords);
        const c = get(vertexC.coords);
        return vec3((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2);
      }),
      color: "#ffd93d",
      thickness: 0.5,
    });
    scene.create("line3d", {
      start: vertexC.coords,
      end: scene.atom((get) => {
        const a = get(vertexA.coords);
        const b = get(vertexB.coords);
        return vec3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
      }),
      color: "#ffd93d",
      thickness: 0.5,
    });

    // Circumcenter
    scene.create("point3d", {
      coords: scene.atom((get) =>
        circumcenter(get(vertexA.coords), get(vertexB.coords), get(vertexC.coords))
      ),
      color: "#a29bfe",
      radius: 2.5,
      draggable: "none",
    });

    // Incenter
    scene.create("point3d", {
      coords: scene.atom((get) =>
        incenter(get(vertexA.coords), get(vertexB.coords), get(vertexC.coords))
      ),
      color: "#55efc4",
      radius: 2.5,
      draggable: "none",
    });

    // Grid
    scene.create("grid3d", {
      plane: "xy",
      offset: -0.01,
      range1: [-6, 6],
      range2: [-6, 6],
      color: "#222",
      thickness: 1.5,
    });

    const camera = scene.create("camera3d", {
      position: vec3(0, 0, 12),
      lookAt: vec3(0, 0, 0),
    });
    const view = new View3D(scene, camera.id, containerRef.current);

    return () => view.dispose();
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: "#0a0a0a" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          color: "#888",
          fontFamily: "system-ui, sans-serif",
          fontSize: 14,
        }}
      >
        <div style={{ marginBottom: 8, color: "#fff" }}>
          Triangle Centers Explorer
        </div>
        <div style={{ marginBottom: 12 }}>Drag the vertices to explore</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span><span style={{ color: "#ff6b6b" }}>●</span> <span style={{ color: "#4ecdc4" }}>●</span> <span style={{ color: "#45b7d1" }}>●</span> Vertices (drag me!)</span>
          <span><span style={{ color: "#ffd93d" }}>●</span> Centroid (medians meet)</span>
          <span><span style={{ color: "#a29bfe" }}>●</span> Circumcenter</span>
          <span><span style={{ color: "#55efc4" }}>●</span> Incenter</span>
        </div>
      </div>
    </div>
  );
}
