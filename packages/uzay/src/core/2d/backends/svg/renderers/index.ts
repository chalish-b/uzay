import type { RendererRegistry2D } from "../../../backend";
import type { SvgItemContainer, SvgSceneTypes } from "./shared";

// Shared constants and types live in ./shared so individual renderers can
// import them without creating a cycle through this barrel (which imports
// every renderer below to build the registry).
export * from "./shared";

import { camera2dSvgRenderer } from "./camera2d";
import { point2dSvgRenderer } from "./point2d";
import { grid2dSvgRenderer } from "./grid2d";
import { axes2dSvgRenderer } from "./axes2d";
import { line2dSvgRenderer } from "./line2d";
import { vector2dSvgRenderer } from "./vector2d";
import { region2dSvgRenderer } from "./region2d";
import { circle2dSvgRenderer } from "./circle2d";
import { parametricFunction2dSvgRenderer } from "./parametric-function2d";
import { function2dSvgRenderer } from "./function2d";
import { overlay2dSvgRenderer } from "./overlay2d";

export const svgRendererRegistry: RendererRegistry2D<
  SvgSceneTypes,
  SvgItemContainer
> = {
  camera2d: camera2dSvgRenderer,
  point2d: point2dSvgRenderer,
  grid2d: grid2dSvgRenderer,
  axes2d: axes2dSvgRenderer,
  line2d: line2dSvgRenderer,
  vector2d: vector2dSvgRenderer,
  region2d: region2dSvgRenderer,
  circle2d: circle2dSvgRenderer,
  parametricfunction2d: parametricFunction2dSvgRenderer,
  function2d: function2dSvgRenderer,
  overlay2d: overlay2dSvgRenderer,
};
