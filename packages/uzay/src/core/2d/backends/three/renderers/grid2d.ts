import * as THREE from "three";
import type { ItemSnapshot } from "../../../types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./shared";
import { Z_GRID } from "./shared";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { checkedColor } from "../../../../shared/types/colors";
import type { Viewport2D } from "../../../types/view-context";
import {
  buildGridLines,
  getGridGap,
  getResolvedGridBounds,
} from "../../../math/grid-math";

// Build the line-segment vertex buffer for a 2D grid covering the resolved
// rangeX × rangeY at the requested gap. `true` ranges are viewport-backed when
// a viewport is provided, and otherwise resolve to an empty geometry.
function buildGridGeometry(
  item: ItemSnapshot<"grid2d">,
  viewport: Viewport2D | null = null
): LineSegmentsGeometry {
  const positions: number[] = [];
  const lines = buildGridLines(item, viewport);

  if (lines) {
    const [x0, x1] = lines.xBounds;
    const [y0, y1] = lines.yBounds;
    for (const x of lines.xs) {
      positions.push(x, y0, Z_GRID, x, y1, Z_GRID);
    }
    for (const y of lines.ys) {
      positions.push(x0, y, Z_GRID, x1, y, Z_GRID);
    }
  }

  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(positions);
  return geometry;
}

export const grid2dRenderer: ItemRenderer<"grid2d"> = {
  create(
    item: ItemSnapshot<"grid2d">,
    threeScene: THREE.Object3D
  ): ThreeSceneTypes["grid2d"] {
    const geometry = buildGridGeometry(item);
    const material = new LineMaterial({
      color: checkedColor(item.color, "Grid2D.color"),
      linewidth: item.thickness,
      transparent: item.opacity < 1,
      opacity: item.opacity,
    });
    const mesh = new LineSegments2(geometry, material);
    mesh.visible = item.visible;
    mesh.userData.itemId = item.id;
    threeScene.add(mesh);
    return { kind: "grid2d", geometry, material, mesh, layoutKey: null };
  },

  update(item: ItemSnapshot<"grid2d">, obj: ThreeSceneTypes["grid2d"]): void {
    obj.material.color.set(checkedColor(item.color, "Grid2D.color"));
    obj.material.linewidth = item.thickness;
    obj.material.opacity = item.opacity;
    obj.material.transparent = item.opacity < 1;
    obj.material.needsUpdate = true;
    obj.mesh.visible = item.visible;

    obj.geometry.dispose();
    obj.geometry = buildGridGeometry(item);
    obj.mesh.geometry = obj.geometry;
    obj.layoutKey = null;
  },

  layout(item: ItemSnapshot<"grid2d">, obj: ThreeSceneTypes["grid2d"], ctx): void {
    if (item.rangeX !== true && item.rangeY !== true && item.gap !== "auto") return;
    const { x, y } = getResolvedGridBounds(item, ctx.viewport);
    const gap = getGridGap(item.gap, ctx.viewport);
    const layoutKey = JSON.stringify({ x, y, gap });
    if (layoutKey === obj.layoutKey) return;
    obj.geometry.dispose();
    obj.geometry = buildGridGeometry(item, ctx.viewport);
    obj.mesh.geometry = obj.geometry;
    obj.layoutKey = layoutKey;
  },

  dispose(obj: ThreeSceneTypes["grid2d"], threeScene: THREE.Object3D): void {
    threeScene.remove(obj.mesh);
    obj.geometry.dispose();
    obj.material.dispose();
  },
};
