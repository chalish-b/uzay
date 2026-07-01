import * as THREE from "three";

// Reused per-call to avoid per-frame Vector4 allocation.
const _viewport = new THREE.Vector4();

// World units per CSS pixel for an orthographic camera + the renderer's
// current viewport. Used by mesh renderers in onBeforeRender to scale
// unit-sized geometry into a target pixel size at any zoom level.
//
// This matches the unit system LineMaterial uses (linewidth in CSS pixels
// via the same getViewport call), so a "5 px" line and a "6 px" point will
// look the same size as the user expects.
export function getWorldPerPixel(
  renderer: THREE.WebGLRenderer,
  camera: THREE.OrthographicCamera
): number {
  renderer.getViewport(_viewport);
  const heightPx = _viewport.w;
  if (heightPx <= 0) return 0;
  const visibleWorldHeight = (camera.top - camera.bottom) / camera.zoom;
  return visibleWorldHeight / heightPx;
}

// LineSegments2 overrides onBeforeRender to update its LineMaterial.resolution
// uniform from the current viewport. Replacing the override outright would
// break that auto-update, so renderers that need an additional per-frame hook
// (e.g. screen-space scaling on tick segments) should use chainOnBeforeRender
// to install their hook AFTER the base behavior. The cast through Object3D
// avoids LineSegments2's narrower TypeScript signature on onBeforeRender.
export type OnBeforeRenderHook = (
  this: THREE.Object3D,
  renderer: THREE.WebGLRenderer,
  camera: THREE.Camera
) => void;

export function chainOnBeforeRender(
  obj: THREE.Object3D,
  hook: OnBeforeRenderHook
): void {
  const previous = obj.onBeforeRender;
  (obj as THREE.Object3D).onBeforeRender = function (
    renderer,
    scene,
    camera,
    geometry,
    material,
    group
  ) {
    previous.call(this, renderer, scene, camera, geometry, material, group);
    hook.call(this, renderer, camera);
    // Screen-space hooks set this.scale here, but the renderer already baked
    // this object's world matrix for the frame before onBeforeRender ran. Without
    // refreshing it, a scale change only shows on the next frame, so an object's
    // first rendered frame (page load, or when a camera filter first reveals it)
    // draws the raw unit-sized geometry. Recompute now so it lands this frame.
    this.updateMatrixWorld();
  };
}
