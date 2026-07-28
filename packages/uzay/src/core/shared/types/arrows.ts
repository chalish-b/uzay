// Which ends of a linear element carry an arrowhead. Shared vocabulary for
// items that draw arrowheads at their endpoints (line2d, axes2d).
export type ArrowEnds = "none" | "start" | "end" | "both";

export function hasArrowAt(arrows: ArrowEnds, which: "start" | "end"): boolean {
  return arrows === which || arrows === "both";
}
