import type { Camera3D } from "./camera3d";
import type { Scene3D } from "./scene3d";

export class View3D {
  scene: Scene3D;
  camera: Camera3D;
  containerElem: HTMLElement;

  constructor(scene: Scene3D, camera: Camera3D, containerElem: HTMLElement) {
    // Set the variables
    this.scene = scene;
    this.camera = camera;
    this.containerElem = containerElem;

    // Initialize the three.js renderer
    
    // Connect the scene's invalidate function to the scheduleRerender
  }
}
