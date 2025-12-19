## Version 0.1

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


## Version 0.2

### Features
