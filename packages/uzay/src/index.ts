// Core classes
export { Scene3D } from "./core/scene3d"
export { View3D } from "./core/view3d"

// Vector utilities
export { vec3, Vec3 } from "./core/common-types/vec3"
export { vec2, Vec2 } from "./core/common-types/vec2"

// Item classes (for type annotations)
export { Point3D } from "./core/items/point3d"
export { Line3D } from "./core/items/line3d"
export { Sphere3D } from "./core/items/sphere3d"
export { Axes3D } from "./core/items/axes3d"
export { Grid3D } from "./core/items/grid3d"
export { Camera3D } from "./core/items/camera3d"
export { ParametricFunction3D } from "./core/items/parametric-function3d"
export { Vector3D } from "./core/items/vector3d"
export { Overlay3D } from "./core/items/overlay3d"
export { Plane3D } from "./core/items/plane3d"

// Atom types
export type { BoundAtom, SceneAtom, AtomLikeInput } from "./core/atom-wrapper"

// Item types
export type { ItemKind, ItemId, ItemOptions, ItemInstance, ItemSnapshot } from "./core/common-types/item-registry"

// Event types
export type { DragEvent, ClickEvent, HoverEvent, DragHandler, ClickHandler, HoverHandler } from "./core/common-types/interaction-events"

// Overlay types
export type { OverlayFormat, OverlayAnchor } from "./core/common-types/overlay"
