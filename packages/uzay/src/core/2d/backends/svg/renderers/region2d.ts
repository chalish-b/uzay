import type { ItemSnapshot } from "../../../types/item-registry";
import type { Region2DPoints } from "../../../items/region2d";
import type { Vec2 } from "../../../../shared/types/vec2";
import type { SvgItemRenderer, SvgSceneTypes } from "./shared";
import {
  applyStrokePx,
  cssColor,
  polylinePathD,
  setAttrs,
  setVisible,
  svgEl,
} from "./shared";

const MIN_POINTS = 3;

function normalizePolygons(points: Region2DPoints): readonly Vec2[][] {
  if (points.length === 0) return [];
  return Array.isArray(points[0]) ? (points as Vec2[][]) : [points as Vec2[]];
}

function buildFillD(points: Region2DPoints): string {
  const parts: string[] = [];
  for (const polygon of normalizePolygons(points)) {
    if (polygon.length < MIN_POINTS) continue;
    parts.push(polylinePathD(polygon, true));
  }
  return parts.join(" ");
}

function shouldShowStroke(item: ItemSnapshot<"region2d">): boolean {
  return item.strokeThickness > 0 && item.strokeOpacity > 0;
}

function apply(
  item: ItemSnapshot<"region2d">,
  obj: SvgSceneTypes["region2d"],
  container: { g: SVGGElement }
): void {
  setAttrs(obj.fill, {
    d: buildFillD(item.points),
    fill: cssColor(item.color),
    "fill-opacity": item.opacity,
  });
  setVisible(obj.fill, item.visible);

  // One closed stroke loop per polygon, rebuilt with the points.
  for (const stroke of obj.strokes) stroke.remove();
  obj.strokes = [];
  if (!shouldShowStroke(item)) return;

  for (const polygon of normalizePolygons(item.points)) {
    if (polygon.length < 2) continue;
    const stroke = svgEl("path");
    stroke.setAttribute("d", polylinePathD(polygon, true));
    applyStrokePx(
      stroke,
      item.strokeColor,
      item.strokeThickness,
      item.strokeOpacity
    );
    setVisible(stroke, item.visible);
    container.g.appendChild(stroke);
    obj.strokes.push(stroke);
  }
}

export const region2dSvgRenderer: SvgItemRenderer<"region2d"> = {
  create(item, container) {
    const fill = svgEl("path");
    container.g.appendChild(fill);
    const obj: SvgSceneTypes["region2d"] = {
      kind: "region2d",
      fill,
      strokes: [],
    };
    apply(item, obj, container);
    return obj;
  },

  update(item, obj, container) {
    apply(item, obj, container);
  },

  dispose(obj) {
    obj.fill.remove();
    for (const stroke of obj.strokes) stroke.remove();
  },
};
