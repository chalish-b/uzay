import * as THREE from "three";
import type { ItemSnapshot } from "../common-types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./index";

const DEFAULT_UP = new THREE.Vector3(0, 0, 1);

function orientToNormal(mesh: THREE.Object3D, normal: { x: number; y: number; z: number }) {
  const n = new THREE.Vector3(normal.x, normal.y, normal.z).normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(DEFAULT_UP, n);
  mesh.quaternion.copy(quaternion);
}

function createEdges(
  geometry: THREE.PlaneGeometry,
  color: string | number
): { edgeGeometry: THREE.EdgesGeometry; edgeMaterial: THREE.LineBasicMaterial; edgeLines: THREE.LineSegments } {
  const edgeGeometry = new THREE.EdgesGeometry(geometry);
  const edgeMaterial = new THREE.LineBasicMaterial({ color });
  const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
  return { edgeGeometry, edgeMaterial, edgeLines };
}

export const plane3dRenderer: ItemRenderer<"plane3d"> = {
  create(
    item: ItemSnapshot<"plane3d">,
    threeScene: THREE.Scene
  ): ThreeSceneTypes["plane3d"] {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshPhongMaterial({
      color: item.color,
      side: THREE.DoubleSide,
      specular: 0xaaaaaa,
      shininess: 5,
      transparent: item.opacity < 1,
      opacity: item.opacity,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(item.width, item.height, 1);
    mesh.position.set(item.point.x, item.point.y, item.point.z);
    orientToNormal(mesh, item.normal);
    mesh.userData.itemId = item.id;
    threeScene.add(mesh);

    const result: ThreeSceneTypes["plane3d"] = {
      kind: "plane3d",
      geometry,
      material,
      mesh,
    };

    if (item.showEdges) {
      const edges = createEdges(geometry, item.color);
      result.edgeGeometry = edges.edgeGeometry;
      result.edgeMaterial = edges.edgeMaterial;
      result.edgeLines = edges.edgeLines;
      mesh.add(edges.edgeLines);
    }

    return result;
  },

  update(
    item: ItemSnapshot<"plane3d">,
    obj: ThreeSceneTypes["plane3d"]
  ): void {
    obj.material.color.set(item.color);
    obj.material.opacity = item.opacity;
    obj.material.transparent = item.opacity < 1;
    obj.mesh.scale.set(item.width, item.height, 1);
    obj.mesh.position.set(item.point.x, item.point.y, item.point.z);
    orientToNormal(obj.mesh, item.normal);

    if (item.showEdges && !obj.edgeLines) {
      const edges = createEdges(obj.geometry, item.color);
      obj.edgeGeometry = edges.edgeGeometry;
      obj.edgeMaterial = edges.edgeMaterial;
      obj.edgeLines = edges.edgeLines;
      obj.mesh.add(edges.edgeLines);
    } else if (!item.showEdges && obj.edgeLines) {
      obj.mesh.remove(obj.edgeLines);
      obj.edgeGeometry!.dispose();
      obj.edgeMaterial!.dispose();
      obj.edgeGeometry = undefined;
      obj.edgeMaterial = undefined;
      obj.edgeLines = undefined;
    } else if (item.showEdges && obj.edgeLines) {
      obj.edgeMaterial!.color.set(item.color);
    }
  },

  dispose(
    obj: ThreeSceneTypes["plane3d"],
    threeScene: THREE.Scene
  ): void {
    if (obj.edgeLines) {
      obj.mesh.remove(obj.edgeLines);
      obj.edgeGeometry!.dispose();
      obj.edgeMaterial!.dispose();
    }
    threeScene.remove(obj.mesh);
    obj.geometry.dispose();
    obj.material.dispose();
  },
};
