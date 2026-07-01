import type { Vec2 } from "../../shared/types/vec2";

export type ScreenPoint2D = {
  x: number;
  y: number;
};

export type VisibleWorldBounds2D = {
  left: number;
  right: number;
  bottom: number;
  top: number;
};

export type Viewport2D = {
  widthPx: number;
  heightPx: number;
  center: Vec2;
  zoom: number;
  worldPerPixel: number;
  visibleWorldBounds: VisibleWorldBounds2D;
  worldToScreen: (point: Vec2) => ScreenPoint2D;
  screenToWorld: (point: ScreenPoint2D) => Vec2;
};
