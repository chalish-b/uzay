import * as THREE from "three";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import type { Camera2D, Camera2DFields } from "./items/camera2d";
import type { Scene2D, SceneSnapshot } from "./scene2d";
import { Vec2, vec2 } from "../shared/types/vec2";
import { cameraShowsTags } from "../shared/types/tags";
import type { ItemId, ItemSnapshot } from "./types/item-registry";
import {
  setBoundAtomIfWritable,
  type AtomLikeOptions,
} from "../shared/atom-wrapper";
import { getRenderer, type ThreeSceneObject } from "./renderers";
import type {
  InteractionEvent,
  InteractionEventType,
} from "./types/interaction-events";
import type { PointDraggableDir2D } from "./types/axes";
import type { ViewLayoutContext2D, Viewport2D } from "./types/view-context";

// Visible vertical extent (in world units) at zoom = 1. The horizontal extent
// follows from canvas aspect ratio.
const BASE_VERTICAL_HALF_SPAN = 5;
const CLICK_THRESHOLD_PX = 5;
const WHEEL_ZOOM_FACTOR = 1.001;

export class View2D {
  scene: Scene2D;
  activeCam: Camera2D<AtomLikeOptions<Camera2DFields>>;
  containerElem: HTMLElement;

  threeScene: THREE.Scene;
  threeCamera: THREE.OrthographicCamera;
  threeRenderer: THREE.WebGLRenderer;
  css2dRenderer: CSS2DRenderer;
  frameScheduled: boolean = false;
  threeMeshes: Map<ItemId, ThreeSceneObject> = new Map();
  // Each item's objects live under their own group so the active camera's
  // `visibleTags` can hide the whole item at once, independent of the item's
  // own `visible` field.
  itemGroups: Map<ItemId, THREE.Group> = new Map();
  unsubscribeSceneInvalidation: (() => void) | null = null;

  lastSceneSnapshot: SceneSnapshot = { itemSnapshots: new Map() };

  // Cached camera snapshot used to skip redundant Three.js camera updates.
  private _lastCameraSnapshot: ReturnType<
    Camera2D<AtomLikeOptions<Camera2DFields>>["getItemSnapshot"]
  > | null = null;

  // Interaction system
  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  dragState: {
    itemId: ItemId;
    constraint: PointDraggableDir2D;
    startWorldPosition: Vec2;
    lastWorldPosition: Vec2;
  } | null = null;

  panState: {
    lastClientX: number;
    lastClientY: number;
  } | null = null;

  pointerDownInfo: {
    itemId: ItemId | null;
    screenPosition: { x: number; y: number };
    time: number;
  } | null = null;

  hoveredItemId: ItemId | null = null;

  sizer: ReturnType<typeof createResponsiveOrthoSizer>;

  constructor(scene: Scene2D, activeCamId: ItemId, containerElem: HTMLElement) {
    this.scene = scene;
    this.activeCam = scene.getCamera(activeCamId);

    this.containerElem = containerElem;
    this.threeScene = new THREE.Scene();

    // Initial frustum will be set by the sizer once we know the container size.
    this.threeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    const camSnap = this.activeCam.getItemSnapshot();
    this.threeCamera.position.set(camSnap.center.x, camSnap.center.y, 10);
    this.threeCamera.lookAt(camSnap.center.x, camSnap.center.y, 0);
    this.threeCamera.zoom = camSnap.zoom;
    this.threeCamera.updateProjectionMatrix();

    this.threeRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const containerPosition = getComputedStyle(containerElem).position;
    if (containerPosition === "static") {
      containerElem.style.position = "relative";
    }

    this.threeRenderer.domElement.style.position = "absolute";
    this.threeRenderer.domElement.style.inset = "0";
    this.threeRenderer.domElement.style.width = "100%";
    this.threeRenderer.domElement.style.height = "100%";
    this.threeRenderer.domElement.style.display = "block";

    const existingCanvas = containerElem.querySelector("canvas");
    if (existingCanvas) {
      console.warn(
        `[View2D] Container already has a canvas element. This usually means a previous View2D was not disposed properly, which can cause rendering issues like overlapping scenes.\n\n` +
        `To fix this, call view.dispose() in your cleanup function.`
      );
    }

    containerElem.appendChild(this.threeRenderer.domElement);

    this.css2dRenderer = new CSS2DRenderer();
    this.css2dRenderer.domElement.style.position = "absolute";
    this.css2dRenderer.domElement.style.inset = "0";
    this.css2dRenderer.domElement.style.pointerEvents = "none";
    containerElem.appendChild(this.css2dRenderer.domElement);

    this._lastCameraSnapshot = camSnap;

    const canvas = this.threeRenderer.domElement;
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointerleave", this.onPointerLeave);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });

    this.sizer = createResponsiveOrthoSizer({
      container: containerElem,
      renderer: this.threeRenderer,
      camera: this.threeCamera,
      onResize: () => this.requestRender(),
    });

    this.unsubscribeSceneInvalidation = scene.listenForSceneInvalidation(() => {
      this.onSceneChanged();
    });

    this.onSceneChanged();
    this.requestRender();
  }

