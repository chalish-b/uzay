import type { Scene2D } from "../scene2d";
import type { AtomLikeInput } from "../../shared/atom-wrapper";
import { ensureAtom } from "../../shared/atom-wrapper";
import type { Color } from "../../shared/types/colors";
import type { Vec2 } from "../../shared/types/vec2";

type GridMap2D = (x: number, y: number) => Vec2;

type TransformedGrid2DOptions = {
  // The map applied to the source grid. Every grid line is rendered as the
  // parametric image of that line under the map, so nonlinear maps bend the
  // lines into curves. Pass a derived atom to animate the map (e.g. lerping
  // the identity toward a target map).
  map: AtomLikeInput<GridMap2D>;
  // Source-plane extent of the grid, in world units. The grid is always
  // finite: the image of a source line can only be sampled over an explicit
  // interval.
  rangeX?: AtomLikeInput<[number, number]>;
  rangeY?: AtomLikeInput<[number, number]>;
  // Spacing between adjacent source lines; lines sit at multiples of it.
  gap?: AtomLikeInput<number>;
  // Colors for the two line families: `colorX` for lines that run along the
  // x direction (source lines y = c), `colorY` for lines that run along the
  // y direction (source lines x = c). Distinct colors keep the families
  // tellable apart after the map scrambles the plane.
  colorX?: AtomLikeInput<Color>;
  colorY?: AtomLikeInput<Color>;
  opacity?: AtomLikeInput<number>;
  thickness?: AtomLikeInput<number>;
  // Show or hide the whole construction, applied to every item it creates.
  visible?: AtomLikeInput<boolean>;
};

// The multiples of gap inside [min, max]: the fixed coordinates of one line
// family.
function gridCoords(range: [number, number], gap: number): number[] {
  const [min, max] = range;
  if (!(gap > 0) || max < min) return [];
  const eps = gap * 1e-6;
  const first = Math.ceil((min - eps) / gap);
  const last = Math.floor((max + eps) / gap);
  const coords: number[] = [];
  for (let i = first; i <= last; i++) coords.push(i * gap);
  return coords;
}

/**
 * A coordinate grid pushed through an arbitrary map: every source grid line
 * is drawn as a parametric curve, the image of that line under `map`. The two
 * line families are colored separately so they stay distinguishable however
 * the map deforms the plane.
 */
export function transformedGrid2D(
  scene: Scene2D,
  options: TransformedGrid2DOptions
) {
  const mapAtom = ensureAtom(scene.atom, options.map, "value");
  const defaultRange: [number, number] = [-4, 4];
  const rangeXAtom = ensureAtom(scene.atom, options.rangeX ?? defaultRange);
  const rangeYAtom = ensureAtom(scene.atom, options.rangeY ?? defaultRange);
  const gapAtom = ensureAtom(scene.atom, options.gap ?? 0.5);
  const colorXAtom = ensureAtom(scene.atom, options.colorX ?? "#38bdf8");
  const colorYAtom = ensureAtom(scene.atom, options.colorY ?? "#a78bfa");
  const opacityAtom = ensureAtom(scene.atom, options.opacity ?? 0.5);
  const thicknessAtom = ensureAtom(scene.atom, options.thickness ?? 1);
  const visibleAtom = ensureAtom(scene.atom, options.visible ?? true);

  // Fixed coordinates per family: lines along x sit at y = c for each c in
  // xLineCoords, lines along y at x = c for each c in yLineCoords.
  const xLineCoordsAtom = scene.atom((get) =>
    gridCoords(get(rangeYAtom), get(gapAtom))
  );
  const yLineCoordsAtom = scene.atom((get) =>
    gridCoords(get(rangeXAtom), get(gapAtom))
  );

  // Each item owns an index into its family's coordinate list and hides when
  // the index falls past the end, so ranges and gap can change reactively.
  const makeLine = (family: "x" | "y", index: number) => {
    const coordsAtom = family === "x" ? xLineCoordsAtom : yLineCoordsAtom;
    const spanAtom = family === "x" ? rangeXAtom : rangeYAtom;
    return scene.create("parametricfunction2d", {
      f: scene.atom((get) => {
        const map = get(mapAtom);
        const c = get(coordsAtom)[index] ?? 0;
        return family === "x"
          ? (s: number) => map(s, c)
          : (s: number) => map(c, s);
      }),
      tStart: scene.atom((get) => get(spanAtom)[0]),
      tEnd: scene.atom((get) => get(spanAtom)[1]),
      color: family === "x" ? colorXAtom : colorYAtom,
      thickness: thicknessAtom,
      opacity: opacityAtom,
      visible: scene.atom(
        (get) => get(visibleAtom) && index < get(coordsAtom).length
      ),
      pointerEvents: "none",
    });
  };

  const linesX: ReturnType<typeof makeLine>[] = [];
  const linesY: ReturnType<typeof makeLine>[] = [];

  // The item pools grow when a range or gap change asks for more lines than
  // exist; surplus items stay hidden through their visibility atoms. The
  // returned arrays are these same pools, so handles stay current.
  const grow = () => {
    const xCount = xLineCoordsAtom.get().length;
    while (linesX.length < xCount) linesX.push(makeLine("x", linesX.length));
    const yCount = yLineCoordsAtom.get().length;
    while (linesY.length < yCount) linesY.push(makeLine("y", linesY.length));
  };
  grow();
  const unsubX = xLineCoordsAtom.sub(grow);
  const unsubY = yLineCoordsAtom.sub(grow);

  return {
    linesX,
    linesY,
    dispose: () => {
      unsubX();
      unsubY();
      for (const line of linesX) scene.remove(line);
      for (const line of linesY) scene.remove(line);
    },
  };
}
