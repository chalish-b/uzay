import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import type { Camera3D, Camera3DFields } from "./items/camera3d";
import type { Scene3D, SceneSnapshot } from "./scene3d";
import { Vec3, vec3 } from "../shared/types/vec3";
import { vec2 } from "../shared/types/vec2";
import { cameraShowsTags } from "../shared/types/tags";
import type { ItemId, ItemSnapshot } from "./types/item-registry";
import { setBoundAtomIfWritable, type AtomLikeOptions } from "../shared/atom-wrapper";
import { getRenderer, type ThreeSceneObject } from "./renderers";
import type {
  InteractionEvent,
  InteractionEventType,
} from "./types/interaction-events";
import type { PointDraggableDir } from "./types/axes";

export class View3D {
  scene: Scene3D;
  activeCam: Camera3D<AtomLikeOptions<Camera3DFields>>;
  containerElem: HTMLElement;

  // three.js specific fields
  // These will probably be extracted into a separate class, like "Renderer"
  threeScene: THREE.Scene;
  threeCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  threeOrbitControls: OrbitControls;
  threeRenderer: THREE.WebGLRenderer;
  css2dRenderer: CSS2DRenderer;
  frameScheduled: boolean = false;
  threeMeshes: Map<ItemId, ThreeSceneObject> = new Map();
  // Each item's objects live under their own group so the active camera's
  // `visibleTags` can hide the whole item at once, independent of the item's
  // own `visible` field.
  itemGroups: Map<ItemId, THREE.Group> = new Map();
  ambientLight: THREE.AmbientLight;
  directionalLight: THREE.DirectionalLight;
  unsubscribeSceneInvalidation: (() => void) | null = null;

  // Scene snapshots. Initially an empty list, so all items will be added
  lastSceneSnapshot: SceneSnapshot = { itemSnapshots: new Map() };

  // Camera sync state
  private _isSyncingToThree = false;
  private _isSyncingFromThree = false;
  private _lastCameraSnapshot: Camera3DSnapshot | null = null;

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

    // Aspect starts at 1; the sizer applies the real canvas aspect on the
    // first render.
    const camera = this.activeCam.getItemSnapshot();
    this.threeCamera = createThreeCamera(camera, 1);

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
    this.threeRenderer.domElement.style.width = "100%";
    this.threeRenderer.domElement.style.height = "100%";
    this.threeRenderer.domElement.style.display = "block";

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

    // CSS2D renderer for overlay items (labels, annotations)
    this.css2dRenderer = new CSS2DRenderer();
    this.css2dRenderer.domElement.style.position = "absolute";
    this.css2dRenderer.domElement.style.inset = "0";
    this.css2dRenderer.domElement.style.pointerEvents = "none";
    containerElem.appendChild(this.css2dRenderer.domElement);

    this.threeOrbitControls = new OrbitControls(
      this.threeCamera,
      this.threeRenderer.domElement
    );
    // TODO: Make damping an option
    this.threeOrbitControls.enableDamping = false;
    this.threeOrbitControls.target.set(...camera.lookAt.toArray());
    this.threeOrbitControls.addEventListener("change", () => {
      this.syncCameraFromThree();
      this.requestRender();
    });

    // Initialize camera snapshot cache
    this._lastCameraSnapshot = this.activeCam.getItemSnapshot();

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

    // Ambient light for phong materials
    this.ambientLight = new THREE.AmbientLight("white", 1.5);
    this.threeScene.add(this.ambientLight);

    // Directional light, synced to camera position
    this.directionalLight = new THREE.DirectionalLight("white", 1);
    this.threeScene.add(this.directionalLight);
    this.threeScene.add(this.directionalLight.target);
    this.directionalLight.position.set(0, 0, 0);

    this.sizer = createResponsiveThreeSizer({
      container: containerElem,
      renderer: this.threeRenderer,
      applyCameraSize: (width, height) => this.applyCameraAspect(width / height),
      onResize: () => this.requestRender(),
    });

    // Connect the scene's invalidate function to update the three.js scene and rerender
    this.unsubscribeSceneInvalidation = scene.listenForSceneInvalidation(() => {
      this.onSceneChanged();
    });

