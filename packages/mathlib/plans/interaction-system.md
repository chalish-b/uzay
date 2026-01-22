# Interaction System Implementation Plan

## Overview

Add an interaction system to View3D that enables dragging, clicking, and hovering on items. Items declare capabilities (e.g., `draggable: "xy"`) and can have custom event handlers via `item.on(event, handler)` / `item.off(event)`.

## Design Decisions

- **Single handler per event type** — `on()` replaces any existing handler, warns if overwriting
- **Replace semantics** — Custom handlers completely replace default behavior
- **Interaction logic lives in View3D** — No separate Interactor class for now
- **Typed events** — Discriminated union of event types with item-kind-specific data

---

## 1. Event Types

Create `/core/common-types/interaction-events.ts`:

```typescript
import { ItemId, ItemKind } from "./item-registry";
import { Vec3 } from "./vec3";

type Vec2 = { x: number; y: number };

// Base event with common fields
type BaseInteractionEvent<K extends ItemKind = ItemKind> = {
  itemId: ItemId;
  itemKind: K;
  worldPosition: Vec3;    // 3D position where event occurred
  screenPosition: Vec2;   // Pixel coordinates on canvas
};

// Drag event
export type DragEvent<K extends ItemKind = ItemKind> = BaseInteractionEvent<K> & {
  type: "drag";
  phase: "start" | "move" | "end";
  startWorldPosition: Vec3;
  delta: Vec3;  // Movement since last event (for "move") or since start (for "end")
};

// Click event
export type ClickEvent<K extends ItemKind = ItemKind> = BaseInteractionEvent<K> & {
  type: "click";
};

// Hover event
export type HoverEvent<K extends ItemKind = ItemKind> = BaseInteractionEvent<K> & {
  type: "hover";
  phase: "enter" | "move" | "leave";
};

// Union type
export type InteractionEvent<K extends ItemKind = ItemKind> =
  | DragEvent<K>
  | ClickEvent<K>
  | HoverEvent<K>;

// Event type names
export type InteractionEventType = "drag" | "click" | "hover";

// Handler function types
export type DragHandler<K extends ItemKind = ItemKind> = (event: DragEvent<K>) => void;
export type ClickHandler<K extends ItemKind = ItemKind> = (event: ClickEvent<K>) => void;
export type HoverHandler<K extends ItemKind = ItemKind> = (event: HoverEvent<K>) => void;

export type InteractionHandler<K extends ItemKind = ItemKind> = {
  drag: DragHandler<K>;
  click: ClickHandler<K>;
  hover: HoverHandler<K>;
};
```

---

## 2. Item Handler System

Modify `/core/item.ts` to add `on()` and `off()` methods to BaseItem:

```typescript
// Add to BaseItem class
private eventHandlers: Map<InteractionEventType, InteractionHandler[InteractionEventType]> = new Map();

on<E extends InteractionEventType>(
  event: E,
  handler: InteractionHandler<K>[E]
): void {
  if (this.eventHandlers.has(event)) {
    console.warn(`Overwriting existing "${event}" handler on item ${this.id}`);
  }
  this.eventHandlers.set(event, handler);
}

off(event: InteractionEventType): void {
  this.eventHandlers.delete(event);
}

getHandler<E extends InteractionEventType>(event: E): InteractionHandler<K>[E] | undefined {
  return this.eventHandlers.get(event) as InteractionHandler<K>[E] | undefined;
}
```

---

## 3. Default Handlers

Create `/core/default-interaction-handlers.ts`:

