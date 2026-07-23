## Features

- A fullscreen button for the demos. But idk whether that should be handled by whatever "wrapper" the user makes instead of the library itself.
- Add a dedicated examples section in documentation
  - Show more patterns like:
    - How to constrain points to be on a sphere, on a plane etc.
- Camera improvements
  - Camera reset button (easy to lose track of position when orbiting)
- Optimizations
- Axes labels (3D). We added them in 2D but not in 3D because idk how they'd work in 3D.
- Infinite grid and axes (3D). Again, done in 2D but not in 3D. I don't even know how it'd work in 3D.
- Some kind of UI helpers, like latex text / numbers but they are draggable and the value updates in real time
- More interactivity improvements
  - Better hitboxes for point dragging
  - Have a better distinction between click vs. drag
- Custom material options.
  - Just allow the user to pass MessPhongMaterialParameters (or some kind of atomized version of it?). This includes shader as well so they can write their own shaders if they want.
- Vectors fields
  - I think making a vector field a special (separate) item is more useful and performant (so that we can have a single geometry for it all, if that's possible)
  - It can either be a set of arrows, or continuous lines (to show things like fields and flow)
  - The arrow heads are kind of a problem though if we're going with the 2D Line approach. We can use a texture or something, or maybe a custom shader
- Groups
  - Items can be added to groups instead of the scene. The group has a coordinate. The child items' coordinates are relative to the group
- Documentation improvements
  - Add an "examples" section that shows demos and their source code.
  - In addition to a separate examples section, add small examples inside the pages themselves. Currently we do this, but the examples are kind of mixed with the explanations.
  - Convert the API reference stuff to "type tables" in Fumadocs.
- Filled in shaped / functions
- Better looking visuals
  - Better materials with shaders and stuff
  - Custom shader support
  - Options like glow, bloom etc.
  - More granular customization, like a function plot having a color gradient for the curve (not just a single color)
    - For simplicity, we can start off by making `color` also able to be a function of `t` and somehow handle this idk
    - Or have a separate thing like `colorMap` which is a function that takes point coordinates (in world coords) as the argument and returns a color. Idk if three.js supports per-vertex coloring or we need a custom shader though.
- Edit mode
  - Being able to click on an object, and directly changing its properties and atoms on the interface

### More construction ideas

- The 3D equivalent of `transformedGrid2D`. There are 2 different things in the 3D case though: The 2D grids (basically like how we have `grid3D`), and then there is the "lattice" structure which is actually a 3D structure. idk whether the lattice is worth doing a construction
- Point on a sphere, point on a function, basically points constrained to some surface or path
- Get some more ideas from GeoGebra:
    - Showing the intersection of two surfaces

## Bugs

- Explicitly typed atoms (`scene.atom<T>()`) don't get autocomplete. The type checking still works, but for things like string types, it would be nice if it provided autocomplete.

## 2D

- Some kind of construction like circlePoint2D to add a point on a circle
- A construction to display an area _between_ two functions. A logical extension of area under construction.
- Adding limits to the zoom and pan in the camera
- Hit testing lines in 2D might be an issue
- Add some anti aliasing to the lines and functions
