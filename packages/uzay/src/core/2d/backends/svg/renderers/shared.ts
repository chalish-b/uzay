import type { ItemKind } from "../../../types/item-registry";
import type { ItemRenderer2D } from "../../../backend";
import type { Color } from "../../../../shared/types/colors";

export const SVG_NS = "http://www.w3.org/2000/svg";

// An item's container in the SVG backend: a <g> inside the SVG's stacking
// layers for the item's shapes, and a matching overlay <div> for its HTML
// pieces (labels, KaTeX). The view toggles camera-scoped visibility on both.
export type SvgItemContainer = {
  g: SVGGElement;
  overlay: HTMLDivElement;
};

// A tick label the axes renderer repositions on every frame: the wrapper div
// plus the world point its center tracks.
export type SvgAxesLabel = {
  wrapper: HTMLDivElement;
  world: { x: number; y: number };
};

// Per-item SVG scene object types.
export type SvgSceneTypes = {
  camera2d: {
    kind: "camera2d";
  };
  point2d: {
    kind: "point2d";
    circle: SVGCircleElement;
  };
  grid2d: {
    kind: "grid2d";
    path: SVGPathElement;
    layoutKey: string | null;
  };
  axes2d: {
    kind: "axes2d";
    labels: SvgAxesLabel[];
    layoutKey: string | null;
  };
  line2d: {
    kind: "line2d";
    line: SVGLineElement;
  };
  vector2d: {
    kind: "vector2d";
    group: SVGGElement;
    shaft: SVGLineElement;
    head: SVGPathElement;
  };
  region2d: {
    kind: "region2d";
    fill: SVGPathElement;
    strokes: SVGPathElement[];
  };
  circle2d: {
    kind: "circle2d";
    fill: SVGPathElement | SVGCircleElement;
    stroke: SVGPathElement | SVGCircleElement | null;
  };
  parametricfunction2d: {
    kind: "parametricfunction2d";
    path: SVGPathElement;
  };
  function2d: {
    kind: "function2d";
    path: SVGPathElement;
    layoutKey: string | null;
  };
  overlay2d: {
    kind: "overlay2d";
    wrapper: HTMLDivElement;
    element: HTMLDivElement;
  };
};

// The SVG instantiation of the shared renderer contract.
export type SvgItemRenderer<K extends ItemKind> = ItemRenderer2D<
  K,
  SvgSceneTypes,
  SvgItemContainer
>;

export function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K
): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tag);
}

export function setAttrs(
  el: SVGElement,
  attrs: Record<string, string | number>
): void {
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, String(value));
  }
}

export function cssColor(color: Color): string {
  return typeof color === "number"
    ? `#${color.toString(16).padStart(6, "0")}`
    : color;
}

export function setVisible(
  el: SVGElement | HTMLElement,
  visible: boolean
): void {
  el.style.display = visible ? "" : "none";
}

// Constant-pixel stroke styling. non-scaling-stroke computes the stroke width
// in screen space, so thickness stays in CSS pixels at any zoom, matching
// LineMaterial's linewidth unit in the three backend. Round caps and joins
// match the fat-line look.
export function applyStrokePx(
  el: SVGElement,
  color: Color,
  thickness: number,
  opacity: number = 1
): void {
  setAttrs(el, {
    stroke: cssColor(color),
    "stroke-width": thickness,
    "stroke-opacity": opacity,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "vector-effect": "non-scaling-stroke",
    fill: "none",
  });
}

export function polylinePathD(
  points: readonly { x: number; y: number }[],
  close: boolean = false
): string {
  if (points.length === 0) return "";
  const parts: string[] = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 1; i < points.length; i++) {
    parts.push(`L ${points[i].x} ${points[i].y}`);
  }
  if (close) parts.push("Z");
  return parts.join(" ");
}