```typescript
import { DragEvent, ClickEvent, HoverEvent } from "./common-types/interaction-events";
import { Item } from "./item";
import { Point3D } from "./items/point3d";
import { Line3D } from "./items/line3d";
// ... other items

// Default drag handlers per item kind
export const defaultDragHandlers: Partial<Record<ItemKind, (event: DragEvent, item: Item) => void>> = {
  point3d: (event, item) => {
    const point = item as Point3D<any>;
    const draggable = point.draggable.get();
    if (draggable === "none") return;

    // Apply constraint based on draggable axis
    const newCoords = applyDragConstraint(
      point.coords.get(),
      event.worldPosition,
      draggable
    );
    point.coords.set(newCoords);
  },

  line3d: (event, item) => {
    // Move both endpoints by delta
    const line = item as Line3D<any>;
    const delta = event.delta;
    line.start.set(addVec3(line.start.get(), delta));
    line.end.set(addVec3(line.end.get(), delta));
  },
};

// Helper: apply axis constraint
function applyDragConstraint(
  current: Vec3,
  target: Vec3,
  constraint: PointDraggableDir
): Vec3 {
  switch (constraint) {
    case "x": return { ...current, x: target.x };
    case "y": return { ...current, y: target.y };
    case "z": return { ...current, z: target.z };
    case "xy": return { ...current, x: target.x, y: target.y };
    case "xz": return { ...current, x: target.x, z: target.z };
    case "yz": return { ...current, y: target.y, z: target.z };
    case "xyz": return target;
    default: return current;
  }
}
```

---

## 4. View3D Interaction System

Add to `/core/view3d.ts`:

### 4.1 New Fields

```typescript
// Raycasting
private raycaster = new THREE.Raycaster();
private pointer = new THREE.Vector2();

// Drag state
private dragState: {
  itemId: ItemId;
  constraint: PointDraggableDir;  // Store constraint for screenToWorld
  startWorldPosition: Vec3;
  lastWorldPosition: Vec3;
} | null = null;

// Hover state
private hoveredItemId: ItemId | null = null;
```

**Note:** Instead of maintaining a separate `objectToItemId` map, we store the item ID directly on Three.js objects using `userData`:

```typescript
// When renderer creates a mesh:
mesh.userData.itemId = itemId;

// When raycasting, retrieve it:
const itemId = hit.object.userData.itemId;
```

This is simpler and avoids sync issues — the data lives on the object itself and is disposed with it.

### 4.2 Event Binding (in constructor)

```typescript
const canvas = this.threeRenderer.domElement;
canvas.addEventListener("pointerdown", this.onPointerDown);
canvas.addEventListener("pointermove", this.onPointerMove);
canvas.addEventListener("pointerup", this.onPointerUp);
canvas.addEventListener("pointerleave", this.onPointerLeave);
```

### 4.3 Core Methods

```typescript
// Raycast to find item under pointer
private raycastItem(event: PointerEvent): { itemId: ItemId; worldPosition: Vec3 } | null {
  const rect = this.threeRenderer.domElement.getBoundingClientRect();
  this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  this.raycaster.setFromCamera(this.pointer, this.threeCamera);

  // Raycast against all objects in scene, check for itemId in userData
  const intersects = this.raycaster.intersectObjects(
    this.threeScene.children,
    true  // recursive
  );

  for (const hit of intersects) {
    // Walk up the object hierarchy to find itemId
    let obj: THREE.Object3D | null = hit.object;
    while (obj) {
      if (obj.userData.itemId) {
        return {
          itemId: obj.userData.itemId,
          worldPosition: { x: hit.point.x, y: hit.point.y, z: hit.point.z }
        };
      }
      obj = obj.parent;
    }
  }

  return null;
}

// Dispatch event to item (custom handler or default)
private dispatchEvent<E extends InteractionEventType>(
  eventType: E,
  event: InteractionEvent
): void {
  const item = this.scene.items.get(event.itemId);
  if (!item) return;

  const customHandler = item.getHandler(eventType);
  if (customHandler) {
    customHandler(event);
  } else {
    const defaultHandler = defaultHandlers[eventType]?.[item.kind];
    if (defaultHandler) {
      defaultHandler(event, item);
    }
  }
}
```

### 4.4 Pointer Event Handlers

