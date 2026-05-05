export type OverlayFormat = "text" | "latex";

export type OverlayAnchor =
  | "center"
  | "top-left"
  | "top"
  | "top-right"
  | "left"
  | "right"
  | "bottom-left"
  | "bottom"
  | "bottom-right";

// CSS2DRenderer already centers the wrapper element at the projected 3D position
// (via translate(-50%, -50%) on the wrapper). These transforms shift the inner
// content element relative to that already-centered state.
export function anchorToTranslate(anchor: OverlayAnchor): string {
  switch (anchor) {
    case "center":
      return "translate(0%, 0%)";
    case "top-left":
      return "translate(50%, 50%)";
    case "top":
      return "translate(0%, 50%)";
    case "top-right":
      return "translate(-50%, 50%)";
    case "left":
      return "translate(50%, 0%)";
    case "right":
      return "translate(-50%, 0%)";
    case "bottom-left":
      return "translate(50%, -50%)";
    case "bottom":
      return "translate(0%, -50%)";
    case "bottom-right":
      return "translate(-50%, -50%)";
  }
}
