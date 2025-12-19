## Features

- Customizable renderers
  - The renderer keeps track of all render-related stuff, like materials, meshes etc. It does this by keeping a Map of all entities indexed by their ID.

## Bugs

## Other

- Should camera even be a part of the scene?

  - In the future, if we want to have multiple views of the same scene, how would that work?

- What should be Atoms vs. plain values (with update methods), make that more clear.

  - I think stuff that should be updated in real time, and can depend on each other (with relations) is enough criteria to define an atom.
  - 99% of the cases, it's a position, distance, scale, or something similar, a geometric property.

- Documentation
  - Both in the API / code, and in the library itself
- Demo page with lots of great visualizations

  - Maybe even an AI demo to show that AI can use this library as well.

- Coordinate system clarification
  - Client: Pixels. Based on the whole window, relative to top left. This is mostly useful for pointer events.
  - Screen: Pixels. Based on the container element, relative to top left.
  - World: Pixels inside the scene itself. Relative to the origin of the scene. This is mostly useful in 3D.
  - Unit: Units inside our coordinate system. All the items like points, vectors etc. are defined based on this.
