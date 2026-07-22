import * as THREE from "three";
import type { ItemSnapshot } from "../types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./shared";
import {
  createLineStyleObjects,
  updateLineStyleObjects,
  disposeLineStyleObjects,
} from "./line-style";

// Calculate all the points based on the sample count
function samplePoints(item: ItemSnapshot<"parametricfunction3d">): {
  points: THREE.Vector3[];
  sampleCount: number;
} {
  const points = [];
  // TODO: Stop hardcoding this minimum sample count
  const sampleCount = Math.round(Math.max(item.samples, 8));
  for (let i = 0; i < sampleCount; i++) {
    const t =
      item.tStart + ((item.tEnd - item.tStart) * i) / (sampleCount - 1);
    const point = item.f(t);
    points.push(new THREE.Vector3(point.x, point.y, point.z));
  }
  return { points, sampleCount };
}

export const parametricFunction3dRenderer: ItemRenderer<"parametricfunction3d"> = {
  create(
    item: ItemSnapshot<"parametricfunction3d">,
    threeScene: THREE.Object3D
  ): ThreeSceneTypes["parametricfunction3d"] {
    const { points, sampleCount } = samplePoints(item);
    return {
      kind: "parametricfunction3d",
      impl: createLineStyleObjects(
        points,
        sampleCount,
        item,
        "ParametricFunction3D.color",
        threeScene
      ),
    };
  },

  update(
    item: ItemSnapshot<"parametricfunction3d">,
    obj: ThreeSceneTypes["parametricfunction3d"],
    threeScene: THREE.Object3D
  ): void {
    const { points, sampleCount } = samplePoints(item);
    updateLineStyleObjects(
      obj,
      points,
      sampleCount,
      item,
      "ParametricFunction3D.color",
      threeScene
    );
  },

  dispose(
    obj: ThreeSceneTypes["parametricfunction3d"],
    threeScene: THREE.Object3D
  ): void {
    disposeLineStyleObjects(obj.impl, threeScene);
  },
};
