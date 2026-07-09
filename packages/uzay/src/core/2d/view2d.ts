import type { Camera2D, Camera2DFields } from "./items/camera2d";
import type { Scene2D, SceneSnapshot } from "./scene2d";
import { Vec2, vec2 } from "../shared/types/vec2";
import { cameraShowsTags } from "../shared/types/tags";
import type { ItemId, ItemKind, ItemSnapshot } from "./types/item-registry";
import {
  setBoundAtomIfWritable,
  type AtomLikeOptions,
} from "../shared/atom-wrapper";
import type {
  InteractionEvent,
  InteractionEventType,
} from "./types/interaction-events";
import type { PointDraggableDir2D } from "./types/axes";
import type { Viewport2D } from "./types/view-context";
import { computeViewport2D } from "./viewport";
import type {
  AnyBackendSurface2D,
  AnyViewBackend2D,
  BackendObjectMap,
  ItemRenderer2D,
  Renderer2DKind,
} from "./backend";
import { threeBackend } from "./backends/three";
import { svgBackend } from "./backends/svg";

const CLICK_THRESHOLD_PX = 5;
const WHEEL_ZOOM_FACTOR = 1.001;

export type View2DOptions = {
  // Which render backend draws the scene. Defaults to "threejs".
  renderer?: Renderer2DKind;
};

// The backends the string option resolves to. Types erase at this boundary
// (see backend.ts); the view keeps kind/container pairs consistent at runtime.
const backends: Record<Renderer2DKind, AnyViewBackend2D> = {
  threejs: threeBackend as AnyViewBackend2D,
  svg: svgBackend as AnyViewBackend2D,
};

function resolveBackend(kind: Renderer2DKind): AnyViewBackend2D {
  const backend = backends[kind];
  if (!backend) {
    throw new Error(`[View2D] Unknown renderer backend: "${kind}"`);
  }
  return backend;
}

export class View2D {
  scene: Scene2D;
  activeCam: Camera2D<AtomLikeOptions<Camera2DFields>>;
  containerElem: HTMLElement;

  surface: AnyBackendSurface2D;
  frameScheduled: boolean = false;
  objects: Map<ItemId, BackendObjectMap[ItemKind]> = new Map();
  // Each item's objects live under their own container so the active camera's
  // `visibleTags` can hide the whole item at once, independent of the item's
  // own `visible` field.
  containers: Map<ItemId, unknown> = new Map();
  unsubscribeSceneInvalidation: (() => void) | null = null;

  lastSceneSnapshot: SceneSnapshot = { itemSnapshots: new Map() };

  dragState: {
    pointerId: number;
    itemId: ItemId;
    constraint: PointDraggableDir2D;
    startWorldPosition: Vec2;
    lastWorldPosition: Vec2;
  } | null = null;

  panState: {
    pointerId: number;
    lastClientX: number;
    lastClientY: number;
  } | null = null;

  // Two-finger gesture: zoom by the change in finger distance and pan by the
  // movement of their midpoint, both centered on that midpoint.
  pinchState: {
    lastDistance: number;
    lastMidX: number;
    lastMidY: number;
  } | null = null;

  // Live pointer positions in client coords, keyed by pointerId. Drives the
  // pinch math and the two-finger to one-finger pan handoff.
  activePointers: Map<number, { x: number; y: number }> = new Map();

  pointerDownInfo: {
    itemId: ItemId | null;
    screenPosition: { x: number; y: number };
    time: number;
  } | null = null;

  hoveredItemId: ItemId | null = null;

  // Container size in CSS pixels, tracked by the view's ResizeObserver. The
  // single size source for both the viewport math and renderer sizing.
  sizePx = { width: 0, height: 0 };
  private resizeObserver: ResizeObserver;

  // The canvas/svg union carries identical pointer, wheel, capture, and style
  // surfaces, but TypeScript drops the typed addEventListener overloads on
  // the union; narrow once for listener wiring.
  private get eventTarget(): HTMLElement {
    return this.surface.eventTarget as HTMLElement;
  }

