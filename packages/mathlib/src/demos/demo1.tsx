import { useEffect, useRef, useState } from "react";
import { Scene3D } from "../core/scene3d";
import { Vec3, vec3 } from "../core/common-types/vec3";
import { View3D } from "../core/view3d";
import type { BoundAtom } from "../core/atom-wrapper";
import type { PrimitiveAtom } from "jotai";

// This is the sandbox demo for testing stuff

export default function Demo1() {
  const containerRef = useRef<HTMLDivElement>(null);
  const vectorLengthAtomRef = useRef<BoundAtom<PrimitiveAtom<number>> | null>(null);
  const [vectorLength, setVectorLength] = useState(10);

  // Init code. Since we don't have a react wrapper for the library, we just run all the code in useEffect
  useEffect(() => {
    if (!containerRef.current) return;
    const scene = new Scene3D();

    // Sphere parameters
    const sphereCenter = vec3(0, 4, 0);
    const sphereRadius = 4;

    // Spherical coordinate angles stored as atoms
    const thetaAtom = scene.atom(Math.PI / 4); // polar angle (0 to PI)
    const phiAtom = scene.atom(Math.PI / 4);   // azimuthal angle (0 to 2PI)

    // Derive cartesian coords on sphere surface from angles
    // Write function: project dragged position onto sphere, convert back to angles
    const constrainedCoords = scene.atom(
      (get) => {
        const theta = get(thetaAtom);
        const phi = get(phiAtom);
        return vec3(
          sphereCenter.x + sphereRadius * Math.sin(theta) * Math.cos(phi),
          sphereCenter.y + sphereRadius * Math.cos(theta),
          sphereCenter.z + sphereRadius * Math.sin(theta) * Math.sin(phi),
        );
      },
      (_get, set, next: Vec3) => {
        // Vector from sphere center to dragged position
        const dx = next.x - sphereCenter.x;
        const dy = next.y - sphereCenter.y;
        const dz = next.z - sphereCenter.z;
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (len < 0.001) return; // avoid singularity at center

        // Normalize and convert to spherical angles
        const nx = dx / len;
        const ny = dy / len;
        const nz = dz / len;
        set(thetaAtom, Math.acos(Math.max(-1, Math.min(1, ny))));
        set(phiAtom, Math.atan2(nz, nx));
      },
    );

    // The point, constrained to the sphere surface
    const point = scene.create("point3d", {
      coords: constrainedCoords,
      color: "gold",
      radius: 2,
      draggable: "xyz",
    });

    // Use ray-sphere intersection for accurate cursor tracking on drag
    const cx = sphereCenter.x, cy = sphereCenter.y, cz = sphereCenter.z;
    const r = sphereRadius;
    point.on("drag", (event) => {
      if (event.phase === "start" || event.phase === "end") return;
      const { origin: o, direction: d } = event.ray;
      const ocx = o.x - cx, ocy = o.y - cy, ocz = o.z - cz;
      const a = d.x * d.x + d.y * d.y + d.z * d.z;
      const b = 2 * (ocx * d.x + ocy * d.y + ocz * d.z);
      const c = ocx * ocx + ocy * ocy + ocz * ocz - r * r;
      const disc = b * b - 4 * a * c;
      // If ray hits sphere, use the intersection point.
      // If it misses, use the closest point on the ray to the sphere center,
      // projected onto the surface — so the point keeps tracking smoothly.
      const t = disc >= 0
        ? (-b - Math.sqrt(disc)) / (2 * a)
        : -b / (2 * a); // closest approach to center
      const hx = o.x + t * d.x - cx;
      const hy = o.y + t * d.y - cy;
      const hz = o.z + t * d.z - cz;
      const len = Math.sqrt(hx * hx + hy * hy + hz * hz);
      if (len < 0.001) return;
      thetaAtom.set(Math.acos(Math.max(-1, Math.min(1, hy / len))));
      phiAtom.set(Math.atan2(hz / len, hx / len));
    });

    // Semi-transparent sphere so you can see the point
    scene.create("sphere3d", {
      center: sphereCenter,
      radius: sphereRadius,
      color: "gray",
      opacity: 0.7,
      pointerEvents: "none",
    });

    // Origin point
    scene.create("point3d", {
      coords: vec3(0, 0, 0),
      color: "white",
      radius: 3,
      draggable: "none",
    });

    // Label for origin
    scene.create("overlay3d", {
      position: vec3(0, 0, 0),
      format: "latex",
      content: "O",
      anchor: "bottom",
      offset: { x: 0, y: -8 },
      style: "color: white; font-size: 16px;",
    });

    // Sphere center
    scene.create("point3d", {
      coords: sphereCenter,
      color: "red",
      radius: 3,
      draggable: "none",
    });

    // Label for sphere center
    scene.create("overlay3d", {
      position: sphereCenter,
      format: "latex",
      content: "C",
      anchor: "bottom",
      offset: { y: -8, x: 0 },
      style: "color: #ff6666; font-size: 16px;",
    });

    // Reactive label on the draggable point — shows live coordinates
    scene.create("overlay3d", {
      position: constrainedCoords,
      format: "latex",
      content: scene.atom(
        (get) => {
          const c = get(constrainedCoords);
          return String.raw`P = (${c.x.toFixed(1)},\; ${c.y.toFixed(1)},\; ${c.z.toFixed(1)})`;
        },
      ),
      anchor: "bottom",
      offset: { x: 0, y: -5 },
      style: "color: gold; font-size: 14px; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 3px;",
    });

    // Reactive label showing spherical angles (LaTeX)
    scene.create("overlay3d", {
      position: constrainedCoords,
      format: "latex",
      content: scene.atom(
        (get) => {
          const θ = get(thetaAtom);
          const φ = get(phiAtom);
          return String.raw`\theta = ${(θ * 180 / Math.PI).toFixed(0)}^\circ \quad \varphi = ${(φ * 180 / Math.PI).toFixed(0)}^\circ`;
        },
      ),
      anchor: "top",
      offset: { x: 0, y: 5 },
      style: "color: #aaa; font-size: 14px; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 3px;",
    });

    // Lines
    scene.create("line3d", {
      start: vec3(0, 0, 0),
      end: sphereCenter,
      color: "red",
      radius: 3,
      draggable: "none",
    });

    scene.create("line3d", {
      start: sphereCenter,
      end: constrainedCoords,
      color: "gold",
      radius: 3,
      draggable: "none",
    });

    scene.create("line3d", {
      start: vec3(0, 0, 0),
      end: constrainedCoords,
      color: "green",
      radius: 3,
      draggable: "none",
    });

    scene.create("point3d", {
      coords: vec3(10, 10, 0),
      color: "red",
      radius: 3,
    });

    // Vector with controllable length
    const vectorLengthAtom = scene.atom(10);
    vectorLengthAtomRef.current = vectorLengthAtom;
    vectorLengthAtom.sub(() => setVectorLength(vectorLengthAtom.get()));

    // Initial direction (normalized)
    const dirAtom = scene.atom(Vec3.normalized(vec3(10, 3, 0)));

    scene.create("vector3d", {
      origin: constrainedCoords,
      vector: scene.atom(
        (get) => Vec3.scaled(get(dirAtom), get(vectorLengthAtom)),
        (_get, set, next: Vec3) => {
          const len = Math.sqrt(Vec3.dot(next, next));
          if (len < 0.001) return;
          set(dirAtom, Vec3.normalized(next));
          set(vectorLengthAtom, len);
        },
      ),
      color: "cyan",
      thickness: 1,
    });

    // Axes and grid
    scene.create("axes3d", {
      x: [-10, 10],
      y: [-10, 10],
      z: [-10, 10],
      thickness: 0.7,
    });
    scene.create("grid3d", {
      plane: "xz",
      range1: [-10, 10],
      range2: [-10, 10],
      color: "#444",
      thickness: 2,
    });

    const camera = scene.create("camera3d", {
      position: vec3(10, 10, 10),
      lookAt: vec3(0, 0, 0),
    });
    const view = new View3D(scene, camera.id, containerRef.current);

    return () => {
      view.dispose();
    };
  }, []);

  // Sync slider state to atom
  useEffect(() => {
    vectorLengthAtomRef.current?.set(vectorLength);
  }, [vectorLength]);

  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: "#141414", position: "relative" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }}></div>
      <div style={{ position: "absolute", top: 16, left: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <label style={{ color: "white", fontSize: 14 }}>Vector Length</label>
        <input
          type="range"
          min="0"
          max="20"
          step="0.1"
          value={vectorLength}
          onChange={(e) => setVectorLength(parseFloat(e.target.value))}
        />
        <span style={{ color: "white", fontSize: 14, minWidth: 36 }}>{vectorLength.toFixed(1)}</span>
      </div>
    </div>
  );
}
