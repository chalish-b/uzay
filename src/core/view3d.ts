import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Camera3D, Camera3DFields } from "./items/camera3d";
import type { Scene3D, SceneSnapshot } from "./scene3d";
import { Vec3 } from "./common-types/vec3";
import type { ItemId, ItemKind, ItemSnapshot } from "./common-types/item-registry";
import type { AtomLikeOptions } from "./atom-wrapper";

type ThreeSceneTypes = {
  "point3d": {
    kind: "point3d",
    geometry: THREE.SphereGeometry,
    material: THREE.MeshBasicMaterial,
    mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>,
  },
  "line3d": {
    kind: "line3d",
    geometry: THREE.BufferGeometry,
    material: THREE.LineBasicMaterial,
    mesh: THREE.Mesh<THREE.BufferGeometry, THREE.LineBasicMaterial>,
  }
  "camera3d": {
    kind: "camera3d",
  }
}

type ThreeSceneObject<K extends ItemKind = ItemKind> = ThreeSceneTypes[K]

export class View3D {
  scene: Scene3D;
  activeCam: Camera3D<AtomLikeOptions<Camera3DFields>>;
  containerElem: HTMLElement;

  // three.js specific fields
  // These will probably be extracted into a separate class, like "Renderer"
  threeScene: THREE.Scene;
  threeCamera: THREE.Camera;
  threeOrbitControls: OrbitControls;
  threeRenderer: THREE.WebGLRenderer;
  frameScheduled: boolean = false;

  threeMeshes: Map<ItemId, ThreeSceneObject> = new Map();

  // Scene snapshots. Initially an empty list, so all items will be added
  lastSceneSnapshot: SceneSnapshot = { itemSnapshots: new Map() };

  constructor(scene: Scene3D, activeCamId: ItemId, containerElem: HTMLElement) {
    this.scene = scene;
    this.activeCam = scene.getCamera(activeCamId);

    // Initialize the three.js renderer
    this.containerElem = containerElem;
    const size = [containerElem.clientWidth, containerElem.clientHeight];
    this.threeScene = new THREE.Scene();

    const camera = this.activeCam.getItemSnapshot();
    this.threeCamera = new THREE.PerspectiveCamera(
      camera.fov,
      size[0] / size[1],
      camera.near,
      camera.far,
    );
    this.threeCamera.position.set(...Vec3.asArray(camera.position))
    this.threeCamera.lookAt(...Vec3.asArray(camera.lookAt))

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

    // Set up renderer
    this.threeRenderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    this.threeRenderer.setSize(size[0], size[1]);
    this.threeRenderer.setPixelRatio(window.devicePixelRatio);
    containerElem.appendChild(this.threeRenderer.domElement);

    // Connect the scene's invalidate function to update the three.js scene and rerender
    scene.listenForSceneInvalidation(() => {
      this.onSceneChanged();
    });

    // Render the first frame
    this.onSceneChanged();
    this.threeRenderer.render(this.threeScene, this.threeCamera);
  }

  changeActiveCam(cameraId: ItemId) {
    this.activeCam = this.scene.getCamera(cameraId);
    // TODO: Update the camera fields of the threeCamera as well
  }

  onSceneChanged() {
    const newSceneSnapshot = this.scene.getSceneSnapshot();

    // Update threeScene data, comparing it to the last snapshot of scene
    // This is kinda like React's reconciliation algorithm.
    const unrenderedItems = new Set(this.lastSceneSnapshot.itemSnapshots.keys());
    for (const [id, item] of newSceneSnapshot.itemSnapshots.entries()) {
      if (unrenderedItems.has(id)) {
        // If it exists and it's dirty, we update it
        unrenderedItems.delete(id);
        if (!item.isDirty) continue;
        this.updateItem(item);
      } else {
        // If the item doesn't exist in the last snapshot, we create it
        this.createItem(item);
      }
    }
    // If after going through all the items in the new snapshot, we still have unrendered
    // items, that means that item was removed from the scene. We remove it as well.
    for (const id of unrenderedItems) {
      // this.removeItem(id);
    }

    // Render the updated scene and finish
    this.lastSceneSnapshot = newSceneSnapshot;
    this.requestRender();
    this.scene.renderComplete();
  }

  createItem(item: ItemSnapshot) {
    if (item.kind === "point3d") {
      const geometry = new THREE.SphereGeometry(1);
      const material = new THREE.MeshBasicMaterial({ color: item.color });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.scale.set(item.radius, item.radius, item.radius);
      mesh.position.set(item.coords.x, item.coords.y, item.coords.z);
      // sphereObj.userData.id = item.id;
      this.threeMeshes.set(item.id, { kind: item.kind, geometry, material, mesh })
      this.threeScene.add(mesh);
    } else if (item.kind === "line3d") {

    } else {
      // Ignore the camera
    }
  }

  updateItem(item: ItemSnapshot) {
    // If we call this function, we can assume that the item exists in the scene
    // And also assume its "kind" is the same as the mesh.kind
    const mesh = this.threeMeshes.get(item.id);
    if (!mesh) return;
    if (mesh.kind === "point3d" && item.kind === "point3d") {
      mesh.material.color.set(item.color);
      mesh.mesh.scale.set(item.radius, item.radius, item.radius);
      mesh.mesh.position.set(item.coords.x, item.coords.y, item.coords.z);
    } else if (mesh.kind === "line3d" && item.kind === "line3d") {

    }
  }

  requestRender() {
    if (!this.frameScheduled) {
      this.frameScheduled = true;
      requestAnimationFrame(() => this.render());
    }
  }

  render() {
    this.frameScheduled = false;
    const cameraUpdated = this.threeOrbitControls.update()
    this.threeRenderer.render(this.threeScene, this.threeCamera);

    if (cameraUpdated) {
      // TODO: When connecting the camera position updating the scene and causing a re-render,
      // This will probably cause an infinite loop
      // threejs camera updating -> scene camera updating -> causing a re-render -> ...
      // but I'm not sure, maybe cameraUpdated guard already handles this, idk.

      // TODO: Now that we're only passing snapshots to the renderer, find a way to
      // Pass the events like orbit back to the scene so it can update the items
      // (including the camera, which is now just an item)
      // this.camera.position.set(this.threeCamera.position)
      // this.camera.lookAt.set(this.threeOrbitControls.target);
    }
  }
}
