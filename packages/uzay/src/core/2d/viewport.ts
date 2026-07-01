import { vec2, type Vec2 } from "../shared/types/vec2";
import type { Viewport2D } from "./types/view-context";

// Visible vertical extent (in world units) at zoom = 1. The horizontal extent
// follows from the container aspect ratio.
export const BASE_VERTICAL_HALF_SPAN = 5;

// Pure viewport math: everything needed to convert between world and screen
// space, derived from the container size and the active camera's center/zoom.
// No renderer objects involved, so the interaction system and every render
// backend share the exact same projection.
export function computeViewport2D({
  widthPx,
  heightPx,
  center,
  zoom,
}: {
  widthPx: number;
  heightPx: number;
  center: Vec2;
  zoom: number;
}): Viewport2D {
  const aspect = heightPx > 0 ? widthPx / heightPx : 1;
  const halfH = BASE_VERTICAL_HALF_SPAN / zoom;
  const halfW = (BASE_VERTICAL_HALF_SPAN * aspect) / zoom;
  const left = center.x - halfW;
  const right = center.x + halfW;
  const bottom = center.y - halfH;
  const top = center.y + halfH;
  const worldWidth = right - left;
  const worldHeight = top - bottom;
  const worldPerPixel = heightPx > 0 ? worldHeight / heightPx : 0;

  return {
    widthPx,
    heightPx,
    center,
    zoom,
    worldPerPixel,
    visibleWorldBounds: { left, right, bottom, top },
    worldToScreen: (point) => ({
      x: worldWidth !== 0 ? ((point.x - left) / worldWidth) * widthPx : 0,
      y: worldHeight !== 0 ? ((top - point.y) / worldHeight) * heightPx : 0,
    }),
    screenToWorld: (point) =>
      vec2(
        widthPx !== 0 ? left + (point.x / widthPx) * worldWidth : left,
        heightPx !== 0 ? top - (point.y / heightPx) * worldHeight : top
      ),
  };
}
