import * as THREE from "three";
import type { ItemSnapshot } from "../types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./index";
import { Z_GRID } from "./index";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { checkedColor } from "../../shared/types/colors";

// Build the line-segment vertex buffer for a 2D grid covering the given
// rangeX × rangeY at the requested gap. `true` (infinite) is currently a
// no-op stub mirroring Grid3D, so we return an empty buffer in that case.
function buildGridGeometry(
  rangeX: boolean | [number, number],
  rangeY: boolean | [number, number],
  gap: number
): LineSegmentsGeometry {
  const positions: number[] = [];

  const xBounds = Array.isArray(rangeX) ? rangeX : null;
  const yBounds = Array.isArray(rangeY) ? rangeY : null;

  if (xBounds && yBounds && gap > 0) {
    const [x0, x1] = xBounds[0] <= xBounds[1] ? xBounds : [xBounds[1], xBounds[0]];
    const [y0, y1] = yBounds[0] <= yBounds[1] ? yBounds : [yBounds[1], yBounds[0]];

    // Vertical lines at each x = k*gap inside [x0, x1].
    const firstX = Math.ceil(x0 / gap) * gap;
    for (let x = firstX; x <= x1 + 1e-9; x += gap) {
      positions.push(x, y0, Z_GRID, x, y1, Z_GRID);
    }

    // Horizontal lines at each y = k*gap inside [y0, y1].
    const firstY = Math.ceil(y0 / gap) * gap;
    for (let y = firstY; y <= y1 + 1e-9; y += gap) {
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
    threeScene: THREE.Scene
  ): ThreeSceneTypes["grid2d"] {
    const geometry = buildGridGeometry(item.rangeX, item.rangeY, item.gap);
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
    return { kind: "grid2d", geometry, material, mesh };
  },

  update(item: ItemSnapshot<"grid2d">, obj: ThreeSceneTypes["grid2d"]): void {
    obj.material.color.set(checkedColor(item.color, "Grid2D.color"));
    obj.material.linewidth = item.thickness;
    obj.material.opacity = item.opacity;
    obj.material.transparent = item.opacity < 1;
    obj.material.needsUpdate = true;
    obj.mesh.visible = item.visible;

    obj.geometry.dispose();
    const next = buildGridGeometry(item.rangeX, item.rangeY, item.gap);
    obj.mesh.geometry = next;
    (obj as { geometry: LineSegmentsGeometry }).geometry = next;
  },

  dispose(obj: ThreeSceneTypes["grid2d"], threeScene: THREE.Scene): void {
    threeScene.remove(obj.mesh);
    obj.geometry.dispose();
    obj.material.dispose();
  },
};
