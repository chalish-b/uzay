import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Camera3D, Camera3DFields } from "./items/camera3d";
import type { Scene3D, SceneSnapshot } from "./scene3d";
import { Vec3 } from "./common-types/vec3";
import type { ItemId, ItemSnapshot } from "./common-types/item-registry";
import type { AtomLikeOptions } from "./atom-wrapper";
import { getRenderer, type ThreeSceneObject } from "./renderers";

export class View3D {
  scene: Scene3D;
  activeCam: Camera3D<AtomLikeOptions<Camera3DFields>>;
  containerElem: HTMLElement;

  // three.js specific fields
  // These will probably be extracted into a separate class, like "Renderer"
  threeScene: THREE.Scene;
  threeCamera: THREE.PerspectiveCamera;
  threeOrbitControls: OrbitControls;
  threeRenderer: THREE.WebGLRenderer;
  frameScheduled: boolean = false;
  threeMeshes: Map<ItemId, ThreeSceneObject> = new Map();

  // Scene snapshots. Initially an empty list, so all items will be added
  lastSceneSnapshot: SceneSnapshot = { itemSnapshots: new Map() };

  sizer: ReturnType<typeof createResponsiveThreeSizer>;

  constructor(scene: Scene3D, activeCamId: ItemId, containerElem: HTMLElement) {
    this.scene = scene;
    this.activeCam = scene.getCamera(activeCamId);

    // Initialize the three.js renderer
    this.containerElem = containerElem;
    this.threeScene = new THREE.Scene();

    const camera = this.activeCam.getItemSnapshot();
    this.threeCamera = new THREE.PerspectiveCamera(
      camera.fov,
      1,
      camera.near,
      camera.far
    );
    this.threeCamera.position.set(...Vec3.asArray(camera.position));
    this.threeCamera.lookAt(...Vec3.asArray(camera.lookAt));
    this.threeCamera.zoom = camera.zoom;

    // Set up renderer
    this.threeRenderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    this.threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Ensure container is positioned so absolute canvas works correctly
    const containerPosition = getComputedStyle(containerElem).position;
    if (containerPosition === "static") {
      containerElem.style.position = "relative";
    }

    // Position absolute so canvas doesn't affect container layout during resize
    this.threeRenderer.domElement.style.position = "absolute";
    this.threeRenderer.domElement.style.inset = "0";

    // Warn if container already has a canvas (likely a cleanup issue)
    const existingCanvas = containerElem.querySelector("canvas");
    if (existingCanvas) {
      console.warn(
        `[View3D] Container already has a canvas element. This usually means a previous View3D was not disposed properly, which can cause rendering issues like overlapping scenes.\n\n` +
        `To fix this, call view.dispose() in your cleanup function:\n\n` +
        `  useEffect(() => {\n` +
        `    const view = new View3D(scene, camera.id, container);\n` +
        `    return () => view.dispose(); // <-- Add this cleanup\n` +
        `  }, []);\n\n` +
        `Also ensure your useEffect has an empty dependency array [] to prevent re-running on every render.`
      );
    }

    containerElem.appendChild(this.threeRenderer.domElement);

    // TODO: We need a way to sync our camera object in the scene with
    // This three.js camera as it's controlled.
    this.threeOrbitControls = new OrbitControls(
      this.threeCamera,
      this.threeRenderer.domElement
    );
    // TODO: Make damping an option
    this.threeOrbitControls.enableDamping = false;
    this.threeOrbitControls.target.set(0, 0, 0);
    this.threeOrbitControls.addEventListener("change", () =>
      this.requestRender()
    );

    // Add fog with the same background color so that things fade out
    // TODO: The View3D class probably needs some options as well, preferrably reactive / atomic
    // Or put stuff like this into the Scene, idk
    // this.threeScene.fog = new THREE.Fog("black", 1, 100);

    this.sizer = createResponsiveThreeSizer({
      container: containerElem,
      renderer: this.threeRenderer,
      camera: this.threeCamera,
      onResize: () => this.requestRender(),
    });

    // Connect the scene's invalidate function to update the three.js scene and rerender
    scene.listenForSceneInvalidation(() => {
      this.onSceneChanged();
    });

    // Render the first frame
    this.onSceneChanged();
    this.requestRender();
  }

  changeActiveCam(cameraId: ItemId) {
    this.activeCam = this.scene.getCamera(cameraId);
    // TODO: Update the camera fields of the threeCamera as well
  }

