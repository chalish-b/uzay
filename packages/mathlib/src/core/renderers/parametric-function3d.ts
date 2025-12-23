import * as THREE from "three";
import type { ItemSnapshot } from "../common-types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./index";
import { lineThicknessScaleDown } from "./index";

export const parametricFunction3dRenderer: ItemRenderer<"parametricfunction3d"> = {
  create(item: ItemSnapshot<"parametricfunction3d">, threeScene: THREE.Scene): ThreeSceneTypes["parametricfunction3d"] {
    // Calculate all the points based on the sample count
    const points = [];
    // TODO: Stop hardcoding this minimum sample count
    const sampleCount = Math.round(Math.max(item.samples, 8));
    for (let i = 0; i < sampleCount; i++) {
      const t =
        item.tStart + ((item.tEnd - item.tStart) * i) / (sampleCount - 1);
      const point = item.f(t);
      points.push(new THREE.Vector3(point.x, point.y, point.z));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(
      curve,
      sampleCount,
      item.thickness / lineThicknessScaleDown
    );
    const material = new THREE.MeshBasicMaterial({ color: item.color });
    const mesh = new THREE.Mesh(geometry, material);
    threeScene.add(mesh);
    return {
      kind: "parametricfunction3d",
      curve,
      geometry,
      material,
      mesh,
    };
  },

  update(item: ItemSnapshot<"parametricfunction3d">, obj: ThreeSceneTypes["parametricfunction3d"]): void {
    // Update stuff that can be updated before recreating the geometry
    obj.material.color.set(item.color);

    // Calculate all the points based on the sample count
    // We need to create a new curve here
    const points = [];
    // TODO: Stop hardcoding this minimum sample count
    const sampleCount = Math.round(Math.max(item.samples, 8));
    for (let i = 0; i < sampleCount; i++) {
      const t =
        item.tStart + ((item.tEnd - item.tStart) * i) / (sampleCount - 1);
      const point = item.f(t);
      points.push(new THREE.Vector3(point.x, point.y, point.z));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    // Update geometry (basically like the Line3D example)
    const oldGeometry = obj.geometry;
    const geometry = new THREE.TubeGeometry(
      curve,
      sampleCount,
      item.thickness / lineThicknessScaleDown
    );
    obj.curve = curve;
    obj.geometry = geometry;
    obj.mesh.geometry = geometry;
    oldGeometry.dispose();
  },

  dispose(obj: ThreeSceneTypes["parametricfunction3d"], threeScene: THREE.Scene): void {
    threeScene.remove(obj.mesh);
    obj.geometry.dispose();
    obj.material.dispose();
  },
};

