# Version 0.2: Architecture Refactoring

This document details the architectural changes needed before implementing interactivity in v0.3.

---

## 1. View3D Refactor

### Problem

View3D currently handles too many concerns:
- Three.js setup (renderer, scene, camera)
- Orbit controls management
- Resize observation
- Reconciliation (diffing snapshots, item lifecycle)
- Render scheduling

This makes it fragile and hard to extend. Adding interactions would make it worse.

### Solution

Extract into focused modules while keeping View3D as the public facade:

| Module | Responsibility | Key State |
|--------|----------------|-----------|
| `ThreeContext` | WebGLRenderer, THREE.Scene, camera, resize | `threeRenderer`, `threeScene`, `threeCamera` |
| `Reconciler` | Snapshot diffing, create/update/remove | `threeMeshes`, `lastSceneSnapshot` |
| `RenderScheduler` | RAF debouncing, dirty tracking | `frameScheduled` |

### File Structure

```
src/core/
├── view3d.ts              # Public facade, delegates to internals
├── view3d/
│   ├── three-context.ts   # Three.js setup and management
│   ├── reconciler.ts      # Snapshot diffing and item lifecycle
│   └── render-scheduler.ts # Frame scheduling
```

### Migration Notes

- Public API unchanged: `new View3D(scene, cameraId, container)` still works
- Internal refactor only - no breaking changes
- View3D becomes a thin wrapper that coordinates the modules

---

## 2. Two-Way Communication (Renderer → Scene)

### Problem

Data flows one way: Scene → View3D → Three.js

But OrbitControls mutate the Three.js camera directly, bypassing the scene. The Camera3D item doesn't know when the user rotates the view. Future interactions (dragging points) will have the same issue.

### Solution

After each render frame, sync relevant Three.js state back to scene atoms:

```typescript
// In render loop
private syncCameraToScene() {
  // Avoid infinite loops - only sync if Three.js camera actually moved
  const pos = this.threeCamera.position
  const target = this.orbitControls.target

  const currentPos = this.activeCamera.position.get()
  const currentLookAt = this.activeCamera.lookAt.get()

  if (!Vec3.equals(pos, currentPos) || !Vec3.equals(target, currentLookAt)) {
    // Flag to prevent this triggering a re-render
    this.isSyncingFromThree = true
    this.activeCamera.position.set(vec3(pos.x, pos.y, pos.z))
    this.activeCamera.lookAt.set(vec3(target.x, target.y, target.z))
    this.isSyncingFromThree = false
  }
}
```

### Loop Prevention

The invalidation listener should check `isSyncingFromThree` to avoid:
```
camera.position.set() → invalidateScene() → onSceneChanged() → render() → syncCameraToScene() → camera.position.set() → ...
```

### Future Interactions

This pattern extends to draggable points:
```typescript
// After drag ends
point.coords.set(newPosition)  // Uses same reactive flow
```

---

## 3. Item Lifecycle Improvements

### Problem

- No way to remove items from a scene
- Items stay in `scene.items` forever
- Atom subscriptions may leak when items are "abandoned"

### Solution

Add `scene.remove(item)` method:

```typescript
// In Scene3D
remove(item: Item) {
  if (!this.items.has(item.id)) return

  // Cleanup atom subscriptions
  item.removeFromScene()

  // Remove from scene's item map
  this.items.delete(item.id)

  // Trigger reconciliation - next render will remove from Three.js
  this.invalidateScene()
}
```

The `removeFromScene()` method already exists on BaseItem - it unsubscribes all atom listeners. Just need to expose `scene.remove()` and ensure reconciler handles the removal.

### Reconciler Change

In `onSceneChanged()`, items that exist in `lastSceneSnapshot` but not in new snapshot should be removed:

```typescript
// Already implemented, just verify it works with scene.remove()
for (const [id, oldItem] of this.lastSceneSnapshot) {
  if (!newSnapshot.has(id)) {
    this.removeItem(id, oldItem)
  }
}
```

---

## 4. Mesh-to-Item Mapping

### Problem

For interactions (v0.3), we need to map a raycast hit back to the scene item:
- User clicks on screen
- Raycast hits a Three.js mesh
- Need to find which Item that mesh represents

Currently `threeMeshes` maps ItemId → Mesh, but we need the reverse.

### Solution

Store item ID on Three.js object's userData in each renderer:

```typescript
// In point3d-renderer.ts create()
const mesh = new THREE.Mesh(geometry, material)
mesh.userData.itemId = item.id  // Add this line
return mesh

// In line3d-renderer.ts create()
const mesh = new THREE.Mesh(geometry, material)
mesh.userData.itemId = item.id
return mesh

// ... same for all renderers
```

Then raycasting can look up the item:

```typescript
// Future interaction code
const intersects = raycaster.intersectObjects(threeScene.children)
if (intersects.length > 0) {
  const itemId = intersects[0].object.userData.itemId
  const item = scene.items.get(itemId)
  // Now we can interact with the item
}
```

### Files to Modify

- `src/core/renderers/point3d-renderer.ts`
- `src/core/renderers/line3d-renderer.ts`
- `src/core/renderers/parametric-function3d-renderer.ts`
- `src/core/renderers/grid3d-renderer.ts`
- `src/core/renderers/axes3d-renderer.ts`

---

## 5. Performance Improvements

### TODO for Future (Add Code Comments)

These are bigger changes to note for later:

```typescript
// TODO: Geometry reuse - currently recreates TubeGeometry on every update
// Could update curve points directly for position changes
// See: https://threejs.org/docs/#api/en/core/BufferGeometry.setAttribute

// TODO: For parametric curves with changing tEnd, consider using
// BufferGeometry.setDrawRange() instead of recreating geometry

// TODO: For scenes with many points, consider instanced rendering
// See: THREE.InstancedMesh
```

---

## Implementation Order

1. **Mesh-to-item mapping** - Trivial, do first
2. **Item lifecycle** - Add scene.remove() 
3. **View3D refactor** - Extract modules (larger effort, can be incremental)
4. **Two-way communication** - Camera sync (after View3D refactor is cleaner)

---

## Verification

After implementation:

1. Run existing demos - should work identically
2. Add a test that creates and removes items - verify no memory leaks
3. Log `scene.items.size` before and after removing items - should decrease