```typescript
private onPointerDown = (event: PointerEvent): void => {
  const hit = this.raycastItem(event);
  if (!hit) return;

  const item = this.scene.items.get(hit.itemId);
  if (!item) return;

  // Check if item is interactive (has draggable !== "none" or has handler)
  const snapshot = item.getItemSnapshot();
  const constraint = this.getItemDragConstraint(snapshot); // Returns PointDraggableDir or null

  if (constraint && constraint !== "none") {
    // Disable orbit controls during drag
    this.threeOrbitControls.enabled = false;

    this.dragState = {
      itemId: hit.itemId,
      constraint,  // Store for use in screenToWorld
      startWorldPosition: hit.worldPosition,
      lastWorldPosition: hit.worldPosition,
    };

    this.dispatchEvent("drag", {
      type: "drag",
      phase: "start",
      itemId: hit.itemId,
      itemKind: item.kind,
      worldPosition: hit.worldPosition,
      screenPosition: { x: event.clientX, y: event.clientY },
      startWorldPosition: hit.worldPosition,
      delta: { x: 0, y: 0, z: 0 },
    });
  }
};

private onPointerMove = (event: PointerEvent): void => {
  // Handle drag
  if (this.dragState) {
    const worldPos = this.screenToWorld(
      event,
      this.dragState.startWorldPosition,
      this.dragState.constraint  // Pass constraint for correct projection
    );
    const item = this.scene.items.get(this.dragState.itemId);
    if (!item) return;

    const delta = subtractVec3(worldPos, this.dragState.lastWorldPosition);
    this.dragState.lastWorldPosition = worldPos;

    this.dispatchEvent("drag", {
      type: "drag",
      phase: "move",
      itemId: this.dragState.itemId,
      itemKind: item.kind,
      worldPosition: worldPos,
      screenPosition: { x: event.clientX, y: event.clientY },
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
          worldPosition: { x: 0, y: 0, z: 0 }, // Not meaningful for leave
          screenPosition: { x: event.clientX, y: event.clientY },
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
          worldPosition: hit.worldPosition,
          screenPosition: { x: event.clientX, y: event.clientY },
        });
      }
    }

    this.hoveredItemId = newHoveredId;
  }
};

private onPointerUp = (event: PointerEvent): void => {
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
        worldPosition: worldPos,
        screenPosition: { x: event.clientX, y: event.clientY },
        startWorldPosition: this.dragState.startWorldPosition,
        delta: subtractVec3(worldPos, this.dragState.startWorldPosition),
      });
    }

    this.dragState = null;
    this.threeOrbitControls.enabled = true;
  }
};
```

### 4.5 Helper: Screen to World Conversion

The conversion strategy depends on the drag constraint:

- **Unconstrained (xyz):** Intersect with a plane orthogonal to camera at reference depth
- **Plane constraints (xy, xz, yz):** Intersect with the actual constraint plane
- **Axis constraints (x, y, z):** Intersect with a helper plane, then project onto the axis

```typescript
private screenToWorld(
  event: PointerEvent,
  referencePoint: Vec3,
  constraint: PointDraggableDir
): Vec3 {
  const rect = this.threeRenderer.domElement.getBoundingClientRect();
  this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  this.raycaster.setFromCamera(this.pointer, this.threeCamera);
  const ray = this.raycaster.ray;
  const ref = new THREE.Vector3(referencePoint.x, referencePoint.y, referencePoint.z);

  let result: THREE.Vector3;

  switch (constraint) {
    // Plane constraints: intersect with the fixed plane
    case "xy": {
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -referencePoint.z);
      result = new THREE.Vector3();
      ray.intersectPlane(plane, result);
      break;
    }
    case "xz": {
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -referencePoint.y);
      result = new THREE.Vector3();
      ray.intersectPlane(plane, result);
      break;
    }
    case "yz": {
      const plane = new THREE.Plane(new THREE.Vector3(1, 0, 0), -referencePoint.x);
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

  return { x: result.x, y: result.y, z: result.z };
}

// Find the point on an axis line closest to a ray
private closestPointOnAxis(
  ray: THREE.Ray,
  axisOrigin: THREE.Vector3,
  axisDir: THREE.Vector3
): THREE.Vector3 {
  // Math: find closest points between two lines (ray and axis)
  // The axis line is: P = axisOrigin + t * axisDir
  // The ray is: Q = ray.origin + s * ray.direction

  const w0 = new THREE.Vector3().subVectors(axisOrigin, ray.origin);
  const a = axisDir.dot(axisDir);         // always > 0
  const b = axisDir.dot(ray.direction);
  const c = ray.direction.dot(ray.direction);
  const d = axisDir.dot(w0);
  const e = ray.direction.dot(w0);

  const denom = a * c - b * b;

  // t parameter on the axis line for closest point
  const t = (denom !== 0) ? (b * e - c * d) / denom : 0;

  // Return the point on the axis
  return new THREE.Vector3().copy(axisOrigin).addScaledVector(axisDir, t);
}
```

