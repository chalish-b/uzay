# Fix: Separate Click vs Drag Behavior

## Problem

Currently, drag starts immediately on `pointerdown` if an item is draggable. This means a quick tap on a draggable item fires: `drag:start` → `drag:end` → `click`.

This is not ideal - a gesture should be either a click OR a drag, never both.

## Solution: Distance-threshold Delayed Drag (Option A)

Delay `drag:start` until the user actually moves beyond a threshold.

### New Flow

```
pointerdown  → store pointer info, but DON'T fire drag:start yet
pointermove  → if moved > 5px for the first time, NOW fire drag:start
pointerup    → if was dragging: fire drag:end (no click)
             → if never started dragging: fire click
```

### Implementation Changes

**1. Add new state to track "pending drag":**

```typescript
// Replace immediate dragState with pending drag info
pendingDrag: {
  itemId: ItemId;
  constraint: PointDraggableDir;
  startScreenPosition: { x: number; y: number };
  startWorldPosition: Vec3;
} | null = null;

// dragState only gets set once movement threshold is exceeded
dragState: { ... } | null = null;
```

**2. Update `onPointerDown`:**

```typescript
onPointerDown = (event: PointerEvent) => {
  const hit = this.raycastItem(event);
  if (!hit) return;

  const item = this.scene.items.get(hit.itemId);
  if (!item) return;

  // Always store pointer info for click detection
  this.pointerDownInfo = {
    itemId: hit.itemId,
    screenPosition: { x: event.clientX, y: event.clientY },
    time: Date.now(),
  };

  // If draggable, store pending drag (but don't start yet)
  const snapshot = item.getItemSnapshot();
  const constraint = this.getItemDragConstraint(snapshot);

  if (constraint && constraint !== "none") {
    this.pendingDrag = {
      itemId: hit.itemId,
      constraint,
      startScreenPosition: { x: event.clientX, y: event.clientY },
      startWorldPosition: hit.worldPosition,
    };
    // DON'T disable orbit controls yet
    // DON'T dispatch drag:start yet
  }
};
```

**3. Update `onPointerMove`:**

```typescript
onPointerMove = (event: PointerEvent) => {
  // Check if we should START dragging (pending → active)
  if (this.pendingDrag && !this.dragState) {
    const dx = event.clientX - this.pendingDrag.startScreenPosition.x;
    const dy = event.clientY - this.pendingDrag.startScreenPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 5) {
      // Movement threshold exceeded - NOW start the drag
      this.threeOrbitControls.enabled = false;

      this.dragState = {
        itemId: this.pendingDrag.itemId,
        constraint: this.pendingDrag.constraint,
        startWorldPosition: this.pendingDrag.startWorldPosition,
        lastWorldPosition: this.pendingDrag.startWorldPosition,
      };

      const item = this.scene.items.get(this.dragState.itemId);
      if (item) {
        this.dispatchEvent("drag", {
          type: "drag",
          phase: "start",
          itemId: this.dragState.itemId,
          itemKind: item.kind,
          worldPosition: this.dragState.startWorldPosition,
          screenPosition: this.pendingDrag.startScreenPosition,
          startWorldPosition: this.dragState.startWorldPosition,
          delta: vec3(0, 0, 0),
        });
      }

      this.pendingDrag = null;
      this.updateCursor();
    }
  }

  // Handle active drag (existing logic)
  if (this.dragState) {
    // ... existing drag move logic ...
  }

  // Handle hover (only if not dragging or pending drag)
  if (!this.dragState && !this.pendingDrag) {
    // ... existing hover logic ...
  }
};
```

**4. Update `onPointerUp`:**

```typescript
onPointerUp = (event: PointerEvent) => {
  const wasDragging = this.dragState !== null;

  // End active drag
  if (this.dragState) {
    // ... existing drag end logic ...
    this.dragState = null;
    this.threeOrbitControls.enabled = true;
    this.updateCursor();
  }

  // Clear pending drag (never started)
  this.pendingDrag = null;

  // Fire click only if we weren't dragging
  if (this.pointerDownInfo && !wasDragging) {
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

  this.pointerDownInfo = null;
};
```

**5. Update `onPointerLeave`:**

```typescript
onPointerLeave = (_event: PointerEvent) => {
  // Clear all interaction state
  this.dragState = null;
  this.pendingDrag = null;
  this.hoveredItemId = null;
  this.pointerDownInfo = null;
  this.threeOrbitControls.enabled = true;
  this.updateCursor();
};
```

### Additional Cleanup

- Remove unused `time` from `pointerDownInfo` if we're not using time-based thresholds
- Or keep it for potential future "long press" detection

### Result

- Quick tap on draggable item → only `click` fires
- Press and move on draggable item → only `drag:start`, `drag:move`, `drag:end` fire
- A gesture is always either click OR drag, never both
