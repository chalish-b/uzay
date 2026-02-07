import * as THREE from "three";
import type { ItemSnapshot } from "../common-types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./index";
import { lineThicknessScaleDown } from "./index";

const UP = new THREE.Vector3(0, 1, 0);

export const vector3dRenderer: ItemRenderer<"vector3d"> = {
  create(
    item: ItemSnapshot<"vector3d">,
    threeScene: THREE.Scene
  ): ThreeSceneTypes["vector3d"] {
    const material = new THREE.MeshPhongMaterial({
      color: item.color,
      specular: 0xaaaaaa,
      shininess: 5,
    });

    const { shaftGeometry, headGeometry, shaftLen, headLength, length } =
      buildGeometries(item);

    const shaftMesh = new THREE.Mesh(shaftGeometry, material);
    const headMesh = new THREE.Mesh(headGeometry, material);

    const group = new THREE.Group();
    group.add(shaftMesh);
    group.add(headMesh);
    group.userData.itemId = item.id;

    positionParts(item, group, shaftMesh, headMesh, shaftLen, headLength, length);

    threeScene.add(group);

    return {
      kind: "vector3d",
      group,
      shaftGeometry,
      headGeometry,
      material,
      shaftMesh,
      headMesh,
    };
  },

  update(
    item: ItemSnapshot<"vector3d">,
    obj: ThreeSceneTypes["vector3d"]
  ): void {
    obj.material.color.set(item.color);

    // Rebuild geometries
    obj.shaftGeometry.dispose();
    obj.headGeometry.dispose();

    const { shaftGeometry, headGeometry, shaftLen, headLength, length } =
      buildGeometries(item);

    obj.shaftGeometry = shaftGeometry;
    obj.headGeometry = headGeometry;
    obj.shaftMesh.geometry = shaftGeometry;
    obj.headMesh.geometry = headGeometry;

    positionParts(
      item,
      obj.group,
      obj.shaftMesh,
      obj.headMesh,
      shaftLen,
      headLength,
      length
    );
  },

  dispose(
    obj: ThreeSceneTypes["vector3d"],
    threeScene: THREE.Scene
  ): void {
    threeScene.remove(obj.group);
    obj.shaftGeometry.dispose();
    obj.headGeometry.dispose();
    obj.material.dispose();
  },
};

function buildGeometries(item: ItemSnapshot<"vector3d">) {
  const { vector, thickness, headLength, headWidth } = item;
  const length = Math.sqrt(
    vector.x * vector.x + vector.y * vector.y + vector.z * vector.z
  );

  const radius = thickness / lineThicknessScaleDown;

  // For zero-length vectors, create tiny geometries that won't be visible
  if (length < 1e-6) {
    return {
      shaftGeometry: new THREE.CylinderGeometry(radius, radius, 0, 8),
      headGeometry: new THREE.ConeGeometry(radius * 2, 0, 8),
      shaftLen: 0,
      headLength: 0,
      length: 0,
    };
  }

  const shaftLen = Math.max(length - headLength, 0);

  const shaftGeometry = new THREE.CylinderGeometry(radius, radius, shaftLen, 8);
  const headGeometry = new THREE.ConeGeometry(headWidth, headLength, 12);

  return { shaftGeometry, headGeometry, shaftLen, headLength, length };
}

function positionParts(
  item: ItemSnapshot<"vector3d">,
  group: THREE.Group,
  shaftMesh: THREE.Mesh,
  headMesh: THREE.Mesh,
  shaftLen: number,
  headLength: number,
  length: number
) {
  const { origin, vector } = item;

  // Reset group transform
  group.position.set(origin.x, origin.y, origin.z);

  if (length < 1e-6) {
    group.quaternion.identity();
    shaftMesh.position.set(0, 0, 0);
    headMesh.position.set(0, 0, 0);
    shaftMesh.visible = false;
    headMesh.visible = false;
    return;
  }

  shaftMesh.visible = true;
  headMesh.visible = true;

  // Compute direction and rotate group so local Y points along the vector
  const dir = new THREE.Vector3(vector.x, vector.y, vector.z).normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(UP, dir);
  group.quaternion.copy(quat);

  // Position shaft and head along local Y axis
  // Shaft center is at shaftLen/2 from origin
  shaftMesh.position.set(0, shaftLen / 2, 0);
  // Head center is at (length - headLen/2) from origin
  headMesh.position.set(0, length - headLength / 2, 0);
}
