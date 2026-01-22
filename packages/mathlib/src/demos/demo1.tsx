import { useEffect, useRef } from "react";
import { Scene3D } from "../core/scene3d";
import { vec3 } from "../core/common-types/vec3";
import { View3D } from "../core/view3d";

export default function Demo1() {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Init code. Since we don't have a react wrapper for the library, we just run all the code in useEffect
  useEffect(() => {
    if (!containerRef.current) return;
    const scene = new Scene3D();

    const xAtom = scene.atom(0);
    xAtom.sub(() => {
      if (inputRef.current) {
        inputRef.current.value = xAtom.get().toString();
      }
    });

    const handleInput = () => {
      if (inputRef.current) {
        xAtom.set(parseFloat(inputRef.current.value));
      }
    };
    inputRef.current?.addEventListener("input", handleInput);

    const pointAtom = scene.create("point3d", {
      coords: scene.atom((get) =>
        vec3(get(xAtom), Math.sin(get(xAtom)), Math.cos(get(xAtom)))
      ),
      color: "gold",
      radius: 2,
    });
    const line = scene.create("line3d", {
      start: scene.atom((get) => vec3(get(xAtom), 0, 0)),
      end: pointAtom.coords,
      color: "gold",
      thickness: 1,
    });

    const helix = scene.create("parametricfunction3d", {
      f: (t) => vec3(t, Math.sin(t), Math.cos(t)),
      tStart: 0,
      tEnd: xAtom,
      color: "crimson",
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

    // Cleanup on unmount or HMR
    return () => {
      inputRef.current?.removeEventListener("input", handleInput);
      view.dispose();
    };
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: "#141414" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }}></div>
      {/* Input container */}
      <div style={{ position: "absolute", top: 0, left: 0 }}>
        <input
          ref={inputRef}
          type="range"
          min="0"
          max="10"
          step="0.1"
          value="0"
        />
      </div>
    </div>
  );
}
