# Camera-scoped item visibility (design handoff)

Status: design agreed, not implemented. This captures a design discussion so it can be picked up fresh in this repo.

## Why

We want linked multi-panel demos: several stacked plots that share reactive state (drag a handle in one panel and the others react), where each panel frames its own content with its own camera. A representative shape is two stacked panels: the reader drags a value in the top panel, and the bottom panel's contents (a moving point, a derived curve, a readout) react to that same value, with each panel using its own camera and framing. The same need shows up in 3D (linked 3D views of one construction), so the feature must cover both 2D and 3D.

Today that is awkward, for two reasons:

1. Each `Scene2D` creates its own Jotai store (`scene2d.ts`: `this.store = createStore()`), and a `BoundAtom`'s get/set/sub close over that store (`atom-wrapper.ts`). The same atom read through two stores holds two independent values, so two scenes cannot share reactive state. A derived atom in scene B that reads an atom from scene A sees B's own copy, which never updates.
2. A `Scene2DView` always renders the whole scene (no item filtering). So "multiple cameras in one scene" works, but you cannot show different subsets of one scene in different panels.

Consumers work around this today with two scenes plus a value bridge that copies the shared value from one scene into the other on every change. That fights the atom system and routes cross-canvas sync through React. The goal of this feature is to remove the need for it.

## Decision

Add **camera-scoped item visibility**, modeled on three.js layers. One scene, one store, multiple cameras, multiple views. Each camera declares which item groups it renders; a view renders the scene through its camera, so each panel naturally shows only its group. Reactive state is shared for free because there is a single store.

This applies symmetrically to 2D and 3D: `Scene2D`/`Scene3D`, `View2D`/`View3D`, `camera2d`/`camera3d`. The mechanism is identical on both sides, and both must ship together.

Camera-scoped was chosen over view-scoped because:

- A `camera2d` is an item in the scene, so its visible set lives in the reactive model (an atom). You can animate a reveal, swap cameras to flip which group shows, or drive visibility from the same atom graph as everything else.
- The view stays a dumb renderer ("render this scene through this camera into this DOM node"). No filtering concept leaks into the React/DOM boundary.
- It maps directly onto three.js's native mechanism (see below).

View-scoped would only be simpler in one niche case: the same camera (identical framing) feeding two panels with different items. That is not worth optimizing for.

## How it maps to three.js

three.js already has this. `Object3D.layers` and `Camera.layers` are 32-bit masks, and `WebGLRenderer` draws an object only if `object.layers.test(camera.layers)`. So "items belong to groups, a camera sees certain groups" is the native model. uzay item `tags` map to object layers; a camera's "visible tags" map to camera layers; the renderer culls automatically.

What makes this clean in the current codebase: each view (`View2D` and `View3D`) builds and owns its own three.js object set (in `view2d.ts` this is the `threeMeshes` map). Two views are two independent object graphs, so per-view culling by the active camera's tag set has no cross-talk. If we cull in JS instead of three.js layers, each view just toggles `object.visible` on its own objects.

## What already exists

- Every renderable item already declares `tags: string[]` (`ItemTags` in `core/shared/types/tags.ts`), currently unused by the renderer. This holds on both sides: 2D items (point2d, line2d, function2d, parametric-function2d, region2d, overlay2d, axes2d, grid2d, vector2d) and 3D items (point3d, line3d, vector3d, surface3d, plane3d, sphere3d, grid3d, axes3d, parametric-function3d, overlay3d).
- Neither camera has a visibility field yet. `camera2d` (`core/2d/items/camera2d.ts`) has center, zoom, enablePan, enableZoom; `camera3d` (`core/3d/items/camera3d.ts`) has position, lookAt, projection, and so on.
- Multiple cameras per scene already work. Multiple views of one scene is listed but untried (TODO.md, "Camera improvements").

## Proposed API sketch (to refine during implementation)

- Add a visibility field to `camera2d`, and the same field to `camera3d`, for example `show?: string[]` (the tags this camera renders), or a predicate. Unset means "render everything", which keeps every existing scene and demo working unchanged.
- Items keep their `tags`. An item is drawn by a camera if its tags intersect the camera's `show` set, or if the camera has no filter.
- `Scene2DView` and `Scene3DView` keep their current shape; they already take a `camera`. The camera now also decides visibility, so no new view prop is needed.

Usage would become roughly: one `scene`, `cameraTop = scene.create("camera2d", { ..., show: ["top"] })`, `cameraBottom = scene.create("camera2d", { ..., show: ["bottom"] })`, items tagged `["top"]` or `["bottom"]`, and two `<Scene2DView scene={scene} camera={cameraTop | cameraBottom} />`. No bridge, because the dragged value is a single scene atom that both panels' items read. The 3D form is identical with `camera3d` and `Scene3DView`.

## Open decisions

- **Tag cap.** Literal three.js layers cap at 32 groups and need a tag-to-bit registry. Matching in JS (`mesh.visible = cameraShows(item.tags)`) lifts the cap at the cost of manual culling. Lean toward JS string-matching unless profiling says otherwise.
- **Untagged items under a filtering camera.** Decide whether an item with no tags is shown by a camera that has a `show` filter. Likely hidden, or treat empty tags as a default group that filtering cameras opt into.
- **Hit-testing and interaction.** Dragging must respect the filter: you should not be able to grab an item the active camera cannot see. This applies to both 2D and 3D picking. Per-view culling already scopes the objects; make sure the interaction layer honors the same rule.

## Acceptance test

Build a linked two-panel example in `packages/playground/src/demos/demo1.tsx` (this repo's convention for exercising a new feature): one scene, two cameras with different `show` filters and framing, two views, and a single shared scene atom that drives items in both panels, with no value bridge. Dragging a handle in one panel updates the other through that shared atom alone. Cover both a 2D case (two `camera2d` plus `Scene2DView`) and a 3D case (two `camera3d` plus `Scene3DView`), since the feature must work on both.

## Source pointers

- `packages/uzay/src/core/2d/scene2d.ts` and `core/3d/scene3d.ts`: per-scene store, invalidate listeners
- `packages/uzay/src/core/2d/view2d.ts` and `core/3d/view3d.ts`: own their three.js object set, active camera, render loop
- `packages/uzay/src/react/Scene2DView.tsx` and `Scene3DView.tsx`: view props (scene, camera)
- `packages/uzay/src/core/2d/items/camera2d.ts` and `core/3d/items/camera3d.ts`: camera fields (add visibility here)
- `packages/uzay/src/core/shared/types/tags.ts`: `ItemTags` (shared by 2D and 3D items)
- `packages/uzay/src/core/shared/atom-wrapper.ts`: `BoundAtom` store binding, the reason cross-scene atom sharing fails
