import * as THREE from "three";
import type { ItemSnapshot } from "../common-types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./index";
import { applyOpacityMaterialState } from "./material-transparency";

function buildSurfaceBuffers(
  f: (x: number, z: number) => number,
  xRange: [number, number],
  zRange: [number, number],
  N: number
) {
  const positions = new Float32Array(N * N * 3);
  const indices = new Uint32Array((N - 1) * (N - 1) * 6);

  for (let i = 0; i < N; i++) {
    const x = xRange[0] + ((xRange[1] - xRange[0]) * i) / (N - 1);
    for (let j = 0; j < N; j++) {
      const z = zRange[0] + ((zRange[1] - zRange[0]) * j) / (N - 1);
      const y = f(x, z);
      const idx = (i * N + j) * 3;
      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;
    }
  }

  let triIdx = 0;
  for (let i = 0; i < N - 1; i++) {
    for (let j = 0; j < N - 1; j++) {
      const a = i * N + j;
      const b = (i + 1) * N + j;
      const c = (i + 1) * N + (j + 1);
      const d = i * N + (j + 1);
      indices[triIdx++] = a;
      indices[triIdx++] = c;
      indices[triIdx++] = b;
      indices[triIdx++] = a;
      indices[triIdx++] = d;
      indices[triIdx++] = c;
    }
  }

  return { positions, indices };
}

function createGeometry(item: ItemSnapshot<"surface3d">, N: number): THREE.BufferGeometry {
  const { positions, indices } = buildSurfaceBuffers(item.f, item.xRange, item.zRange, N);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  return geometry;
}

export const surface3dRenderer: ItemRenderer<"surface3d"> = {
  create(item: ItemSnapshot<"surface3d">, threeScene: THREE.Scene): ThreeSceneTypes["surface3d"] {
    const N = Math.max(Math.round(item.samples), 2);
    const geometry = createGeometry(item, N);
    const material = new THREE.MeshPhongMaterial({
      color: item.color,
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
    obj.material.color.set(item.color);
    applyOpacityMaterialState(obj.material, item.opacity);
    obj.material.wireframe = item.wireframe;

    const N = Math.max(Math.round(item.samples), 2);
    const expectedVerts = N * N;
    const currentVerts = obj.geometry.attributes.position.count;

    if (expectedVerts !== currentVerts) {
      // Buffer size changed, must rebuild geometry
      obj.geometry.dispose();
      const geometry = createGeometry(item, N);
      obj.geometry = geometry;
      obj.mesh.geometry = geometry;
    } else {
      // Reuse buffers, just update positions
      const posAttr = obj.geometry.attributes.position as THREE.BufferAttribute;
      const { positions } = buildSurfaceBuffers(item.f, item.xRange, item.zRange, N);
      posAttr.set(positions);
      posAttr.needsUpdate = true;
      obj.geometry.computeVertexNormals();
      (obj.geometry.attributes.normal as THREE.BufferAttribute).needsUpdate = true;
    }

    obj.mesh.visible = item.visible;
  },

  dispose(obj: ThreeSceneTypes["surface3d"], threeScene: THREE.Scene): void {
    obj.geometry.dispose();
    obj.material.dispose();
    threeScene.remove(obj.mesh);
  },
};