  constructor(
    scene: Scene2D,
    activeCamId: ItemId,
    containerElem: HTMLElement,
    options: View2DOptions = {}
  ) {
    this.scene = scene;
    this.activeCam = scene.getCamera(activeCamId);

    this.containerElem = containerElem;

    const containerPosition = getComputedStyle(containerElem).position;
    if (containerPosition === "static") {
      containerElem.style.position = "relative";
    }

    this.surface = resolveBackend(options.renderer ?? "threejs").mount(
      containerElem
    );

    const target = this.eventTarget;
    // Hand all touch gestures to our pointer handlers. Without this the browser
    // treats finger drags as page scroll/zoom and cancels the pointer mid-gesture,
    // breaking pan and point dragging on touchscreens.
    target.style.touchAction = "none";
    target.addEventListener("pointerdown", this.onPointerDown);
    target.addEventListener("pointermove", this.onPointerMove);
    target.addEventListener("pointerup", this.onPointerUp);
    target.addEventListener("pointercancel", this.onPointerCancel);
    target.addEventListener("pointerleave", this.onPointerLeave);
    target.addEventListener("wheel", this.onWheel, { passive: false });

    this.resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        this.sizePx = { width, height };
        this.requestRender();
      }
    });
    this.resizeObserver.observe(containerElem);

    const rect = containerElem.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.sizePx = { width: rect.width, height: rect.height };
    }

    this.unsubscribeSceneInvalidation = scene.listenForSceneInvalidation(() => {
      this.onSceneChanged();
    });

    this.onSceneChanged();
    this.requestRender();
  }

  changeActiveCam(cameraId: ItemId) {
    this.activeCam = this.scene.getCamera(cameraId);
    this.requestRender();
  }

  // The registry lookup crosses the erased-type boundary: the runtime pairing
  // of snapshot, object, and container is kept consistent by the maps above.
  private getRendererFor(
    kind: ItemKind
  ): ItemRenderer2D<ItemKind, BackendObjectMap, unknown> {
    return this.surface.renderers[kind] as ItemRenderer2D<
      ItemKind,
      BackendObjectMap,
      unknown
    >;
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

    this.lastSceneSnapshot = newSceneSnapshot;
    this.requestRender();
    this.scene.renderComplete();
  }

  createItem(item: ItemSnapshot) {
    const renderer = this.getRendererFor(item.kind);
    const container = this.surface.createItemContainer(item.id, item.kind);
    const obj = renderer.create(item, container);
    this.objects.set(item.id, obj);
    this.containers.set(item.id, container);
  }

  updateItem(item: ItemSnapshot) {
    const obj = this.objects.get(item.id);
    const container = this.containers.get(item.id);
    if (!obj || container === undefined) return;
    if (obj.kind !== item.kind) return;
    const renderer = this.getRendererFor(item.kind);
    renderer.update(item, obj, container);
  }

  removeItem(id: ItemId) {
    const obj = this.objects.get(id);
    const container = this.containers.get(id);
    if (!obj || container === undefined) return;
    const renderer = this.getRendererFor(obj.kind);
    if (renderer.dispose) {
      renderer.dispose(obj, container);
    }
    this.surface.removeItemContainer(id, container);
    this.objects.delete(id);
    this.containers.delete(id);
  }

  requestRender() {
    if (!this.frameScheduled) {
      this.frameScheduled = true;
      requestAnimationFrame(() => this._render());
    }
  }

  _render() {
    this.frameScheduled = false;
    if (this.sizePx.width > 0 && this.sizePx.height > 0) {
      this.surface.resize(this.sizePx.width, this.sizePx.height);
    }
    const viewport = this.getViewport2D();
    this.surface.syncCamera(viewport);
    this.layoutViewDependentItems(viewport);
    this.applyCameraVisibility();
    this.surface.present();
  }

  // ========== View-dependent layout ==========

  getViewport2D(): Viewport2D {
    return computeViewport2D({
      widthPx: this.sizePx.width,
      heightPx: this.sizePx.height,
      center: this.activeCam.center.get(),
      zoom: this.activeCam.zoom.get(),
    });
  }

  layoutViewDependentItems(viewport: Viewport2D): void {
    for (const [id, obj] of this.objects.entries()) {
      const item = this.lastSceneSnapshot.itemSnapshots.get(id);
      if (!item || obj.kind !== item.kind) continue;
      const container = this.containers.get(id);
      if (container === undefined) continue;
      const renderer = this.getRendererFor(item.kind);
      renderer.layout?.(item, obj, { viewport, container });
    }
  }

  // ========== Camera-scoped visibility ==========

  // Hide whole items the active camera's `visibleTags` filters out. The
  // item's own `visible` field stays untouched on the inner objects, so the
  // two compose. Runs after layout so freshly built objects are covered too.
  applyCameraVisibility(): void {
    const visibleTags = this.activeCam.visibleTags.get();
    for (const [id, container] of this.containers.entries()) {
      const item = this.lastSceneSnapshot.itemSnapshots.get(id);
      const tags = item && "tags" in item ? item.tags : [];
      this.surface.setItemVisible(container, cameraShowsTags(visibleTags, tags));
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

  // Convert client coords to a world Vec2 via the pure viewport math.
  screenToWorld(event: { clientX: number; clientY: number }): Vec2 {
    const rect = this.containerElem.getBoundingClientRect();
    return this.getViewport2D().screenToWorld({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }

  // ========== Interaction System ==========

  // Blocked items don't take hits but don't occlude items beneath them either,
  // so the filter runs per candidate inside the backend's hit-test.
  private isHittable = (itemId: ItemId): boolean => {
    const item = this.scene.items.get(itemId);
    if (item && "pointerEvents" in item && item.pointerEvents.get() === "none") {
      return false;
    }
    // Can't grab what the active camera doesn't render.
    return this.cameraShowsItem(itemId);
  };

  hitItem(event: PointerEvent): { itemId: ItemId; worldPosition: Vec2 } | null {
    const itemId = this.surface.hitTest(event, this.isHittable);
    if (!itemId) return null;
    return { itemId, worldPosition: this.screenToWorld(event) };
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
    const target = this.eventTarget;
    if (this.dragState || this.panState || this.pinchState) {
      target.style.cursor = "grabbing";
      return;
    }
    if (this.hoveredItemId) {
      const item = this.scene.items.get(this.hoveredItemId);
      const cursor = item?.getCursorState();
      target.style.cursor = cursor ?? "default";
      return;
    }
    target.style.cursor = "default";
  }

  // ========== Pointer / Wheel Handlers ==========

  onPointerDown = (event: PointerEvent) => {
    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    // Second finger arrives: start a two-finger zoom + pan, unless a point drag
    // is already underway. A drag owns the gesture, so extra fingers are ignored.
    if (this.activePointers.size === 2 && !this.dragState) {
      this.beginPinch();
      return;
    }
    // Already in a multi-finger gesture (or dragging an item): ignore further pointers.
    if (this.activePointers.size >= 2) return;

    const hit = this.hitItem(event);

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
          this.eventTarget.setPointerCapture(event.pointerId);
          this.dragState = {
            pointerId: event.pointerId,
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
      this.eventTarget.setPointerCapture(event.pointerId);
      this.panState = {
        pointerId: event.pointerId,
        lastClientX: event.clientX,
        lastClientY: event.clientY,
      };
      this.updateCursor();
    }
  };

  onPointerMove = (event: PointerEvent) => {
    if (this.activePointers.has(event.pointerId)) {
      this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    if (this.pinchState) {
      this.updatePinch();
      return;
    }

    if (this.dragState) {
      // Only the finger that started the drag drives it; ignore the rest.
      if (event.pointerId !== this.dragState.pointerId) return;
      const item = this.scene.items.get(this.dragState.itemId);
      if (!item) {
        this.dragState = null;
        return;
      }
      const worldPos = this.screenToWorld(event);
      const delta = worldPos.sub(this.dragState.lastWorldPosition);
      this.dragState.lastWorldPosition = worldPos;

      this.dispatchEvent("drag", {
        type: "drag",
        phase: "move",
        itemId: this.dragState.itemId,
        itemKind: item.kind,
        screenPosition: vec2(event.clientX, event.clientY),
        worldPosition: worldPos,
        startWorldPosition: this.dragState.startWorldPosition,
        delta,
      });
      return;
    }

    if (this.panState) {
      if (event.pointerId !== this.panState.pointerId) return;
      const dxPx = event.clientX - this.panState.lastClientX;
      const dyPx = event.clientY - this.panState.lastClientY;
      this.panState.lastClientX = event.clientX;
      this.panState.lastClientY = event.clientY;
      this.panByPixels(dxPx, dyPx);
      return;
    }

    // Hover detection
    const hit = this.hitItem(event);
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
            screenPosition: vec2(event.clientX, event.clientY),
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
            screenPosition: vec2(event.clientX, event.clientY),
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
          screenPosition: vec2(event.clientX, event.clientY),
          worldPosition: hit.worldPosition,
        });
      }
    }
  };

  onPointerUp = (event: PointerEvent) => {
    this.activePointers.delete(event.pointerId);

    if (this.pinchState) {
      // A pinch is never a click, and the remaining fingers settle the gesture.
      this.settlePinchAfterPointerLoss();
      this.pointerDownInfo = null;
      return;
    }

    if (this.dragState && event.pointerId === this.dragState.pointerId) {
      const item = this.scene.items.get(this.dragState.itemId);
      if (item) {
        const worldPos = this.screenToWorld(event);
        this.dispatchEvent("drag", {
          type: "drag",
          phase: "end",
          itemId: this.dragState.itemId,
          itemKind: item.kind,
          screenPosition: vec2(event.clientX, event.clientY),
          startWorldPosition: this.dragState.startWorldPosition,
          worldPosition: worldPos,
          delta: worldPos.sub(this.dragState.startWorldPosition),
        });
      }
      this.dragState = null;
      this.updateCursor();
    }

    if (this.panState && event.pointerId === this.panState.pointerId) {
      this.panState = null;
      this.updateCursor();
    }

    // Click detection: pointerdown + pointerup on the same item with little movement.
    if (this.pointerDownInfo) {
      const dx = event.clientX - this.pointerDownInfo.screenPosition.x;
      const dy = event.clientY - this.pointerDownInfo.screenPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < CLICK_THRESHOLD_PX && this.pointerDownInfo.itemId) {
        const hit = this.hitItem(event);
        if (hit && hit.itemId === this.pointerDownInfo.itemId) {
          const item = this.scene.items.get(hit.itemId);
          if (item) {
            this.dispatchEvent("click", {
              type: "click",
              itemId: hit.itemId,
              itemKind: item.kind,
              worldPosition: hit.worldPosition,
              screenPosition: vec2(event.clientX, event.clientY),
            });
          }
        }
      }
    }
    this.pointerDownInfo = null;
  };

  onPointerCancel = (event: PointerEvent) => {
    // The browser took the pointer away mid-gesture (e.g. a system touch
    // gesture). Finalize an active drag at its last position and settle pan/pinch
    // so nothing is left dangling. No click is fired for a cancelled pointer.
    this.activePointers.delete(event.pointerId);

    if (this.pinchState) {
      this.settlePinchAfterPointerLoss();
      this.pointerDownInfo = null;
      return;
    }

    if (this.dragState && event.pointerId === this.dragState.pointerId) {
      const item = this.scene.items.get(this.dragState.itemId);
      if (item) {
        this.dispatchEvent("drag", {
          type: "drag",
          phase: "end",
          itemId: this.dragState.itemId,
          itemKind: item.kind,
          screenPosition: vec2(event.clientX, event.clientY),
          startWorldPosition: this.dragState.startWorldPosition,
          worldPosition: this.dragState.lastWorldPosition,
          delta: this.dragState.lastWorldPosition.sub(
            this.dragState.startWorldPosition
          ),
        });
      }
      this.dragState = null;
    }
    if (this.panState && event.pointerId === this.panState.pointerId) {
      this.panState = null;
    }
    this.pointerDownInfo = null;
    this.updateCursor();
  };

  onPointerLeave = () => {
    // Only clears idle hover state. An active drag, pan, or pinch holds pointer
    // capture and runs until pointerup, so the cursor leaving the canvas leaves
    // it intact.
    if (this.dragState || this.panState || this.pinchState) return;

    this.hoveredItemId = null;
    this.pointerDownInfo = null;
    this.updateCursor();
  };

  onWheel = (event: WheelEvent) => {
    const camSnap = this.activeCam.getItemSnapshot();
    if (!camSnap.enableZoom) return;

    event.preventDefault();

    // Multiplicative zoom: deltaY > 0 is "wheel down" / "zoom out" in browser convention.
    const factor = Math.pow(WHEEL_ZOOM_FACTOR, -event.deltaY);
    this.zoomAroundScreenPoint(event.clientX, event.clientY, factor);
  };

  // Pixels-to-world conversion for the current viewport.
  worldPerPixel(): number {
    return this.getViewport2D().worldPerPixel;
  }

  // Pan the camera by a pixel delta, converting to world units via the current
  // frustum + zoom. screen-x right shifts content right; screen-y down shifts
  // content down.
  panByPixels(dxPx: number, dyPx: number) {
    const worldPerPixel = this.worldPerPixel();
    const current = this.activeCam.center.get();
    setBoundAtomIfWritable(
      this.activeCam.center,
      vec2(current.x - dxPx * worldPerPixel, current.y + dyPx * worldPerPixel)
    );
  }

  // Zoom by `factor` while keeping the world point under the given client coords
  // fixed on screen. Shared by wheel zoom and two-finger pinch.
  zoomAroundScreenPoint(clientX: number, clientY: number, factor: number) {
    const point = { clientX, clientY };
    const before = this.screenToWorld(point);

    const newZoom = Math.max(0.001, this.activeCam.zoom.get() * factor);
    setBoundAtomIfWritable(this.activeCam.zoom, newZoom);

    // screenToWorld reads the camera atoms, so this conversion already sees
    // the new zoom.
    const after = this.screenToWorld(point);

    const center = this.activeCam.center.get();
    setBoundAtomIfWritable(
      this.activeCam.center,
      vec2(center.x + (before.x - after.x), center.y + (before.y - after.y))
    );
  }

  // ========== Two-finger pinch ==========

  // Begin a pinch from the two active pointers. A two-finger gesture supersedes
  // single-finger pan and can never resolve to a click.
  beginPinch() {
    const camSnap = this.activeCam.getItemSnapshot();
    if (!camSnap.enablePan && !camSnap.enableZoom) return;
    if (this.activePointers.size < 2) return;

    // Capture both fingers so the gesture survives one straying over an overlay.
    for (const id of this.activePointers.keys()) {
      this.eventTarget.setPointerCapture(id);
    }

    this.panState = null;
    this.pointerDownInfo = null;
    this.seedPinch();
    this.updateCursor();
  }

  // (Re)seed the pinch reference distance + midpoint from the first two active
  // pointers. Called on start and whenever the finger set changes mid-gesture.
  seedPinch() {
    const pts = [...this.activePointers.values()];
    if (pts.length < 2) return;
    const [a, b] = pts;
    this.pinchState = {
      lastDistance: Math.hypot(a.x - b.x, a.y - b.y),
      lastMidX: (a.x + b.x) / 2,
      lastMidY: (a.y + b.y) / 2,
    };
  }

  updatePinch() {
    if (!this.pinchState) return;
    const pts = [...this.activePointers.values()];
    if (pts.length < 2) return;
    const [a, b] = pts;

    const camSnap = this.activeCam.getItemSnapshot();
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;

    // Zoom by how much the fingers spread or pinched, holding the midpoint fixed.
    if (camSnap.enableZoom && this.pinchState.lastDistance > 0 && distance > 0) {
      this.zoomAroundScreenPoint(midX, midY, distance / this.pinchState.lastDistance);
    }

    // Pan by how far the midpoint moved.
    if (camSnap.enablePan) {
      this.panByPixels(midX - this.pinchState.lastMidX, midY - this.pinchState.lastMidY);
    }

    this.pinchState.lastDistance = distance;
    this.pinchState.lastMidX = midX;
    this.pinchState.lastMidY = midY;
  }

  // A pinch pointer went up or was cancelled. Continue with the remaining fingers
  // if two+ are left, hand back to single-finger pan if exactly one remains, or
  // end the gesture.
  settlePinchAfterPointerLoss() {
    if (this.activePointers.size >= 2) {
      this.seedPinch();
      return;
    }
    this.pinchState = null;
    if (this.activePointers.size === 1 && this.activeCam.getItemSnapshot().enablePan) {
      const [[id, pos]] = this.activePointers.entries();
      this.panState = { pointerId: id, lastClientX: pos.x, lastClientY: pos.y };
    }
    this.updateCursor();
  }

  dispose() {
    this.unsubscribeSceneInvalidation?.();
    this.unsubscribeSceneInvalidation = null;

    for (const id of [...this.objects.keys()]) {
      this.removeItem(id);
    }

    const target = this.eventTarget;
    target.removeEventListener("pointerdown", this.onPointerDown);
    target.removeEventListener("pointermove", this.onPointerMove);
    target.removeEventListener("pointerup", this.onPointerUp);
    target.removeEventListener("pointercancel", this.onPointerCancel);
    target.removeEventListener("pointerleave", this.onPointerLeave);
    target.removeEventListener("wheel", this.onWheel);

    this.dragState = null;
    this.panState = null;
    this.pinchState = null;
    this.activePointers.clear();
    this.pointerDownInfo = null;
    this.hoveredItemId = null;

    this.resizeObserver.disconnect();
    this.surface.dispose();
  }
}
