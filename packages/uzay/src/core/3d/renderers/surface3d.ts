import * as THREE from "three";
import type { ItemSnapshot } from "../types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./shared";
import { applyOpacityMaterialState } from "./material-transparency";
import { checkedColor } from "../../shared/types/colors";
import {
  createGridGeometry,
  updateGridPositions,
  type GridTopology,
} from "./grid-mesh";

function topologyOf(item: ItemSnapshot<"surface3d">): GridTopology {
  const N = Math.max(Math.round(item.samples), 2);
  return { nu: N, nv: N, wrapU: false, wrapV: false };
}

// The heightfield sampled as a grid position: u is x, v is z, f gives y.
function positionOf(item: ItemSnapshot<"surface3d">) {
  const f = item.f;
  return (x: number, z: number) => ({ x, y: f(x, z), z });
}

export const surface3dRenderer: ItemRenderer<"surface3d"> = {
  create(item: ItemSnapshot<"surface3d">, threeScene: THREE.Object3D): ThreeSceneTypes["surface3d"] {
    const geometry = createGridGeometry(
      topologyOf(item),
      item.xRange,
      item.zRange,
      positionOf(item)
    );
    const material = new THREE.MeshPhongMaterial({
      color: checkedColor(item.color, "Surface3D.color"),
      specular: 0xaaaaaa,
      shininess: 5,
      side: THREE.DoubleSide,
      transparent: item.opacity < 1,
      opacity: item.opacity,
      depthWrite: item.opacity >= 1,
      wireframe: item.wireframe,
    });
    applyOpacityMaterialState(material, item.opacity);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = item.visible;
    mesh.userData.itemId = item.id;
    threeScene.add(mesh);
    return { kind: "surface3d", geometry, material, mesh };
  },

  update(item: ItemSnapshot<"surface3d">, obj: ThreeSceneTypes["surface3d"]): void {
    obj.material.color.set(checkedColor(item.color, "Surface3D.color"));
    applyOpacityMaterialState(obj.material, item.opacity);
    obj.material.wireframe = item.wireframe;

    const topology = topologyOf(item);
    const expectedVerts = topology.nu * topology.nv;
    const currentVerts = obj.geometry.attributes.position.count;

    if (expectedVerts !== currentVerts) {
      // Buffer size changed, must rebuild geometry
      obj.geometry.dispose();
      const geometry = createGridGeometry(
        topology,
        item.xRange,
        item.zRange,
        positionOf(item)
      );
      obj.geometry = geometry;
      obj.mesh.geometry = geometry;
    } else {
      // Reuse buffers, just update positions
      updateGridPositions(
        obj.geometry,
        topology,
        item.xRange,
        item.zRange,
        positionOf(item)
      );
    }

    obj.mesh.visible = item.visible;
  },

  dispose(obj: ThreeSceneTypes["surface3d"], threeScene: THREE.Object3D): void {
    obj.geometry.dispose();
    obj.material.dispose();
    threeScene.remove(obj.mesh);
  },
};
