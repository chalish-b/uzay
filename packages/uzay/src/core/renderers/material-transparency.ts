import * as THREE from "three";

export function applyOpacityMaterialState(
  material: THREE.MeshPhongMaterial,
  opacity: number
) {
  const isTransparent = opacity < 1;

  // Opaque meshes should fill the depth buffer normally.
  // Transparent meshes should blend without blocking later transparent draws.
  material.opacity = opacity;
  material.depthWrite = !isTransparent;

  // When opacity crosses 1, Three.js needs to switch render pipelines.
  if (material.transparent !== isTransparent) {
    material.transparent = isTransparent;
    material.needsUpdate = true;
  }
}
