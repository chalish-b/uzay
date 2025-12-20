import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Camera3D } from "./camera3d";
import type { Scene3D } from "./scene3d";
import { Vec3 } from "./common-types/vec3";

export class View3D {
  scene: Scene3D;
  camera: Camera3D;
  containerElem: HTMLElement;

  // three.js specific fields
  // These will probably be extracted into a separate class, like "Renderer"
  threeScene: THREE.Scene;
  threeCamera: THREE.Camera;
  threeOrbitControls: OrbitControls;
  threeRenderer: THREE.WebGLRenderer;
  renderRequested: boolean = false;

  constructor(scene: Scene3D, camera: Camera3D, containerElem: HTMLElement) {
    // Set the variables
    this.scene = scene;
    this.camera = camera;
    this.containerElem = containerElem;

    // Initialize the three.js renderer
    const size = [containerElem.clientWidth, containerElem.clientHeight];
    this.threeScene = new THREE.Scene();

    this.threeCamera = new THREE.PerspectiveCamera(
      camera.fov.get(),
      size[0] / size[1],
      camera.near.get(),
      camera.far.get(),
    );
    this.threeCamera.position.set(...Vec3.asArray(camera.position.get()))
    this.threeCamera.lookAt(...Vec3.asArray(camera.lookAt.get()))

    // TODO: We need a way to sync our camera object in the scene with
    // This three.js camera as it's controlled.
    this.threeOrbitControls = new OrbitControls(this.threeCamera, containerElem);
    this.threeOrbitControls.enableDamping = true;
    this.threeOrbitControls.target.set(0, 0, 0);
    this.threeOrbitControls.update();
    this.threeOrbitControls.addEventListener("change", () => this.requestRender())

    // TEST: Adding a cube object just to test things
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: "red" });
    const cube = new THREE.Mesh(geometry, material);
    this.threeScene.add(cube);

    this.threeRenderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    this.threeRenderer.setSize(size[0], size[1]);
    containerElem.appendChild(this.threeRenderer.domElement);

    // Connect the scene's invalidate function to the scheduleRerender


    // Render the first frame
    this.threeRenderer.render(this.threeScene, this.threeCamera);
  }

  requestRender() {
    if (!this.renderRequested) {
      this.renderRequested = true;
      requestAnimationFrame(() => this.render());
    }
  }

  render() {
    console.log("rendering");
    this.renderRequested = false;
    const cameraUpdated = this.threeOrbitControls.update()
    this.threeRenderer.render(this.threeScene, this.threeCamera);

    if (cameraUpdated) {
      // TODO: When connecting the camera position updating the scene and causing a re-render,
      // This will probably cause an infinite loop
      // threejs camera updating -> scene camera updating -> causing a re-render -> ...
      // but I'm not sure, maybe cameraUpdated guard already handles this, idk.
      this.camera.position.set(this.threeCamera.position)

      // TODO: How do we set the lookAt? lookAt is a function, not a value
      // this.camera.lookAt.set(this.threeCamera.);
    }
  }
}
