import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Scene3D as Scene3DCore } from "../core/scene3d";
import { View3D } from "../core/view3d";
import type { ItemId, ItemInstanceOf } from "../core/common-types/item-registry";
import { SceneContext, CameraRegistryContext, type CameraRegistry } from "./context";

export type Scene3DViewProps = {
  scene?: Scene3DCore;
  className?: string;
  style?: CSSProperties;
  children?: React.ReactNode;
};

export function Scene3DView({ scene: sceneProp, className, style, children }: Scene3DViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [internalScene] = useState(() => sceneProp ? null : new Scene3DCore());
  const scene = sceneProp ?? internalScene!;

  const [ready, setReady] = useState(false);
  const [registry, setRegistry] = useState<CameraRegistry | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // All mutable state lives here, inside the effect closure
    let fallbackCam: ItemInstanceOf<"camera3d"> | null;
    let activeCamId: ItemId;
    const registeredCameras = new Set<ItemId>();

    // Create fallback camera + view
    const fallback = scene.create("camera3d", {});
    fallbackCam = fallback as ItemInstanceOf<"camera3d">;
    activeCamId = fallback.id;
    const view = new View3D(scene, fallback.id, containerRef.current);

    function switchTo(id: ItemId) {
      // Guard against stale IDs (e.g. after HMR re-mount)
      if (!scene.items.has(id)) return;
      view.changeActiveCam(id);
      activeCamId = id;

      if (fallbackCam) {
        scene.remove(fallbackCam as any);
        fallbackCam = null;
      }
    }

    // Build the registry that Camera3D children will use
    const reg: CameraRegistry = {
      registerCamera(id: ItemId, active: boolean) {
        registeredCameras.add(id);

        if (active || registeredCameras.size === 1) {
          switchTo(id);
        }
      },
      unregisterCamera(id: ItemId) {
        registeredCameras.delete(id);

        if (activeCamId === id) {
          if (registeredCameras.size > 0) {
            const nextId = registeredCameras.values().next().value!;
            view.changeActiveCam(nextId);
            activeCamId = nextId;
          } else {
            const fb = scene.create("camera3d", {});
            fallbackCam = fb as ItemInstanceOf<"camera3d">;
            view.changeActiveCam(fb.id);
            activeCamId = fb.id;
          }
        }
      },
      activateCamera(id: ItemId) {
        if (!registeredCameras.has(id)) return;
        switchTo(id);
      },
    };

    setRegistry(reg);
    setReady(true);

    return () => {
      view.dispose();
      setReady(false);
      setRegistry(null);

      if (fallbackCam) {
        scene.remove(fallbackCam as any);
      }
    };
  }, [scene]);

  return (
    <SceneContext.Provider value={scene}>
      <CameraRegistryContext.Provider value={registry}>
        <div
          ref={containerRef}
          className={className}
          style={{ position: "relative", ...style }}
        />
        {ready && children}
      </CameraRegistryContext.Provider>
    </SceneContext.Provider>
  );
}
