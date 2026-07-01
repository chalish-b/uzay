import type * as THREE from "three";
import type { ItemSnapshot } from "../../../types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./shared";
import { Z_DEFAULT } from "./shared";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { checkedColor } from "../../../../shared/types/colors";
import type { Viewport2D } from "../../../types/view-context";
import {
  getFunctionDomain,
  sampleFunctionRuns,
} from "../../../math/function-sampling";

function buildGeometry(
  item: ItemSnapshot<"function2d">,
  viewport: Viewport2D | null = null
): LineSegmentsGeometry {
  const runs = sampleFunctionRuns(item, viewport);
  const positions: number[] = [];

  for (const run of runs) {
    for (let i = 0; i < run.length - 1; i++) {
      positions.push(
        run[i].x,
        run[i].y,
        Z_DEFAULT,
        run[i + 1].x,
        run[i + 1].y,
        Z_DEFAULT
      );
    }
  }

  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(positions);
  return geometry;
}

export const function2dRenderer: ItemRenderer<"function2d"> = {
  create(
    item: ItemSnapshot<"function2d">,
    threeScene: THREE.Object3D
  ): ThreeSceneTypes["function2d"] {
    const geometry = buildGeometry(item);
    const material = new LineMaterial({
      color: checkedColor(item.color, "Function2D.color"),
      linewidth: item.thickness,
      transparent: item.opacity < 1,
      opacity: item.opacity,
    });
    const mesh = new LineSegments2(geometry, material);
    mesh.visible = item.visible;
    mesh.userData.itemId = item.id;
    threeScene.add(mesh);
    return { kind: "function2d", geometry, material, mesh, layoutKey: null };
  },

  update(item: ItemSnapshot<"function2d">, obj: ThreeSceneTypes["function2d"]): void {
    obj.material.color.set(checkedColor(item.color, "Function2D.color"));
    obj.material.linewidth = item.thickness;
    obj.material.opacity = item.opacity;
    obj.material.transparent = item.opacity < 1;
    obj.material.needsUpdate = true;
    obj.mesh.visible = item.visible;

    obj.geometry.dispose();
    obj.geometry = buildGeometry(item);
    obj.mesh.geometry = obj.geometry;
    obj.layoutKey = null;
  },

  layout(item: ItemSnapshot<"function2d">, obj: ThreeSceneTypes["function2d"], ctx): void {
    if (item.domain !== "infinite") return;
    const domain = getFunctionDomain(item, ctx.viewport);
    const layoutKey = JSON.stringify({
      domain,
      samples: item.samples,
      discontinuities: item.discontinuities,
    });
    if (layoutKey === obj.layoutKey) return;

    obj.geometry.dispose();
    obj.geometry = buildGeometry(item, ctx.viewport);
    obj.mesh.geometry = obj.geometry;
    obj.layoutKey = layoutKey;
  },

  dispose(obj: ThreeSceneTypes["function2d"], threeScene: THREE.Object3D): void {
    threeScene.remove(obj.mesh);
    obj.geometry.dispose();
    obj.material.dispose();
  },
};
