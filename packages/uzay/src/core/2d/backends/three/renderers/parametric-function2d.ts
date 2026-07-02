import type * as THREE from "three";
import type { ItemSnapshot } from "../../../types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./shared";
import { Z_DEFAULT } from "./shared";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { checkedColor } from "../../../../shared/types/colors";
import {
  createParametricSamplingPlan,
  parametricPlanFitsViewport,
  sampleParametricRuns,
  type ParametricSamplingPlan,
} from "../../../math/parametric-sampling";

function buildGeometry(
  item: ItemSnapshot<"parametricfunction2d">,
  plan: ParametricSamplingPlan
): { geometry: LineSegmentsGeometry; hasSegments: boolean } {
  const runs = sampleParametricRuns(item, plan);
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
  return { geometry, hasSegments: positions.length > 0 };
}

function applyVisibility(
  item: ItemSnapshot<"parametricfunction2d">,
  obj: ThreeSceneTypes["parametricfunction2d"]
): void {
  obj.mesh.visible = item.visible && obj.hasSegments;
}

// Sampling is viewport-dependent (screen-space tolerance, view-window
// clipping), so geometry is built in layout() rather than create()/update().
// Those two only reset the stored plan; layout() rebuilds whenever the plan
// is missing or no longer fits the viewport.
export const parametricFunction2dRenderer: ItemRenderer<"parametricfunction2d"> = {
  create(
    item: ItemSnapshot<"parametricfunction2d">,
    threeScene: THREE.Object3D
  ): ThreeSceneTypes["parametricfunction2d"] {
    const geometry = new LineSegmentsGeometry();
    geometry.setPositions([]);
    const material = new LineMaterial({
      color: checkedColor(item.color, "ParametricFunction2D.color"),
      linewidth: item.thickness,
      transparent: item.opacity < 1,
      opacity: item.opacity,
    });
    const mesh = new LineSegments2(geometry, material);
    mesh.visible = false;
    mesh.userData.itemId = item.id;
    threeScene.add(mesh);
    return {
      kind: "parametricfunction2d",
      geometry,
      material,
      mesh,
      plan: null,
      hasSegments: false,
    };
  },

  update(
    item: ItemSnapshot<"parametricfunction2d">,
    obj: ThreeSceneTypes["parametricfunction2d"]
  ): void {
    obj.material.color.set(checkedColor(item.color, "ParametricFunction2D.color"));
    obj.material.linewidth = item.thickness;
    obj.material.opacity = item.opacity;
    obj.material.transparent = item.opacity < 1;
    obj.material.needsUpdate = true;
    applyVisibility(item, obj);
    obj.plan = null;
  },

  layout(
    item: ItemSnapshot<"parametricfunction2d">,
    obj: ThreeSceneTypes["parametricfunction2d"],
    ctx
  ): void {
    if (obj.plan && parametricPlanFitsViewport(obj.plan, ctx.viewport)) return;

    const plan = createParametricSamplingPlan(ctx.viewport);
    const built = buildGeometry(item, plan);
    obj.geometry.dispose();
    obj.geometry = built.geometry;
    obj.mesh.geometry = built.geometry;
    obj.hasSegments = built.hasSegments;
    obj.plan = plan;
    applyVisibility(item, obj);
  },

  dispose(
    obj: ThreeSceneTypes["parametricfunction2d"],
    threeScene: THREE.Object3D
  ): void {
    threeScene.remove(obj.mesh);
    obj.geometry.dispose();
    obj.material.dispose();
  },
};
