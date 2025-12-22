import * as THREE from "three";
import type { ItemSnapshot } from "../common-types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./index";
import { lineThicknessScaleDown } from "./index";

export const axes3dRenderer: ItemRenderer<"axes3d"> = {
  create(item: ItemSnapshot<"axes3d">, threeScene: THREE.Scene): ThreeSceneTypes["axes3d"] {
    const xRange =
      typeof item.x !== "boolean" ? item.x : ([-100, 100] as const);
    const yRange =
      typeof item.y !== "boolean" ? item.y : ([-100, 100] as const);
    const zRange =
      typeof item.z !== "boolean" ? item.z : ([-100, 100] as const);
    const xCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(xRange[0], 0, 0),
      new THREE.Vector3(xRange[1], 0, 0),
    ]);
    const yCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, yRange[0], 0),
      new THREE.Vector3(0, yRange[1], 0),
    ]);
    const zCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, zRange[0]),
      new THREE.Vector3(0, 0, zRange[1]),
    ]);
    const xGeometry = new THREE.TubeGeometry(
      xCurve,
      64,
      item.thickness / lineThicknessScaleDown
    );
    const yGeometry = new THREE.TubeGeometry(
      yCurve,
      64,
      item.thickness / lineThicknessScaleDown
    );
    const zGeometry = new THREE.TubeGeometry(
      zCurve,
      64,
      item.thickness / lineThicknessScaleDown
    );
    const xMaterial = new THREE.MeshBasicMaterial({ color: item.color });
    const yMaterial = new THREE.MeshBasicMaterial({ color: item.color });
    const zMaterial = new THREE.MeshBasicMaterial({ color: item.color });
    const xMesh = new THREE.Mesh(xGeometry, xMaterial);
    const yMesh = new THREE.Mesh(yGeometry, yMaterial);
    const zMesh = new THREE.Mesh(zGeometry, zMaterial);
    threeScene.add(xMesh);
    threeScene.add(yMesh);
    threeScene.add(zMesh);

    // If the axes are "false", just hide the meshes
    // TODO: This is inefficient. It would just be better to not construct the axis
    // in the first place if it's disabled. But it's fine for now.
    if (item.x === false) {
      xMesh.visible = false;
    }
    if (item.y === false) {
      yMesh.visible = false;
    }
    if (item.z === false) {
      zMesh.visible = false;
    }
    return {
      kind: "axes3d",
      x: {
        curve: xCurve,
        geometry: xGeometry,
        material: xMaterial,
        mesh: xMesh,
      },
      y: {
        curve: yCurve,
        geometry: yGeometry,
        material: yMaterial,
        mesh: yMesh,
      },
      z: {
        curve: zCurve,
        geometry: zGeometry,
        material: zMaterial,
        mesh: zMesh,
      },
    };
  },

  update(item: ItemSnapshot<"axes3d">, obj: ThreeSceneTypes["axes3d"]): void {
    // TODO: Update the axes
  },

  dispose(obj: ThreeSceneTypes["axes3d"], threeScene: THREE.Scene): void {
    threeScene.remove(obj.x.mesh);
    threeScene.remove(obj.y.mesh);
    threeScene.remove(obj.z.mesh);
    obj.x.geometry.dispose();
    obj.x.material.dispose();
    obj.y.geometry.dispose();
    obj.y.material.dispose();
    obj.z.geometry.dispose();
    obj.z.material.dispose();
  },
};