---

## 5. Click Detection

Click = pointerdown + pointerup on same item without significant movement.

```typescript
// Add to drag state tracking
private pointerDownInfo: {
  itemId: ItemId;
  screenPosition: Vec2;
  time: number;
} | null = null;

// In onPointerDown, also store:
this.pointerDownInfo = {
  itemId: hit.itemId,
  screenPosition: { x: event.clientX, y: event.clientY },
  time: Date.now(),
};

// In onPointerUp, check for click:
if (this.pointerDownInfo && !this.dragState) {
  const hit = this.raycastItem(event);
  if (hit && hit.itemId === this.pointerDownInfo.itemId) {
    const dx = event.clientX - this.pointerDownInfo.screenPosition.x;
    const dy = event.clientY - this.pointerDownInfo.screenPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 5) { // Click threshold in pixels
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
```

---

## 6. Files to Modify/Create

| File | Action |
|------|--------|
| `src/core/common-types/interaction-events.ts` | **Create** — Event type definitions |
| `src/core/common-types/index.ts` | **Modify** — Export new types |
| `src/core/item.ts` | **Modify** — Add `on()`, `off()`, `getHandler()` |
| `src/core/default-interaction-handlers.ts` | **Create** — Default handlers per item kind |
| `src/core/view3d.ts` | **Modify** — Add interaction system |
| `src/core/renderers/*.ts` | **Modify** — Set `mesh.userData.itemId` in `create()` |
| `src/core/index.ts` | **Modify** — Export event types for users |

**Renderer change example** (in `point3d.ts` and others):
```typescript
create(item: ItemSnapshot<"point3d">, threeScene: THREE.Scene) {
  // ... existing code ...
  mesh.userData.itemId = item.id;  // Add this line
  // ...
}
```

---

## 7. Implementation Order

1. **Event types** — Create type definitions
2. **Item handler methods** — Add `on()`/`off()` to BaseItem
3. **Default handlers** — Create default behaviors for Point3D
4. **View3D raycasting** — Add raycast infrastructure and object registry
5. **View3D pointer events** — Bind events and implement handlers
6. **Click detection** — Add click logic on top of pointer events
7. **Hover detection** — Add hover enter/leave/move tracking
8. **Cleanup in dispose()** — Remove event listeners, clear state

---

## 8. Verification

1. **Manual testing with demo**:
   - Create a Point3D with `draggable: "xy"`
   - Verify dragging moves the point
   - Add custom handler with `point.on("drag", ...)`, verify it replaces default
   - Test `point.off("drag")` reverts to default behavior
   - Test click and hover events

2. **Edge cases to test**:
   - Drag outside canvas bounds (pointerleave)
   - Multiple items overlapping (should pick front-most)
   - Items with `draggable: "none"` should not be draggable
   - OrbitControls should be disabled during drag, re-enabled after

---

## 9. Future Considerations (Out of Scope)

- Touch support (pointer events should handle this, but may need testing)
- Keyboard modifiers (shift-drag for constrained movement)
- Cursor changes on hover
- Z-ordering/priority for overlapping items
