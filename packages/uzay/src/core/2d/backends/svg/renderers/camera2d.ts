import type { SvgItemRenderer } from "./shared";

// Camera has no visible representation; the View2D consumes its state directly.
export const camera2dSvgRenderer: SvgItemRenderer<"camera2d"> = {
  create() {
    return { kind: "camera2d" };
  },
  update() {},
};
