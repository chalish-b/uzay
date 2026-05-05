import * as THREE from "three";
import type { ItemSnapshot } from "../types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./index";
import { Z_DEFAULT } from "./index";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";

// Shaft and head are constructed in a local frame where the vector points
// along +x. The group's z rotation aligns this frame with the world-space
// direction.

function buildShaftGeometry(shaftLen: number): LineGeometry {
  const geom = new LineGeometry();
  geom.setPositions([0, 0, 0, shaftLen, 0, 0]);
  return geom;
}

function buildHeadGeometry(
  length: number,
  headLength: number,
  headWidth: number
): THREE.BufferGeometry {
  const tip: [number, number] = [length, 0];
  const baseLeft: [number, number] = [length - headLength, headWidth / 2];
  const baseRight: [number, number] = [length - headLength, -headWidth / 2];
  const geom = new THREE.BufferGeometry();
  geom.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [tip[0], tip[1], 0, baseLeft[0], baseLeft[1], 0, baseRight[0], baseRight[1], 0],
      3
    )
  );
  geom.setIndex([0, 1, 2]);
  return geom;
}

function applyTransform(
  group: THREE.Group,
  origin: { x: number; y: number },
  vector: { x: number; y: number }
) {
  group.position.set(origin.x, origin.y, Z_DEFAULT);
  const len = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  if (len < 1e-9) {
    group.rotation.z = 0;
    return;
  }
  group.rotation.z = Math.atan2(vector.y, vector.x);
}

export const vector2dRenderer: ItemRenderer<"vector2d"> = {
  create(
    item: ItemSnapshot<"vector2d">,
    threeScene: THREE.Scene
  ): ThreeSceneTypes["vector2d"] {
    const length = Math.sqrt(item.vector.x * item.vector.x + item.vector.y * item.vector.y);
    const headLength = Math.min(item.headLength, length);
    const shaftLen = Math.max(length - headLength, 0);

    const shaftGeometry = buildShaftGeometry(shaftLen);
    const shaftMaterial = new LineMaterial({
      color: item.color,
      linewidth: item.thickness,
    });
    const shaftMesh = new Line2(shaftGeometry, shaftMaterial);

    const headGeometry = buildHeadGeometry(length, headLength, item.headWidth);
    const headMaterial = new THREE.MeshBasicMaterial({ color: item.color });
    const headMesh = new THREE.Mesh(headGeometry, headMaterial);

    const group = new THREE.Group();
    group.add(shaftMesh);
    group.add(headMesh);

    // Hit-test against the head (the visually solid part). The shaft is a thin
    // line; raycasting against Line2 needs threshold tuning we haven't done.
    headMesh.userData.itemId = item.id;

    applyTransform(group, item.origin, item.vector);
    group.visible = item.visible;
    threeScene.add(group);

    return {
      kind: "vector2d",
      group,
      shaftGeometry,
      shaftMaterial,
      shaftMesh,
      headGeometry,
      headMaterial,
      headMesh,
    };
  },

  update(item: ItemSnapshot<"vector2d">, obj: ThreeSceneTypes["vector2d"]): void {
    obj.shaftMaterial.color.set(item.color);
    obj.shaftMaterial.linewidth = item.thickness;
    obj.shaftMaterial.needsUpdate = true;
    obj.headMaterial.color.set(item.color);
    obj.group.visible = item.visible;

    const length = Math.sqrt(item.vector.x * item.vector.x + item.vector.y * item.vector.y);
    const headLength = Math.min(item.headLength, length);
    const shaftLen = Math.max(length - headLength, 0);

    obj.shaftGeometry.dispose();
    obj.headGeometry.dispose();

    const shaftGeometry = buildShaftGeometry(shaftLen);
    const headGeometry = buildHeadGeometry(length, headLength, item.headWidth);
    obj.shaftMesh.geometry = shaftGeometry;
    obj.headMesh.geometry = headGeometry;
    (obj as { shaftGeometry: LineGeometry }).shaftGeometry = shaftGeometry;
    (obj as { headGeometry: THREE.BufferGeometry }).headGeometry = headGeometry;

    applyTransform(obj.group, item.origin, item.vector);
  },

  dispose(obj: ThreeSceneTypes["vector2d"], threeScene: THREE.Scene): void {
    threeScene.remove(obj.group);
    obj.shaftGeometry.dispose();
    obj.shaftMaterial.dispose();
    obj.headGeometry.dispose();
    obj.headMaterial.dispose();
  },
};
