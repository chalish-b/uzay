## Version 0.1 (DONE)

### Features

- Orbit and zoom camera
- A grid on the xy plane
  - No infinity yet, just a limited value
  - Just major lines with some defined color and thickness
- Axes lines
  - No labels or ticks
- Rendering points
  - No dragging yet
  - But atoms are still reactive (using slides or whatever)
  - Just a color and radius, no other fancy styles
- Rendering lines
  - Line segments, no infinity.
  - Defined by two end points (atom or plain value, stored as atom in the class field anyway)
  - Again, no interaction by clicking or dragging. Only atoms are reactive using sliders and stuff
- No atom abstractions. Just raw Jotai atom

### Implementation Details

- The `Scene` and `View` objects exposed as the API. Nothing else.
- The `View` manages the three.js renderer. It's not exposed to the user.
- `View` handles the coordinate system transformations.
  - The `Scene` works only through world coordinates. It has no info about anything else.
  - Every field in `Item` is an atom. It's a single, unified system for all reactive stuff.

### MVP

- A demo where you can move points around using sliders
- The line defined by the end points is also updated as we move the points.
- We can orbit around the 3D scene
- There is a grid and axis lines

## Version 0.2: Architecture Refactoring

### Features

- View3D refactor: split into smaller, focused modules
- Two-way data flow: renderer → scene communication
- Item lifecycle: proper removal and cleanup API
- Mesh-to-item mapping: preparation for hit testing

### Implementation Details

- Extract `ThreeContext` to manage Three.js renderer, camera, and controls
- Extract reconciliation logic into separate module
- Add `userData.itemId` on all Three.js objects for future raycasting
- Camera state syncs back to Camera3D item after orbit controls move
- Add `scene.remove(item)` method with proper cleanup

## Version 0.3: Interactions

### Features

- Interactions
  - Being able to drag points, and having those changes reflected back in the atoms / updating other relations.
- Camera improvements
  - Updating the camera using atoms
  - Switching between multiple cameras
  - A single scene having multiple views
  - Perspective / Orthographics camera choice
- Function improvements
  - Handling discontinuities (just allow the user to pass discontinuous t values manually)

## Future

- React wrapper
  - Just start with normal components + `useEffect` for now
  - In the future, we can actually implement a proper thing with React reconciler.
- 2D scenes
- Vectors and vector fields
  - I think making a vector field a special (separate) item is more useful (so that we can have a single geometry, if that's possible)
  - The arrow heads are kind of a problem though if we're going with the 2D Line approach. We can use a texture or something, or maybe a custom shader
- Groups
  - Items can be added to groups instead of the scene. The group has a coordinate. The child items' coordinates are relative to the group
- Unify the "thickness" values for axes and grid.
  - Since grid uses Line2 instead of a 3D geometry, its thickness is different (pixels vs. world units).
- We should separate orthographic and perspective cameras to be different items.
  - There isn't really a good way to switch between them, because they are fundamentally different objects in Three.js. Since a scene can have multiple cameras, and we will have a `view.changeCam` method, the API will still be nice.
- Documentation improvements
  - Add an "examples" section that shows demos and their source code.
  - In addition to a separate examples section, add small examples inside the pages themselves. Currently we do this, but the examples are kind of mixed with the explanations.
  - Convert the API reference stuff to "type tables" in Fumadocs.
- Infinite grid and axes
- Camera controls and syncing between `Scene <-> View`
  - Add some kind of camera reset button while you're at it, it's really easy to lose track of the position and stuff.
- Axes labels
- Filled in shaped / functions
- Opacity option for stuff
  - We can't directly pass an rgba color to the color property, so we need a separate field
- Better looking visuals
  - Better materials with shaders and stuff
  - Custom shader support
  - Options like glow, bloom etc.
  - More granular customization, like a function plot having a color gradient for the curve (not just a single color)
- Helper functions to encapsulate some complex logic
  - In React wrapper, these would just be some components that include the primitives.
  - For vanilla library these are function that can take the scene object, and some options, and set up some complex scenarios.
  - Basically just helper functions that you can technically do yourself, but provided for common use cases.
  - I think this could simplify some of the stuff, and help us move things from the renderer / scene to the application logic.
    - For example, maybe an "Axis" object could just be a single axis. But we can create a helper function to create three different axes at the same time for common configs
    - Same with grids, a grid could just be a 2D plane, and we can have a function to set up a common grid + axes scene.
  - Ideas:
    - Function plot with area under it filled in
    - Line with two points at the ends
