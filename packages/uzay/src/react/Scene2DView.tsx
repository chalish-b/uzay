import { useEffect, useRef, type CSSProperties } from "react";
import { Scene2D } from "../core/2d/scene2d";
import { View2D } from "../core/2d/view2d";
import type { Renderer2DKind } from "../core/2d/backend";
import type { ItemInstanceOf } from "../core/2d/types/item-registry";

export type Scene2DViewProps = {
  scene: Scene2D;
  camera: ItemInstanceOf<"camera2d">;
  renderer?: Renderer2DKind;
  className?: string;
  style?: CSSProperties;
};

export function Scene2DView({
  scene,
  camera,
  renderer,
  className,
  style,
}: Scene2DViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View2D | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const view = new View2D(scene, camera.id, containerRef.current, {
      renderer,
    });
    viewRef.current = view;

    return () => {
      viewRef.current = null;
      view.dispose();
    };
  }, [scene, renderer]);

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
