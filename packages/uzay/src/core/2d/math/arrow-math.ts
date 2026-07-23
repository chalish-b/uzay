// Annotation arrowheads: the filled triangles that decorate line2d ends and
// angleMark2D arcs. All heads of this kind share one size, a library-wide
// convention, so figures mixing straight and curved dimension marks match.
// vector2d's head is the exception: it is part of that item's own look and
// stays configurable through the item's headLength/headWidth fields.

export const ANNOTATION_HEAD_LENGTH = 10; // CSS px, tip to base
export const ANNOTATION_HEAD_WIDTH = 8; // CSS px, base edge

type Pt = { x: number; y: number };

export type ArrowHeadTriangle = {
  tip: Pt;
  baseLeft: Pt;
  baseRight: Pt;
};

// World-space triangle for a head whose tip sits at `tip`, pointing along
// `dir` (any nonzero length). Pixel sizes resolve to world units through
// `worldPerPixel`. Null when the direction is degenerate: a head with no
// direction to point in is not drawn.
export function arrowHeadTriangle(
  tip: Pt,
  dir: Pt,
  headLength: number,
  headWidth: number,
  worldPerPixel: number
): ArrowHeadTriangle | null {
  const len = Math.hypot(dir.x, dir.y);
  if (len < 1e-9) return null;
  const ux = dir.x / len;
  const uy = dir.y / len;
  const back = headLength * worldPerPixel;
  const half = (headWidth * worldPerPixel) / 2;
  const baseX = tip.x - ux * back;
  const baseY = tip.y - uy * back;
  // Perpendicular to the direction, half a head-width to each side.
  const perpX = -uy * half;
  const perpY = ux * half;
  return {
    tip: { x: tip.x, y: tip.y },
    baseLeft: { x: baseX + perpX, y: baseY + perpY },
    baseRight: { x: baseX - perpX, y: baseY - perpY },
  };
}
