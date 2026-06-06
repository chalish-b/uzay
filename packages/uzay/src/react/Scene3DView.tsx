import { useEffect, useRef, type CSSProperties } from "react";
import { Scene3D } from "../core/3d/scene3d";
import { View3D } from "../core/3d/view3d";
import type { ItemInstanceOf } from "../core/3d/types/item-registry";

export type Scene3DViewProps = {
  scene: Scene3D;
  camera: ItemInstanceOf<"camera3d">;
  className?: string;
  style?: CSSProperties;
};

export function Scene3DView({
  scene,
  camera,
  className,
  style,
}: Scene3DViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View3D | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const view = new View3D(scene, camera.id, containerRef.current);
    viewRef.current = view;

    return () => {
      viewRef.current = null;
      view.dispose();
    };
  }, [scene]);

  useEffect(() => {
    viewRef.current?.changeActiveCam(camera.id);
  }, [camera]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative", ...style }}
    />
  );
}
