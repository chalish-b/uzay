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

  // Scene: use provided or create internally via lazy useState
  const [internalScene] = useState(() => sceneProp ? null : new Scene3DCore());
  const scene = sceneProp ?? internalScene!;

  // View3D, fallback camera, and camera tracking state stored in refs
  const viewRef = useRef<View3D | null>(null);
  const fallbackCamRef = useRef<ItemInstanceOf<"camera3d"> | null>(null);
  const registeredCamerasRef = useRef<Set<ItemId>>(new Set());
  const activeCamIdRef = useRef<ItemId | null>(null);

  // Tracks whether the View3D has been initialized (drives children rendering)
  const [ready, setReady] = useState(false);

  // Camera registry callbacks stored in a ref so the stable registry
  // always delegates to the latest version
  const registryRef = useRef<CameraRegistry>(null!);
  registryRef.current = {
    registerCamera(id: ItemId, active: boolean) {
      const registered = registeredCamerasRef.current;
      registered.add(id);

      const view = viewRef.current;
      if (!view) return;

      if (active || registered.size === 1) {
        view.changeActiveCam(id);
        activeCamIdRef.current = id;

        if (fallbackCamRef.current) {
          scene.remove(fallbackCamRef.current as any);
          fallbackCamRef.current = null;
        }
      }
    },
    unregisterCamera(id: ItemId) {
      const registered = registeredCamerasRef.current;
      registered.delete(id);

      const view = viewRef.current;
      if (!view) return;

      if (activeCamIdRef.current === id) {
        if (registered.size > 0) {
          const nextId = registered.values().next().value!;
          view.changeActiveCam(nextId);
          activeCamIdRef.current = nextId;
        } else {
          const fallback = scene.create("camera3d", {});
          fallbackCamRef.current = fallback as ItemInstanceOf<"camera3d">;
          view.changeActiveCam(fallback.id);
          activeCamIdRef.current = fallback.id;
        }
      }
    },
  };

  // Stable registry object that delegates to current ref
  const [stableRegistry] = useState<CameraRegistry>(() => ({
    registerCamera: (id: ItemId, active: boolean) => registryRef.current.registerCamera(id, active),
    unregisterCamera: (id: ItemId) => registryRef.current.unregisterCamera(id),
  }));

  // Initialize View3D on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const fallback = scene.create("camera3d", {});
    fallbackCamRef.current = fallback as ItemInstanceOf<"camera3d">;
    activeCamIdRef.current = fallback.id;

    const view = new View3D(scene, fallback.id, containerRef.current);
    viewRef.current = view;

    setReady(true);

    return () => {
      view.dispose();
      viewRef.current = null;
      setReady(false);

      if (fallbackCamRef.current) {
        scene.remove(fallbackCamRef.current as any);
        fallbackCamRef.current = null;
      }

      registeredCamerasRef.current.clear();
      activeCamIdRef.current = null;
    };
  }, [scene]);

  return (
    <SceneContext.Provider value={scene}>
      <CameraRegistryContext.Provider value={stableRegistry}>
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
