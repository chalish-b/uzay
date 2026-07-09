// The dash pattern for a dashed stroke, derived from its thickness so thicker
// lines get proportionally longer dashes. Values are CSS pixels, matching the
// unit thickness itself uses; each backend converts to its own dash units
// (dashScale on the three backend's LineMaterial, a world-unit stroke-dasharray
// on the SVG backend).
export type DashPatternPx = {
  dashPx: number;
  gapPx: number;
};

export function dashPatternPx(thickness: number): DashPatternPx {
  return {
    dashPx: Math.max(4, thickness * 4),
    gapPx: Math.max(3, thickness * 2.5),
  };
}
