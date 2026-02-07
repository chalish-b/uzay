import { useEffect, useRef } from "react";
import { Scene3D } from "../core/scene3d";
import { Vec3, vec3 } from "../core/common-types/vec3";
import { View3D } from "../core/view3d";

// This is the sandbox demo for testing stuff

export default function Demo1() {
  const containerRef = useRef<HTMLDivElement>(null);

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
    scene.create("point3d", {
      coords: constrainedCoords,
      color: "gold",
      radius: 3,
      draggable: "xyz",
    });

    // Semi-transparent sphere so you can see the point
    scene.create("sphere3d", {
      center: sphereCenter,
      radius: sphereRadius,
      color: "#4488ff",
      opacity: 0.9,
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

  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: "#141414" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }}></div>
    </div>
  );
}
