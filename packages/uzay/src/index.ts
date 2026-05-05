// Core classes
export { Scene3D } from "./core/3d/scene3d"
export { View3D } from "./core/3d/view3d"
export { Scene2D } from "./core/2d/scene2d"
export { View2D } from "./core/2d/view2d"

// Vector utilities
export { vec3, Vec3 } from "./core/shared/types/vec3"
export { vec2, Vec2 } from "./core/shared/types/vec2"

// Item handle types
export type { Point3D } from "./core/3d/items/point3d"
export type { Line3D } from "./core/3d/items/line3d"
export type { Sphere3D } from "./core/3d/items/sphere3d"
export type { Axes3D } from "./core/3d/items/axes3d"
export type { Grid3D } from "./core/3d/items/grid3d"
export type { Camera3D } from "./core/3d/items/camera3d"
export type { ParametricFunction3D } from "./core/3d/items/parametric-function3d"
export type { Vector3D } from "./core/3d/items/vector3d"
export type { Overlay3D } from "./core/3d/items/overlay3d"
export type { Plane3D } from "./core/3d/items/plane3d"
export type { Surface3D } from "./core/3d/items/surface3d"

// 2D item handle types
export type { Camera2D } from "./core/2d/items/camera2d"
export type { Point2D } from "./core/2d/items/point2d"
export type { Grid2D } from "./core/2d/items/grid2d"
export type { Axes2D } from "./core/2d/items/axes2d"
export type { Line2D } from "./core/2d/items/line2d"
export type { Vector2D } from "./core/2d/items/vector2d"

// Atom types and utilities
export type { BoundAtom, SceneAtom, AtomLikeInput } from "./core/shared/atom-wrapper"
export { ensureAtom } from "./core/shared/atom-wrapper"

// Item types
export type { ItemKind, ItemId, ItemOptions, ItemInstance, ItemSnapshot } from "./core/3d/types/item-registry"

// Event types
export type { DragEvent, ClickEvent, HoverEvent, DragHandler, ClickHandler, HoverHandler } from "./core/3d/types/interaction-events"

// Overlay types
export type { OverlayFormat, OverlayAnchor } from "./core/shared/types/overlay"

// Constructions
export { tangentLine, curvePoint, surfacePoint, surfaceNormal } from "./core/3d/constructions"