  onSceneChanged() {
    const newSceneSnapshot = this.scene.getSceneSnapshot();

    // Update threeScene data, comparing it to the last snapshot of scene
    // This is kinda like React's reconciliation algorithm.
    const unrenderedItems = new Set(
      this.lastSceneSnapshot.itemSnapshots.keys()
    );
    for (const [id, item] of newSceneSnapshot.itemSnapshots.entries()) {
      if (unrenderedItems.has(id)) {
        // If it exists and it's dirty, we update it
        unrenderedItems.delete(id);
        if (!item.isDirty) continue;
        this.updateItem(item);
      } else {
        // If the item doesn't exist in the last snapshot, we create it
        this.createItem(item);
      }
    }
    // If after going through all the items in the new snapshot, we still have unrendered
    // items, that means that item was removed from the scene. We remove it as well.
    for (const id of unrenderedItems) {
      this.removeItem(id);
    }

    // Render the updated scene and finish
    this.lastSceneSnapshot = newSceneSnapshot;
    this.requestRender();
    this.scene.renderComplete();
  }

  createItem(item: ItemSnapshot) {
    const renderer = getRenderer(item.kind);
    const obj = renderer.create(item, this.threeScene);
    this.threeMeshes.set(item.id, obj);
  }

  updateItem(item: ItemSnapshot) {
    const obj = this.threeMeshes.get(item.id);
    if (!obj || !item.isDirty) return;
    // Ensure the kind matches
    if (obj.kind !== item.kind) return;
    const renderer = getRenderer(item.kind);
    renderer.update(item, obj);
  }

  removeItem(id: ItemId) {
    const obj = this.threeMeshes.get(id);
    if (!obj) return;
    const renderer = getRenderer(obj.kind);
    if (renderer.dispose) {
      renderer.dispose(obj, this.threeScene);
    }
    this.threeMeshes.delete(id);
  }

  requestRender() {
    if (!this.frameScheduled) {
      this.frameScheduled = true;
      requestAnimationFrame(() => this._render());
    }
  }

  // Don't call this function directly. Call `requestRender` instead,
  // which handles animation frames
  _render() {
    this.frameScheduled = false;
    this.sizer.applyIfNeeded();
    const cameraUpdated = this.threeOrbitControls.update();
    this.threeRenderer.render(this.threeScene, this.threeCamera);

    if (cameraUpdated) {
      // TODO: When connecting the camera position updating the scene and causing a re-render,
      // This will probably cause an infinite loop
      // threejs camera updating -> scene camera updating -> causing a re-render -> ...
      // but I'm not sure, maybe cameraUpdated guard already handles this, idk.
      // TODO: Now that we're only passing snapshots to the renderer, find a way to
      // Pass the events like orbit back to the scene so it can update the items
      // (including the camera, which is now just an item)
      // this.camera.position.set(this.threeCamera.position)
      // this.camera.lookAt.set(this.threeOrbitControls.target);
    }
  }

  dispose() {
    // Remove all items from the scene (disposes their geometries/materials)
    for (const id of this.threeMeshes.keys()) {
      this.removeItem(id);
    }

    // Dispose Three.js resources
    this.sizer.dispose();
    this.threeOrbitControls.dispose();
    this.threeRenderer.dispose();

    // Remove canvas from DOM
    if (this.threeRenderer.domElement.parentNode === this.containerElem) {
      this.containerElem.removeChild(this.threeRenderer.domElement);
    }
  }
}

// Resize helper, defers actual resize until render to avoid flicker
function createResponsiveThreeSizer({
  container,
  renderer,
  camera,
  onResize,
}: {
  container: HTMLElement;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  onResize: () => void;
}) {
  let pendingWidth = 0;
  let pendingHeight = 0;

  const ro = new ResizeObserver((entries) => {
    const { width, height } = entries[0].contentRect;
    if (width > 0 && height > 0) {
      pendingWidth = width;
      pendingHeight = height;
      onResize();
    }
  });
  ro.observe(container);

  // Capture initial size
  const rect = container.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    pendingWidth = rect.width;
    pendingHeight = rect.height;
  }

  function applyIfNeeded() {
    const currentSize = renderer.getSize(new THREE.Vector2());
    if (currentSize.x === pendingWidth && currentSize.y === pendingHeight) {
      return;
    }
    renderer.setSize(pendingWidth, pendingHeight, false);
    camera.aspect = pendingWidth / pendingHeight;
    camera.updateProjectionMatrix();
  }

  return { applyIfNeeded, dispose: () => ro.disconnect() };
}
