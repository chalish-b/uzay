import type { ItemKind } from "../types/item-registry";
import type { ItemRenderer } from "./shared";

// Shared constants and types live in ./shared so individual renderers can
// import them without creating a cycle through this barrel (which imports
// every renderer below to build the registry).
export * from "./shared";

// Import individual renderers
import { point3dRenderer } from "./point3d";
import { line3dRenderer } from "./line3d";
import { parametricFunction3dRenderer } from "./parametric-function3d";
import { axes3dRenderer } from "./axes3d";
import { grid3dRenderer } from "./grid3d";
import { camera3dRenderer } from "./camera3d";
import { sphere3dRenderer } from "./sphere3d";
import { vector3dRenderer } from "./vector3d";
import { overlay3dRenderer } from "./overlay3d";
import { plane3dRenderer } from "./plane3d";
import { surface3dRenderer } from "./surface3d";

// Registry mapping item kinds to their renderers
export const rendererRegistry: { [K in ItemKind]: ItemRenderer<K> } = {
  point3d: point3dRenderer,
  line3d: line3dRenderer,
  parametricfunction3d: parametricFunction3dRenderer,
  axes3d: axes3dRenderer,
  grid3d: grid3dRenderer,
  camera3d: camera3dRenderer,
  sphere3d: sphere3dRenderer,
  vector3d: vector3dRenderer,
  overlay3d: overlay3dRenderer,
  plane3d: plane3dRenderer,
  surface3d: surface3dRenderer,
};

// Helper function to get a typed renderer for a specific kind
export function getRenderer<K extends ItemKind>(kind: K): ItemRenderer<K> {
  return rendererRegistry[kind] as ItemRenderer<K>;
}
