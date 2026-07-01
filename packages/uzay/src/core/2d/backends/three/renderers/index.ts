import type { ItemKind } from "../../../types/item-registry";
import type { ItemRenderer } from "./shared";

// Shared constants and types live in ./shared so individual renderers can
// import them without creating a cycle through this barrel (which imports
// every renderer below to build the registry).
export * from "./shared";

import { camera2dRenderer } from "./camera2d";
import { point2dRenderer } from "./point2d";
import { grid2dRenderer } from "./grid2d";
import { axes2dRenderer } from "./axes2d";
import { line2dRenderer } from "./line2d";
import { vector2dRenderer } from "./vector2d";
import { region2dRenderer } from "./region2d";
import { circle2dRenderer } from "./circle2d";
import { parametricFunction2dRenderer } from "./parametric-function2d";
import { function2dRenderer } from "./function2d";
import { overlay2dRenderer } from "./overlay2d";

export const rendererRegistry: { [K in ItemKind]: ItemRenderer<K> } = {
  camera2d: camera2dRenderer,
  point2d: point2dRenderer,
  grid2d: grid2dRenderer,
  axes2d: axes2dRenderer,
  line2d: line2dRenderer,
  vector2d: vector2dRenderer,
  region2d: region2dRenderer,
  circle2d: circle2dRenderer,
  parametricfunction2d: parametricFunction2dRenderer,
  function2d: function2dRenderer,
  overlay2d: overlay2dRenderer,
};

export function getRenderer<K extends ItemKind>(kind: K): ItemRenderer<K> {
  return rendererRegistry[kind] as ItemRenderer<K>;
}
