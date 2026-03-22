// Core classes
export { Scene3D } from "./core/scene3d"
export { View3D } from "./core/view3d"

// Vector utilities
export { vec3, Vec3 } from "./core/common-types/vec3"
export { vec2, Vec2 } from "./core/common-types/vec2"

// Item handle types
export type { Point3D } from "./core/items/point3d"
export type { Line3D } from "./core/items/line3d"
export type { Sphere3D } from "./core/items/sphere3d"
export type { Axes3D } from "./core/items/axes3d"
export type { Grid3D } from "./core/items/grid3d"
export type { Camera3D } from "./core/items/camera3d"
export type { ParametricFunction3D } from "./core/items/parametric-function3d"
export type { Vector3D } from "./core/items/vector3d"
export type { Overlay3D } from "./core/items/overlay3d"
export type { Plane3D } from "./core/items/plane3d"
export type { Surface3D } from "./core/items/surface3d"

// Atom types
export type { BoundAtom, SceneAtom, AtomLikeInput } from "./core/atom-wrapper"

// Item types
export type { ItemKind, ItemId, ItemOptions, ItemInstance, ItemSnapshot } from "./core/common-types/item-registry"

// Event types
export type { DragEvent, ClickEvent, HoverEvent, DragHandler, ClickHandler, HoverHandler } from "./core/common-types/interaction-events"

// Overlay types
export type { OverlayFormat, OverlayAnchor } from "./core/common-types/overlay"

// Constructions
export { tangentLine, curvePoint } from "./constructions"
