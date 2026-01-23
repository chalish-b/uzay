import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Camera3D, Camera3DFields } from "./items/camera3d";
import type { Scene3D, SceneSnapshot } from "./scene3d";
import { Vec3, vec3 } from "./common-types/vec3";
import type { ItemId, ItemSnapshot } from "./common-types/item-registry";
import type { AtomLikeOptions } from "./atom-wrapper";
import { getRenderer, type ThreeSceneObject } from "./renderers";
import type {
  InteractionEvent,
  InteractionEventType,
} from "./common-types/interaction-events";
import type { PointDraggableDir } from "./common-types/axes";

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

  // Interaction system
  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  // Drag state
  dragState: {
    itemId: ItemId;
    constraint: PointDraggableDir;
    startWorldPosition: Vec3;
    lastWorldPosition: Vec3;
  } | null = null;

  // Click detection
  pointerDownInfo: {
    itemId: ItemId;
    screenPosition: { x: number; y: number };
    time: number;
  } | null = null;

  // Hover state
  hoveredItemId: ItemId | null = null;

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

    // Interaction event listeners
    const canvas = this.threeRenderer.domElement;
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointerleave", this.onPointerLeave);

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

  // ========== Interaction System ==========

  // Raycast to find item under pointer
  raycastItem(
    event: PointerEvent
  ) {
    const rect = this.threeRenderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.threeCamera);

    // Raycast against all objects in scene, check for itemId in userData
    const intersects = this.raycaster.intersectObjects(
      this.threeScene.children,
      true // recursive
    );

    for (const hit of intersects) {
      // Walk up the object hierarchy to find itemId
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (obj.userData.itemId) {
          return {
            itemId: obj.userData.itemId as ItemId,
            worldPosition: vec3(hit.point.x, hit.point.y, hit.point.z),
          };
        }
        obj = obj.parent;
      }
    }

    return null;
  }

  // Dispatch event to item (custom handler or default)
  dispatchEvent<E extends InteractionEventType>(
    eventType: E,
    event: InteractionEvent
  ) {
    const item = this.scene.items.get(event.itemId);
    if (!item) return;

    // Check for custom handler first
    const customHandler = item.getHandler(eventType);
    if (customHandler) {
      (customHandler as (e: InteractionEvent) => void)(event);
      return;
    }

    // Fall back to item's default handler
    if (eventType === "drag" && item.handleDrag) {
      item.handleDrag(event as any);
    } else if (eventType === "click" && item.handleClick) {
      item.handleClick(event as any);
    } else if (eventType === "hover" && item.handleHover) {
      item.handleHover(event as any);
    }
  }

  // Get drag constraint from item snapshot
  // TODO: This should be a method on the Item class itself, the item should provide its own drag constraint and behavior
  getItemDragConstraint(
    snapshot: ItemSnapshot
  ) {
    if ("draggable" in snapshot) {
      return (snapshot as any).draggable as PointDraggableDir;
    }
    return null;
  }

  // Convert screen coordinates to world position based on constraint
  screenToWorld(
    event: PointerEvent,
    referencePoint: Vec3,
    constraint: PointDraggableDir
  ) {
    const rect = this.threeRenderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.threeCamera);
    const ray = this.raycaster.ray;
    const ref = new THREE.Vector3(
      referencePoint.x,
      referencePoint.y,
      referencePoint.z
    );

    let result: THREE.Vector3;

    switch (constraint) {
      // Plane constraints: intersect with the fixed plane
      case "xy": {
        const plane = new THREE.Plane(
          new THREE.Vector3(0, 0, 1),
          -referencePoint.z
        );
        result = new THREE.Vector3();
        ray.intersectPlane(plane, result);
        break;
      }
      case "xz": {
        const plane = new THREE.Plane(
          new THREE.Vector3(0, 1, 0),
          -referencePoint.y
        );
        result = new THREE.Vector3();
        ray.intersectPlane(plane, result);
        break;
      }
      case "yz": {
        const plane = new THREE.Plane(
          new THREE.Vector3(1, 0, 0),
          -referencePoint.x
        );
        result = new THREE.Vector3();
        ray.intersectPlane(plane, result);
        break;
      }

      // Axis constraints: find closest point on axis to ray
      case "x": {
        const axisDir = new THREE.Vector3(1, 0, 0);
        result = this.closestPointOnAxis(ray, ref, axisDir);
        break;
      }
      case "y": {
        const axisDir = new THREE.Vector3(0, 1, 0);
        result = this.closestPointOnAxis(ray, ref, axisDir);
        break;
      }
      case "z": {
        const axisDir = new THREE.Vector3(0, 0, 1);
        result = this.closestPointOnAxis(ray, ref, axisDir);
        break;
      }

      // Unconstrained: camera-facing plane at reference depth
      case "xyz":
      default: {
        const cameraDir = new THREE.Vector3();
        this.threeCamera.getWorldDirection(cameraDir);
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
          cameraDir.negate(),
          ref
        );
        result = new THREE.Vector3();
        ray.intersectPlane(plane, result);
        break;
      }
    }

    return vec3(result.x, result.y, result.z);
  }

  // Find the point on an axis line closest to a ray
  // TODO: This should probably be extracted into a helper function. It doesn't do anything specific to View3D.
  closestPointOnAxis(
    ray: THREE.Ray,
    axisOrigin: THREE.Vector3,
    axisDir: THREE.Vector3
  ) {
    // Math: find closest points between two lines (ray and axis)
    // The axis line is: P = axisOrigin + t * axisDir
    // The ray is: Q = ray.origin + s * ray.direction

    const w0 = new THREE.Vector3().subVectors(axisOrigin, ray.origin);
    const a = axisDir.dot(axisDir); // always > 0
    const b = axisDir.dot(ray.direction);
    const c = ray.direction.dot(ray.direction);
    const d = axisDir.dot(w0);
    const e = ray.direction.dot(w0);

    const denom = a * c - b * b;

    // t parameter on the axis line for closest point
    const t = denom !== 0 ? (b * e - c * d) / denom : 0;

    // Return the point on the axis
    return new THREE.Vector3().copy(axisOrigin).addScaledVector(axisDir, t);
  }

  // Update cursor based on current state
  updateCursor(): void {
    const canvas = this.threeRenderer.domElement;

    // During drag, show grabbing cursor
    if (this.dragState) {
      canvas.style.cursor = "grabbing";
      return;
    }

    // When hovering, use item's cursor state
    if (this.hoveredItemId) {
      const item = this.scene.items.get(this.hoveredItemId);
      const cursor = item?.getCursorState();
      canvas.style.cursor = cursor ?? "default";
      return;
    }

    canvas.style.cursor = "default";
  }

  // ========== Pointer Event Handlers ==========

  onPointerDown = (event: PointerEvent) => {
    const hit = this.raycastItem(event);
    if (!hit) return;

    const item = this.scene.items.get(hit.itemId);
    if (!item) return;

    // Store pointer down info for click detection
    this.pointerDownInfo = {
      itemId: hit.itemId,
      screenPosition: { x: event.clientX, y: event.clientY },
      time: Date.now(),
    };

    // Check if item is draggable
    const snapshot = item.getItemSnapshot();
    const constraint = this.getItemDragConstraint(snapshot);

    if (constraint && constraint !== "none") {
      // Disable orbit controls during drag
      this.threeOrbitControls.enabled = false;

      this.dragState = {
        itemId: hit.itemId,
        constraint,
        startWorldPosition: hit.worldPosition,
        lastWorldPosition: hit.worldPosition,
      };

      this.dispatchEvent("drag", {
        type: "drag",
        phase: "start",
        itemId: hit.itemId,
        itemKind: item.kind,
        screenPosition: { x: event.clientX, y: event.clientY },
        startWorldPosition: hit.worldPosition,
        worldPosition: hit.worldPosition,
        delta: vec3(0, 0, 0),
      });

      this.updateCursor();
    }
  };

  onPointerMove = (event: PointerEvent) => {
    // Handle drag
    if (this.dragState) {
      const item = this.scene.items.get(this.dragState.itemId);
      if (!item) {
        // Item was removed during drag
        this.dragState = null;
        this.threeOrbitControls.enabled = true;
        return;
      }

      const worldPos = this.screenToWorld(
        event,
        this.dragState.startWorldPosition,
        this.dragState.constraint
      );

      const delta = Vec3.subtract(worldPos, this.dragState.lastWorldPosition);
      this.dragState.lastWorldPosition = worldPos;

      this.dispatchEvent("drag", {
        type: "drag",
        phase: "move",
        itemId: this.dragState.itemId,
        itemKind: item.kind,
        screenPosition: { x: event.clientX, y: event.clientY },
        worldPosition: worldPos,
        startWorldPosition: this.dragState.startWorldPosition,
        delta,
      });
      return;
    }

    // Handle hover
    const hit = this.raycastItem(event);
    const newHoveredId = hit?.itemId ?? null;

    if (newHoveredId !== this.hoveredItemId) {
      // Leave old
      if (this.hoveredItemId) {
        const oldItem = this.scene.items.get(this.hoveredItemId);
        if (oldItem) {
          this.dispatchEvent("hover", {
            type: "hover",
            phase: "leave",
            itemId: this.hoveredItemId,
            itemKind: oldItem.kind,
            screenPosition: { x: event.clientX, y: event.clientY },
            worldPosition: vec3(0, 0, 0), // Not meaningful for leave
          });
        }
      }

      // Enter new
      if (newHoveredId && hit) {
        const newItem = this.scene.items.get(newHoveredId);
        if (newItem) {
          this.dispatchEvent("hover", {
            type: "hover",
            phase: "enter",
            itemId: newHoveredId,
            itemKind: newItem.kind,
            screenPosition: { x: event.clientX, y: event.clientY },
            worldPosition: hit.worldPosition,
          });
        }
      }

      this.hoveredItemId = newHoveredId;
      this.updateCursor();
    }
  };

  onPointerUp = (event: PointerEvent) => {
    if (this.dragState) {
      const item = this.scene.items.get(this.dragState.itemId);
      if (item) {
        const worldPos = this.screenToWorld(
          event,
          this.dragState.startWorldPosition,
          this.dragState.constraint
        );
        this.dispatchEvent("drag", {
          type: "drag",
          phase: "end",
          itemId: this.dragState.itemId,
          itemKind: item.kind,
          screenPosition: { x: event.clientX, y: event.clientY },
          startWorldPosition: this.dragState.startWorldPosition,
          worldPosition: worldPos,
          delta: Vec3.subtract(worldPos, this.dragState.startWorldPosition),
        });
      }

      this.dragState = null;
      this.threeOrbitControls.enabled = true;
      this.updateCursor();
    }

    // Check for click (pointerdown + pointerup on same item without significant movement)
    if (this.pointerDownInfo && !this.dragState) {
      const hit = this.raycastItem(event);
      if (hit && hit.itemId === this.pointerDownInfo.itemId) {
        const dx = event.clientX - this.pointerDownInfo.screenPosition.x;
        const dy = event.clientY - this.pointerDownInfo.screenPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 5) {
          // Click threshold in pixels
          const item = this.scene.items.get(hit.itemId);
          if (item) {
            this.dispatchEvent("click", {
              type: "click",
              itemId: hit.itemId,
              itemKind: item.kind,
              worldPosition: hit.worldPosition,
              screenPosition: { x: event.clientX, y: event.clientY },
            });
          }
        }
      }
    }
    this.pointerDownInfo = null;
  };

  onPointerLeave = (_event: PointerEvent) => {
    // Clean up drag state if pointer leaves canvas
    if (this.dragState) {
      this.dragState = null;
      this.threeOrbitControls.enabled = true;
    }

    // Clear hover state
    this.hoveredItemId = null;
    this.pointerDownInfo = null;
    this.updateCursor();
  };

  dispose() {
    // Remove all items from the scene (disposes their geometries/materials)
    for (const id of this.threeMeshes.keys()) {
      this.removeItem(id);
    }

    // Remove interaction event listeners
    const canvas = this.threeRenderer.domElement;
    canvas.removeEventListener("pointerdown", this.onPointerDown);
    canvas.removeEventListener("pointermove", this.onPointerMove);
    canvas.removeEventListener("pointerup", this.onPointerUp);
    canvas.removeEventListener("pointerleave", this.onPointerLeave);

    // Clear interaction state
    this.dragState = null;
    this.pointerDownInfo = null;
    this.hoveredItemId = null;

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
