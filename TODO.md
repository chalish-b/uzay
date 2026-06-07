## Features

- A fullscreen button for the demos. But idk whether that should be handled by whatever "wrapper" the user makes instead of the library itself.
- Reusable themes. Can be attached to the view object, dark and light variants etc.
  - Or instead of the library managing dark and light, the theme itself can be reactive and the user can update it however they want.
- Add a dedicated examples section in documentation
  - Show more patterns like:
    - How to constrain points to be on a sphere, on a plane etc.
- Camera improvements
  - A single scene having multiple views (multiple cameras in one scene is already implemented, but never tried multiple views of the same scene, that can be interesting)
  - Perspective / Orthographics camera choice
  - Camera reset button (easy to lose track of position when orbiting)
- Function improvements
  - Handling discontinuities: Just allow the user to pass discontinuous t values manually, it's the simplest approach. Otherwise detection is kinda complex, especially if we don't have access to the symbolic representation of the function
- Optimizations
- Axes labels
- Some kind of UI helpers, like latex text / numbers but they are draggable and the value updates in real time
- More interactivity improvements
  - Better hitboxes for point dragging
  - Update documentation and give more examples
  - Create more demos that rely on interactive points
  - Have a better distinction between click vs. drag
- Custom material options.
  - Just allow the user to pass MessPhongMaterialParameters (or some kind of atomized version of it?). This includes shader as well so they can write their own shaders if they want.
- Vectors fields
  - I think making a vector field a special (separate) item is more useful and performant (so that we can have a single geometry for it all, if that's possible)
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
- Filled in shaped / functions
- Add the `visible` property to all items so it can be toggled instead of removing the item completely.
- Better looking visuals
  - Better materials with shaders and stuff
  - Custom shader support
  - Options like glow, bloom etc.
  - More granular customization, like a function plot having a color gradient for the curve (not just a single color)
    - For simplicity, we can start off by making `color` also able to be a function of `t` and somehow handle this idk
    - Or have a separate thing like `colorMap` which is a function that takes point coordinates (in world coords) as the argument and returns a color. Idk if three.js supports per-vertex coloring or we need a custom shader though.
- Helper functions to encapsulate some complex logic
  - For vanilla library these are functions that can take the scene object, and some options, and set up some complex scenarios.
  - Basically just helper functions that you can technically do yourself, but provided for common use cases.
  - I think this could simplify some of the stuff, and help us move things from the renderer / scene to the application logic.
    - For example, maybe an "Axis" object could just be a single axis. But we can create a helper function to create three different axes at the same time for common configs
    - Same with grids, a grid could just be a 2D plane, and we can have a function to set up a common grid + axes scene.
  - Ideas:
    - Function plot with area under it filled in
    - Line with two points at the ends
    - Point on a sphere, point on a function, basically points constrained to some surface or path
    - Get some more ideas from GeoGebra:
      - Showing the intersection of two surfaces
- Edit mode
  - Being able to click on an object, and directly changing its properties and atoms on the interface

  ## Bugs

- Explicitly typed atoms (`scene.atom<T>()`) don't get autocomplete. The type checking still works, but for things like string types, it would be nice if it provided autocomplete.
- This whole thing with Vec3 type and Vec3 namespace is bad. We need to import Vec3 namespace as Vec3Utils just for this and causes confusions.

## 2D

- A new `function2d` item that is for non-parametric, simple functions.
  - This would also allow us to have infinite start/end range (which is kinda ambiguous for parametric functions).
- Dynamic grid
- Hit testing lines in 2D might be an issue
- Add some anti aliasing to the lines and functions
- Zooming into a function plot makes the point look not on the function. We need an adaptive function sampling approach I guess.
  - As a hack though, we can put limits on zoom levels