    // Render the first frame
    this.onSceneChanged();
    this.requestRender();
  }

  changeActiveCam(cameraId: ItemId) {
    this.activeCam = this.scene.getCamera(cameraId);
    this._lastCameraSnapshot = null;
    this.syncCameraToThree();
    // OrbitControls caches the camera's spherical coordinates internally.
    // After changing position + target, we must call update() so it
    // recalculates from the new values instead of snapping back.
    // this.threeOrbitControls.update();
    this.requestRender();
  }

  onSceneChanged() {
    const newSceneSnapshot = this.scene.getSceneSnapshot();

    // Update threeScene data, comparing it to the last snapshot of scene
    // This is kinda like React's reconciliation algorithm.
    const unrenderedItems = new Set(
      this.lastSceneSnapshot.itemSnapshots.keys()
    );
    for (const [id, item] of newSceneSnapshot.itemSnapshots.entries()) {
      const prev = this.lastSceneSnapshot.itemSnapshots.get(id);
      if (prev) {
        // Redraw only what changed since this view last applied it. Comparing
        // against our own previous snapshot keeps views independent: another
        // view rendering the same item doesn't reset our state.
        unrenderedItems.delete(id);
        if (item.version === prev.version) continue;
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

    // Sync camera atoms to Three.js if camera changed
    this.syncCameraToThree();

    // Render the updated scene and finish
    this.lastSceneSnapshot = newSceneSnapshot;
    this.requestRender();
    this.scene.renderComplete();
  }

  createItem(item: ItemSnapshot) {
    const renderer = getRenderer(item.kind);
    const group = new THREE.Group();
    this.threeScene.add(group);
    const obj = renderer.create(item, group);
    this.threeMeshes.set(item.id, obj);
    this.itemGroups.set(item.id, group);
  }

  updateItem(item: ItemSnapshot) {
    const obj = this.threeMeshes.get(item.id);
    const group = this.itemGroups.get(item.id);
    if (!obj || !group) return;
    // Ensure the kind matches
    if (obj.kind !== item.kind) return;
    const renderer = getRenderer(item.kind);
    renderer.update(item, obj, group);
  }

  removeItem(id: ItemId) {
    const obj = this.threeMeshes.get(id);
    const group = this.itemGroups.get(id);
    if (!obj || !group) return;
    const renderer = getRenderer(obj.kind);
    if (renderer.dispose) {
      renderer.dispose(obj, group);
    }
    this.threeScene.remove(group);
    this.threeMeshes.delete(id);
    this.itemGroups.delete(id);
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

    // Apply resize
    this.sizer.applyIfNeeded();

    // Keep CSS2D renderer size in sync with WebGL renderer
    const size = this.threeRenderer.getSize(new THREE.Vector2());
    this.css2dRenderer.setSize(size.x, size.y);

    // Update camera position, and sync the directional light for it
    this.threeOrbitControls.update();
    this.directionalLight.position.copy(this.threeCamera.position);
    this.directionalLight.target.position.set(0, 0, 0);

    // Hide items the active camera's visibleTags filter out
    this.applyCameraVisibility();

    // Render
    this.threeRenderer.render(this.threeScene, this.threeCamera);
    this.css2dRenderer.render(this.threeScene, this.threeCamera);
  }

  // ========== Camera Sync ==========

  // Aspect ratio of the current canvas, falling back to 1 before the first
  // real resize has been applied.
  private getAspect(): number {
    const size = this.threeRenderer.getSize(new THREE.Vector2());
    return size.x > 0 && size.y > 0 ? size.x / size.y : 1;
  }

  // Called by the sizer after the renderer resizes. The camera's projection
  // depends on the canvas aspect ratio; View3D owns the camera instance (and
  // may swap it on projection change), so sizing it is View3D's job.
  private applyCameraAspect(aspect: number) {
    if (this.threeCamera instanceof THREE.PerspectiveCamera) {
      this.threeCamera.aspect = aspect;
    } else {
      applyOrthoFrustum(this.threeCamera, this.activeCam.getItemSnapshot(), aspect);
    }
    this.threeCamera.updateProjectionMatrix();
  }

  syncCameraToThree() {
    if (this._isSyncingFromThree) return;

    const snap = this.activeCam.getItemSnapshot();
    let last = this._lastCameraSnapshot;

    this._isSyncingToThree = true;
    try {
      // Swap the three.js camera instance when the requested projection
      // doesn't match the current camera type (projection atom change, or
      // changeActiveCam to a camera in the other mode). OrbitControls keeps
      // working across the swap; it reads `object` on every update().
      const wantsOrtho = snap.projection === "orthographic";
      const isOrtho = this.threeCamera instanceof THREE.OrthographicCamera;
      if (wantsOrtho !== isOrtho) {
        this.threeCamera = createThreeCamera(snap, this.getAspect());
        this.threeOrbitControls.object = this.threeCamera;
        last = null; // re-apply every field to the fresh camera below
      }

      // Position
      if (!last || !snap.position.equals(last.position)) {
        this.threeCamera.position.set(...snap.position.toArray());
      }

      // LookAt -> OrbitControls target
      if (!last || !snap.lookAt.equals(last.lookAt)) {
        this.threeOrbitControls.target.set(...snap.lookAt.toArray());
      }

      // Projection properties
      let needsProjectionUpdate = false;
      if (this.threeCamera instanceof THREE.PerspectiveCamera) {
        if (!last || snap.fov !== last.fov) {
          this.threeCamera.fov = snap.fov;
          needsProjectionUpdate = true;
        }
      } else if (
        // The orthographic frustum is derived from fov plus the distance
        // between position and lookAt, so a change to any of them resizes it.
        !last ||
        snap.fov !== last.fov ||
        !snap.position.equals(last.position) ||
        !snap.lookAt.equals(last.lookAt)
      ) {
        applyOrthoFrustum(this.threeCamera, snap, this.getAspect());
        needsProjectionUpdate = true;
      }
      if (!last || snap.zoom !== last.zoom) {
        this.threeCamera.zoom = snap.zoom;
        needsProjectionUpdate = true;
      }
      if (!last || snap.near !== last.near) {
        this.threeCamera.near = snap.near;
        needsProjectionUpdate = true;
      }
      if (!last || snap.far !== last.far) {
        this.threeCamera.far = snap.far;
        needsProjectionUpdate = true;
      }
      if (needsProjectionUpdate) {
        this.threeCamera.updateProjectionMatrix();
      }

      // OrbitControls enable/disable
      if (!last || snap.enableOrbit !== last.enableOrbit) {
        this.threeOrbitControls.enableRotate = snap.enableOrbit;
      }
      if (!last || snap.enablePan !== last.enablePan) {
        this.threeOrbitControls.enablePan = snap.enablePan;
      }
      if (!last || snap.enableZoom !== last.enableZoom) {
        this.threeOrbitControls.enableZoom = snap.enableZoom;
      }

      // Recalculate OrbitControls' internal spherical state from the current
      // position + target so the next update() in _render() doesn't reposition
      // the camera based on stale internals.
      // I don't think this has any effect so I disabled it for now.
      // this.threeOrbitControls.update();

      this._lastCameraSnapshot = snap;
    } finally {
      this._isSyncingToThree = false;
    }
  }

  syncCameraFromThree() {
    if (this._isSyncingToThree) return;

    this._isSyncingFromThree = true;
    try {
      const cam = this.activeCam;
      const tp = this.threeCamera.position;
      const tt = this.threeOrbitControls.target;

      const newPos = vec3(tp.x, tp.y, tp.z);
      const newLookAt = vec3(tt.x, tt.y, tt.z);

      // Write back camera state only when the destination atom is writable.
      if (!newPos.equals(cam.position.get())) {
        setBoundAtomIfWritable(cam.position, newPos);
      }
      if (!newLookAt.equals(cam.lookAt.get())) {
        setBoundAtomIfWritable(cam.lookAt, newLookAt);
      }

      // OrbitControls zooms an orthographic camera by changing camera.zoom
      // instead of dollying the position, so zoom needs writing back too.
      const newZoom = this.threeCamera.zoom;
      if (newZoom !== cam.zoom.get()) {
        setBoundAtomIfWritable(cam.zoom, newZoom);
      }

      // Update snapshot cache so next reconciliation doesn't see a false diff
      this._lastCameraSnapshot = cam.getItemSnapshot();
    } finally {
      this._isSyncingFromThree = false;
    }
  }

  // ========== Camera-scoped visibility ==========

  // Hide whole items the active camera's `visibleTags` filters out. We toggle
  // the per-item group (which culls its WebGL meshes) and each CSS2D label
  // inside it (CSS2DRenderer ignores an ancestor's visibility, so it needs its
  // own flag set). The item's own `visible` field stays untouched on the inner
  // meshes, so the two compose.
  applyCameraVisibility(): void {
    const visibleTags = this.activeCam.visibleTags.get();
    for (const [id, group] of this.itemGroups.entries()) {
      const item = this.lastSceneSnapshot.itemSnapshots.get(id);
      const tags = item && "tags" in item ? item.tags : [];
      const show = cameraShowsTags(visibleTags, tags);
      group.visible = show;
      group.traverse((obj) => {
        if ((obj as { isCSS2DObject?: boolean }).isCSS2DObject) {
          obj.visible = show;
        }
      });
    }
  }

  // Whether the active camera renders the given item (by its tags). Used to
  // keep hit-testing in step with what's drawn.
  cameraShowsItem(id: ItemId): boolean {
    const item = this.lastSceneSnapshot.itemSnapshots.get(id);
    const tags = item && "tags" in item ? item.tags : [];
    return cameraShowsTags(this.activeCam.visibleTags.get(), tags);
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
          const itemId = obj.userData.itemId as ItemId;
          // Skip items with pointerEvents: "none"
          const item = this.scene.items.get(itemId);
          if (item && "pointerEvents" in item && item.pointerEvents.get() === "none") break;
          // Can't grab what the active camera doesn't render.
          if (!this.cameraShowsItem(itemId)) break;

          return {
            itemId,
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

  // Check whether an item has any hover consumer (custom or default).
  // We use this to avoid dispatching high-frequency hover events unnecessarily.
  hasHoverListener(itemId: ItemId): boolean {
    const item = this.scene.items.get(itemId);
    if (!item) return false;
    return !!item.getHandler("hover") || typeof item.handleHover === "function";
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

  // Update the raycaster from a pointer event so getCurrentRay() returns
  // the ray for the current mouse position.
  private updateRaycaster(event: PointerEvent): void {
    const rect = this.threeRenderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.threeCamera);
  }

  // Extract the current raycaster ray as plain Vec3 values
  private getCurrentRay(): { origin: Vec3; direction: Vec3 } {
    const r = this.raycaster.ray;
    return {
      origin: vec3(r.origin.x, r.origin.y, r.origin.z),
      direction: vec3(r.direction.x, r.direction.y, r.direction.z),
    };
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

      // Capture the pointer so the drag keeps receiving move/up events even when
      // the cursor passes over overlay DOM elements or leaves the canvas.
      this.threeRenderer.domElement.setPointerCapture(event.pointerId);

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
        screenPosition: vec2(event.clientX, event.clientY),
        startWorldPosition: hit.worldPosition,
        worldPosition: hit.worldPosition,
        delta: vec3(0, 0, 0),
        ray: this.getCurrentRay(),
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

      // "custom" mode skips the engine's screen-to-world projection entirely.
      // The handler is expected to use event.ray for its own projection logic.
      const isCustom = this.dragState.constraint === "custom";
      if (isCustom) this.updateRaycaster(event);
      const ray = this.getCurrentRay();
      const worldPos = isCustom
        ? this.dragState.lastWorldPosition
        : this.screenToWorld(
            event,
            this.dragState.startWorldPosition,
            this.dragState.constraint
          );

      const delta = worldPos.sub(this.dragState.lastWorldPosition);
      if (!isCustom) this.dragState.lastWorldPosition = worldPos;

      this.dispatchEvent("drag", {
        type: "drag",
        phase: "move",
        itemId: this.dragState.itemId,
        itemKind: item.kind,
        screenPosition: vec2(event.clientX, event.clientY),
        worldPosition: worldPos,
        startWorldPosition: this.dragState.startWorldPosition,
        delta,
        ray,
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
        if (oldItem && this.hasHoverListener(this.hoveredItemId)) {
          this.dispatchEvent("hover", {
            type: "hover",
            phase: "leave",
            itemId: this.hoveredItemId,
            itemKind: oldItem.kind,
            screenPosition: vec2(event.clientX, event.clientY),
            worldPosition: vec3(0, 0, 0), // Not meaningful for leave
            ray: this.getCurrentRay(),
          });
        }
      }

      // Enter new
      if (newHoveredId && hit) {
        const newItem = this.scene.items.get(newHoveredId);
        if (newItem && this.hasHoverListener(newHoveredId)) {
          this.dispatchEvent("hover", {
            type: "hover",
            phase: "enter",
            itemId: newHoveredId,
            itemKind: newItem.kind,
            screenPosition: vec2(event.clientX, event.clientY),
            worldPosition: hit.worldPosition,
            ray: this.getCurrentRay(),
          });
        }
      }

      this.hoveredItemId = newHoveredId;
      this.updateCursor();
    } else if (newHoveredId && hit) {
      const currentItem = this.scene.items.get(newHoveredId);
      if (currentItem && this.hasHoverListener(newHoveredId)) {
        this.dispatchEvent("hover", {
          type: "hover",
          phase: "move",
          itemId: newHoveredId,
          itemKind: currentItem.kind,
          screenPosition: vec2(event.clientX, event.clientY),
          worldPosition: hit.worldPosition,
          ray: this.getCurrentRay(),
        });
      }
    }
  };

  onPointerUp = (event: PointerEvent) => {
    if (this.dragState) {
      const item = this.scene.items.get(this.dragState.itemId);
      if (item) {
        const isCustom = this.dragState.constraint === "custom";
        if (isCustom) this.updateRaycaster(event);
        const worldPos = isCustom
          ? this.dragState.startWorldPosition
          : this.screenToWorld(
              event,
              this.dragState.startWorldPosition,
              this.dragState.constraint
            );
        this.dispatchEvent("drag", {
          type: "drag",
          phase: "end",
          itemId: this.dragState.itemId,
          itemKind: item.kind,
          screenPosition: vec2(event.clientX, event.clientY),
          startWorldPosition: this.dragState.startWorldPosition,
          worldPosition: worldPos,
          delta: worldPos.sub(this.dragState.startWorldPosition),
          ray: this.getCurrentRay(),
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
              screenPosition: vec2(event.clientX, event.clientY),
              ray: this.getCurrentRay(),
            });
          }
        }
      }
    }
    this.pointerDownInfo = null;
  };

  onPointerLeave = (_event: PointerEvent) => {
    // Only clears idle hover state. An active drag holds pointer capture and
    // runs until pointerup, so the cursor leaving the canvas leaves it intact.
    if (this.dragState) return;

    this.hoveredItemId = null;
    this.pointerDownInfo = null;
    this.updateCursor();
  };

  dispose() {
    // Unsubscribe from scene invalidation
    this.unsubscribeSceneInvalidation?.();
    this.unsubscribeSceneInvalidation = null;

    // Remove all items from the scene (disposes their geometries/materials)
    for (const id of this.threeMeshes.keys()) {
      this.removeItem(id);
    }

    // Remove and dispose lights
    this.threeScene.remove(this.ambientLight);
    this.threeScene.remove(this.directionalLight);
    this.threeScene.remove(this.directionalLight.target);
    this.directionalLight.dispose();

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
    this.threeRenderer.forceContextLoss();
    this.threeRenderer.dispose();

    // Remove canvas from DOM
    if (this.threeRenderer.domElement.parentNode === this.containerElem) {
      this.containerElem.removeChild(this.threeRenderer.domElement);
    }

    // Remove CSS2D renderer DOM element
    if (this.css2dRenderer.domElement.parentNode === this.containerElem) {
      this.containerElem.removeChild(this.css2dRenderer.domElement);
    }
  }
}

type Camera3DSnapshot = ReturnType<Camera3D<any>["getItemSnapshot"]>;

// Size the orthographic frustum from fov + the distance to lookAt, so the
// plane through lookAt shows exactly the extent a perspective camera with the
// same fov would show from the same position. Toggling `projection` therefore
// preserves framing; only the foreshortening changes. It also keeps fov
// meaningful in orthographic mode: it scales the visible extent.
function applyOrthoFrustum(
  camera: THREE.OrthographicCamera,
  snap: Camera3DSnapshot,
  aspect: number
) {
  const dist = snap.position.sub(snap.lookAt).len() || 1;
  const halfHeight = dist * Math.tan((snap.fov * Math.PI) / 360);
  const halfWidth = halfHeight * aspect;
  camera.left = -halfWidth;
  camera.right = halfWidth;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
}

// Build the matching three.js camera for a camera item snapshot.
function createThreeCamera(
  snap: Camera3DSnapshot,
  aspect: number
): THREE.PerspectiveCamera | THREE.OrthographicCamera {
  let camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  if (snap.projection === "orthographic") {
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, snap.near, snap.far);
    applyOrthoFrustum(camera, snap, aspect);
  } else {
    camera = new THREE.PerspectiveCamera(snap.fov, aspect, snap.near, snap.far);
  }
  camera.position.set(...snap.position.toArray());
  camera.lookAt(...snap.lookAt.toArray());
  camera.zoom = snap.zoom;
  camera.updateProjectionMatrix();
  return camera;
}

// Resize helper, defers actual resize until render to avoid flicker
function createResponsiveThreeSizer({
  container,
  renderer,
  applyCameraSize,
  onResize,
}: {
  container: HTMLElement;
  renderer: THREE.WebGLRenderer;
  applyCameraSize: (width: number, height: number) => void;
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
    applyCameraSize(pendingWidth, pendingHeight);
  }

  return { applyIfNeeded, dispose: () => ro.disconnect() };
}