  changeActiveCam(cameraId: ItemId) {
    this.activeCam = this.scene.getCamera(cameraId);
    this._lastCameraSnapshot = null;
    this.syncCameraToThree();
    this.requestRender();
  }

  // ========== Reconciliation ==========

  onSceneChanged() {
    const newSceneSnapshot = this.scene.getSceneSnapshot();

    const unrenderedItems = new Set(this.lastSceneSnapshot.itemSnapshots.keys());
    for (const [id, item] of newSceneSnapshot.itemSnapshots.entries()) {
      const prev = this.lastSceneSnapshot.itemSnapshots.get(id);
      if (prev) {
        unrenderedItems.delete(id);
        // Redraw only what changed since this view last applied it. Comparing
        // against our own previous snapshot keeps views independent: another
        // view rendering the same item doesn't reset our state.
        if (item.version === prev.version) continue;
        this.updateItem(item);
      } else {
        this.createItem(item);
      }
    }
    for (const id of unrenderedItems) {
      this.removeItem(id);
    }

    this.syncCameraToThree();

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

  _render() {
    this.frameScheduled = false;
    this.sizer.applyIfNeeded();
    const viewport = this.getViewport2D();
    this.layoutViewDependentItems(viewport);
    this.applyCameraVisibility();
    const size = this.threeRenderer.getSize(new THREE.Vector2());
    this.css2dRenderer.setSize(size.x, size.y);
    this.threeRenderer.render(this.threeScene, this.threeCamera);
    this.css2dRenderer.render(this.threeScene, this.threeCamera);
  }

  // ========== Camera Sync ==========

  syncCameraToThree() {
    const snap = this.activeCam.getItemSnapshot();
    const last = this._lastCameraSnapshot;

    if (!last || snap.center.x !== last.center.x || snap.center.y !== last.center.y) {
      this.threeCamera.position.set(snap.center.x, snap.center.y, 10);
      this.threeCamera.lookAt(snap.center.x, snap.center.y, 0);
    }
    if (!last || snap.zoom !== last.zoom) {
      this.threeCamera.zoom = snap.zoom;
      this.threeCamera.updateProjectionMatrix();
    }
    this._lastCameraSnapshot = snap;
  }

  // ========== View-dependent layout ==========

  getViewport2D(): Viewport2D {
    const size = this.threeRenderer.getSize(new THREE.Vector2());
    const widthPx = size.x;
    const heightPx = size.y;
    const zoom = this.threeCamera.zoom;
    const center = vec2(this.threeCamera.position.x, this.threeCamera.position.y);
    const left = center.x + this.threeCamera.left / zoom;
    const right = center.x + this.threeCamera.right / zoom;
    const bottom = center.y + this.threeCamera.bottom / zoom;
    const top = center.y + this.threeCamera.top / zoom;
    const worldWidth = right - left;
    const worldHeight = top - bottom;
    const worldPerPixel = heightPx > 0 ? worldHeight / heightPx : 0;
    const visibleWorldBounds = { left, right, bottom, top };

    return {
      widthPx,
      heightPx,
      center,
      zoom,
      worldPerPixel,
      visibleWorldBounds,
      worldToScreen: (point) => ({
        x: worldWidth !== 0 ? ((point.x - left) / worldWidth) * widthPx : 0,
        y: worldHeight !== 0 ? ((top - point.y) / worldHeight) * heightPx : 0,
      }),
      screenToWorld: (point) =>
        vec2(
          widthPx !== 0 ? left + (point.x / widthPx) * worldWidth : left,
          heightPx !== 0 ? top - (point.y / heightPx) * worldHeight : top
        ),
    };
  }

  layoutViewDependentItems(viewport: Viewport2D): void {
    const ctx: ViewLayoutContext2D = {
      viewport,
      // Replaced with the item's own group on each iteration below.
      threeScene: this.threeScene,
      camera: this.threeCamera,
      renderer: this.threeRenderer,
    };

    for (const [id, obj] of this.threeMeshes.entries()) {
      const item = this.lastSceneSnapshot.itemSnapshots.get(id);
      if (!item || obj.kind !== item.kind) continue;
      const group = this.itemGroups.get(id);
      if (!group) continue;
      ctx.threeScene = group;
      const renderer = getRenderer(item.kind);
      const layout = renderer.layout as
        | ((item: ItemSnapshot, obj: ThreeSceneObject, ctx: ViewLayoutContext2D) => void)
        | undefined;
      layout?.(item, obj, ctx);
    }
  }

  // ========== Camera-scoped visibility ==========

  // Hide whole items the active camera's `visibleTags` filters out. We toggle
  // the per-item group (which culls its WebGL meshes) and each CSS2D label
  // inside it (CSS2DRenderer ignores an ancestor's visibility, so it needs its
  // own flag set). The item's own `visible` field stays untouched on the inner
  // meshes, so the two compose. Runs after layout so freshly built objects are
  // covered too.
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

  // ========== Coord conversions ==========

  // Convert pointer event coords to Three.js NDC, then unproject to a world Vec2.
  screenToWorld(event: PointerEvent | WheelEvent): Vec2 {
    const rect = this.threeRenderer.domElement.getBoundingClientRect();
    const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const v = new THREE.Vector3(ndcX, ndcY, 0).unproject(this.threeCamera);
    return vec2(v.x, v.y);
  }

  // ========== Interaction System ==========

  raycastItem(event: PointerEvent) {
    const rect = this.threeRenderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.threeCamera);

    const intersects = this.raycaster.intersectObjects(this.threeScene.children, true);

    for (const hit of intersects) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (obj.userData.itemId) {
          const itemId = obj.userData.itemId as ItemId;
          const item = this.scene.items.get(itemId);
          if (item && "pointerEvents" in item && item.pointerEvents.get() === "none") break;
          // Can't grab what the active camera doesn't render.
          if (!this.cameraShowsItem(itemId)) break;
          return {
            itemId,
            worldPosition: vec2(hit.point.x, hit.point.y),
          };
        }
        obj = obj.parent;
      }
    }
    return null;
  }

  dispatchEvent<E extends InteractionEventType>(
    eventType: E,
    event: InteractionEvent
  ) {
    const item = this.scene.items.get(event.itemId);
    if (!item) return;

    const customHandler = item.getHandler(eventType);
    if (customHandler) {
      (customHandler as (e: InteractionEvent) => void)(event);
      return;
    }

    if (eventType === "drag" && item.handleDrag) {
      const handleDrag = item.handleDrag as (event: InteractionEvent) => void;
      handleDrag(event);
    } else if (eventType === "click" && item.handleClick) {
      const handleClick = item.handleClick as (event: InteractionEvent) => void;
      handleClick(event);
    } else if (eventType === "hover" && item.handleHover) {
      const handleHover = item.handleHover as (event: InteractionEvent) => void;
      handleHover(event);
    }
  }

  hasHoverListener(itemId: ItemId): boolean {
    const item = this.scene.items.get(itemId);
    if (!item) return false;
    return !!item.getHandler("hover") || typeof item.handleHover === "function";
  }

  getItemDragConstraint(snapshot: ItemSnapshot): PointDraggableDir2D | null {
    if ("draggable" in snapshot) {
      return (snapshot as { draggable: PointDraggableDir2D }).draggable;
    }
    return null;
  }

  updateCursor(): void {
    const canvas = this.threeRenderer.domElement;
    if (this.dragState) {
      canvas.style.cursor = "grabbing";
      return;
    }
    if (this.panState) {
      canvas.style.cursor = "grabbing";
      return;
    }
    if (this.hoveredItemId) {
      const item = this.scene.items.get(this.hoveredItemId);
      const cursor = item?.getCursorState();
      canvas.style.cursor = cursor ?? "default";
      return;
    }
    canvas.style.cursor = "default";
  }

  // ========== Pointer / Wheel Handlers ==========

  onPointerDown = (event: PointerEvent) => {
    const hit = this.raycastItem(event);

    this.pointerDownInfo = {
      itemId: hit?.itemId ?? null,
      screenPosition: { x: event.clientX, y: event.clientY },
      time: Date.now(),
    };

    if (hit) {
      const item = this.scene.items.get(hit.itemId);
      if (item) {
        const snapshot = item.getItemSnapshot();
        const constraint = this.getItemDragConstraint(snapshot);
        if (constraint && constraint !== "none") {
          // Capture the pointer so the drag keeps receiving move/up events even
          // when the cursor passes over overlay DOM elements or leaves the canvas.
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
            screenPosition: { x: event.clientX, y: event.clientY },
            startWorldPosition: hit.worldPosition,
            worldPosition: hit.worldPosition,
            delta: vec2(0, 0),
          });
          this.updateCursor();
          return;
        }
      }
    }

    // Empty space (or non-draggable item): start panning if camera allows it.
    const camSnap = this.activeCam.getItemSnapshot();
    if (camSnap.enablePan) {
      // Capture the pointer so panning continues past the canvas edge and over overlays.
      this.threeRenderer.domElement.setPointerCapture(event.pointerId);
      this.panState = {
        lastClientX: event.clientX,
        lastClientY: event.clientY,
      };
      this.updateCursor();
    }
  };

  onPointerMove = (event: PointerEvent) => {
    if (this.dragState) {
      const item = this.scene.items.get(this.dragState.itemId);
      if (!item) {
        this.dragState = null;
        return;
      }
      const worldPos = this.screenToWorld(event);
      const delta = Vec2.subtract(worldPos, this.dragState.lastWorldPosition);
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

    if (this.panState) {
      // Convert pixel delta to world delta using the current ortho frustum.
      const dxPx = event.clientX - this.panState.lastClientX;
      const dyPx = event.clientY - this.panState.lastClientY;
      this.panState.lastClientX = event.clientX;
      this.panState.lastClientY = event.clientY;

      const worldPerPixel = this.worldPerPixel();
      const dWorldX = -dxPx * worldPerPixel;
      const dWorldY = dyPx * worldPerPixel; // y flipped: screen-y down = world-y down for our convention
      const current = this.activeCam.center.get();
      setBoundAtomIfWritable(this.activeCam.center, vec2(current.x + dWorldX, current.y + dWorldY));
      return;
    }

    // Hover detection
    const hit = this.raycastItem(event);
    const newHoveredId = hit?.itemId ?? null;

    if (newHoveredId !== this.hoveredItemId) {
      if (this.hoveredItemId) {
        const oldItem = this.scene.items.get(this.hoveredItemId);
        if (oldItem && this.hasHoverListener(this.hoveredItemId)) {
          this.dispatchEvent("hover", {
            type: "hover",
            phase: "leave",
            itemId: this.hoveredItemId,
            itemKind: oldItem.kind,
            screenPosition: { x: event.clientX, y: event.clientY },
            worldPosition: vec2(0, 0),
          });
        }
      }
      if (newHoveredId && hit) {
        const newItem = this.scene.items.get(newHoveredId);
        if (newItem && this.hasHoverListener(newHoveredId)) {
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
    } else if (newHoveredId && hit) {
      const currentItem = this.scene.items.get(newHoveredId);
      if (currentItem && this.hasHoverListener(newHoveredId)) {
        this.dispatchEvent("hover", {
          type: "hover",
          phase: "move",
          itemId: newHoveredId,
          itemKind: currentItem.kind,
          screenPosition: { x: event.clientX, y: event.clientY },
          worldPosition: hit.worldPosition,
        });
      }
    }
  };

  onPointerUp = (event: PointerEvent) => {
    if (this.dragState) {
      const item = this.scene.items.get(this.dragState.itemId);
      if (item) {
        const worldPos = this.screenToWorld(event);
        this.dispatchEvent("drag", {
          type: "drag",
          phase: "end",
          itemId: this.dragState.itemId,
          itemKind: item.kind,
          screenPosition: { x: event.clientX, y: event.clientY },
          startWorldPosition: this.dragState.startWorldPosition,
          worldPosition: worldPos,
          delta: Vec2.subtract(worldPos, this.dragState.startWorldPosition),
        });
      }
      this.dragState = null;
      this.updateCursor();
    }

    if (this.panState) {
      this.panState = null;
      this.updateCursor();
    }

    // Click detection: pointerdown + pointerup on the same item with little movement.
    if (this.pointerDownInfo) {
      const dx = event.clientX - this.pointerDownInfo.screenPosition.x;
      const dy = event.clientY - this.pointerDownInfo.screenPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < CLICK_THRESHOLD_PX && this.pointerDownInfo.itemId) {
        const hit = this.raycastItem(event);
        if (hit && hit.itemId === this.pointerDownInfo.itemId) {
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

  onPointerLeave = () => {
    // Only clears idle hover state. An active drag or pan holds pointer capture
    // and runs until pointerup, so the cursor leaving the canvas leaves it intact.
    if (this.dragState || this.panState) return;

    this.hoveredItemId = null;
    this.pointerDownInfo = null;
    this.updateCursor();
  };

  onWheel = (event: WheelEvent) => {
    const camSnap = this.activeCam.getItemSnapshot();
    if (!camSnap.enableZoom) return;

    event.preventDefault();

    // Cursor world position before zoom.
    const cursorBefore = this.screenToWorld(event);

    // Multiplicative zoom: deltaY > 0 is "wheel down" / "zoom out" in browser convention.
    const factor = Math.pow(WHEEL_ZOOM_FACTOR, -event.deltaY);
    const newZoom = Math.max(0.001, camSnap.zoom * factor);
    setBoundAtomIfWritable(this.activeCam.zoom, newZoom);

    // Manually sync the threeCamera so we can compute the post-zoom cursor world
    // position before the next render frame. Without this, cursorAfter would be
    // computed from the stale projection matrix.
    this.threeCamera.zoom = newZoom;
    this.threeCamera.updateProjectionMatrix();

    const cursorAfter = this.screenToWorld(event);

    // Shift center so the cursor's world position is preserved across the zoom.
    const center = this.activeCam.center.get();
    const adjusted = vec2(
      center.x + (cursorBefore.x - cursorAfter.x),
      center.y + (cursorBefore.y - cursorAfter.y)
    );
    setBoundAtomIfWritable(this.activeCam.center, adjusted);
  };

  // Pixels-to-world conversion based on the current threeCamera frustum + zoom.
  worldPerPixel(): number {
    const rect = this.threeRenderer.domElement.getBoundingClientRect();
    const worldHeight = (this.threeCamera.top - this.threeCamera.bottom) / this.threeCamera.zoom;
    return worldHeight / rect.height;
  }

  dispose() {
    this.unsubscribeSceneInvalidation?.();
    this.unsubscribeSceneInvalidation = null;

    for (const id of this.threeMeshes.keys()) {
      this.removeItem(id);
    }

    const canvas = this.threeRenderer.domElement;
    canvas.removeEventListener("pointerdown", this.onPointerDown);
    canvas.removeEventListener("pointermove", this.onPointerMove);
    canvas.removeEventListener("pointerup", this.onPointerUp);
    canvas.removeEventListener("pointerleave", this.onPointerLeave);
    canvas.removeEventListener("wheel", this.onWheel);

    this.dragState = null;
    this.panState = null;
    this.pointerDownInfo = null;
    this.hoveredItemId = null;

    this.sizer.dispose();
    this.threeRenderer.forceContextLoss();
    this.threeRenderer.dispose();

    if (this.threeRenderer.domElement.parentNode === this.containerElem) {
      this.containerElem.removeChild(this.threeRenderer.domElement);
    }

    if (this.css2dRenderer.domElement.parentNode === this.containerElem) {
      this.containerElem.removeChild(this.css2dRenderer.domElement);
    }
  }
}

// Sets the orthographic frustum from container size, preserving the configured
// vertical half-span and following the container aspect ratio.
function createResponsiveOrthoSizer({
  container,
  renderer,
  camera,
  onResize,
}: {
  container: HTMLElement;
  renderer: THREE.WebGLRenderer;
  camera: THREE.OrthographicCamera;
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

  const rect = container.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    pendingWidth = rect.width;
    pendingHeight = rect.height;
  }

  function applyIfNeeded() {
    const currentSize = renderer.getSize(new THREE.Vector2());
    const aspect = pendingWidth / pendingHeight;
    const halfH = BASE_VERTICAL_HALF_SPAN;
    const halfW = halfH * aspect;
    const frustumChanged =
      camera.left !== -halfW ||
      camera.right !== halfW ||
      camera.top !== halfH ||
      camera.bottom !== -halfH;

    if (currentSize.x !== pendingWidth || currentSize.y !== pendingHeight) {
      renderer.setSize(pendingWidth, pendingHeight, false);
    }
    if (frustumChanged) {
      camera.left = -halfW;
      camera.right = halfW;
      camera.top = halfH;
      camera.bottom = -halfH;
      camera.updateProjectionMatrix();
    }
  }

  // Apply once immediately so the first render has a valid frustum.
  if (pendingWidth > 0 && pendingHeight > 0) {
    applyIfNeeded();
  }

  return { applyIfNeeded, dispose: () => ro.disconnect() };
}
