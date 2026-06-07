import { useEffect, useRef, type CSSProperties } from "react";
import { Scene2D } from "../core/2d/scene2d";
import { View2D } from "../core/2d/view2d";
import type { ItemInstanceOf } from "../core/2d/types/item-registry";

export type Scene2DViewProps = {
  scene: Scene2D;
  camera: ItemInstanceOf<"camera2d">;
  className?: string;
  style?: CSSProperties;
};

export function Scene2DView({
  scene,
  camera,
  className,
  style,
}: Scene2DViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View2D | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const view = new View2D(scene, camera.id, containerRef.current);
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
