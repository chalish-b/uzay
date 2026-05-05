import type { ItemRenderer } from "./index";

// Camera has no visible representation; the View2D consumes its state directly.
export const camera2dRenderer: ItemRenderer<"camera2d"> = {
  create() {
    return { kind: "camera2d" };
  },
  update() {},
};
