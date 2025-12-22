import type { ItemRenderer, ThreeSceneTypes } from "./index";

// Camera is handled specially by View3D and doesn't create scene objects
export const camera3dRenderer: ItemRenderer<"camera3d"> = {
  create(): ThreeSceneTypes["camera3d"] {
    // Camera is handled specially by View3D
    return {
      kind: "camera3d",
    };
  },

  update(): void {
    // Camera updates are handled by View3D directly
  },

  dispose(): void {
    // Nothing to dispose for camera
  },
};
