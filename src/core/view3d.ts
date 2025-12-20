import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Camera3D, Camera3DFields } from "./items/camera3d";
import type { Scene3D, SceneSnapshot } from "./scene3d";
import { Vec3 } from "./common-types/vec3";
import type {
  ItemId,
  ItemKind,
  ItemSnapshot,
} from "./common-types/item-registry";
import type { AtomLikeOptions } from "./atom-wrapper";

type ThreeSceneTypes = {
  point3d: {
    kind: "point3d";
    geometry: THREE.SphereGeometry;
    material: THREE.MeshBasicMaterial;
    mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  };
  line3d: {
    kind: "line3d";
    curve: THREE.CatmullRomCurve3;
    geometry: THREE.TubeGeometry;
    material: THREE.MeshBasicMaterial;
    mesh: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>;
  };
  camera3d: {
    kind: "camera3d";
  };
  parametricfunction3d: {
    kind: "parametricfunction3d";
    curve: THREE.CatmullRomCurve3;
    geometry: THREE.TubeGeometry;
    material: THREE.MeshBasicMaterial;
    mesh: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>;
  };
};

type ThreeSceneObject<K extends ItemKind = ItemKind> = ThreeSceneTypes[K];

export class View3D {
  scene: Scene3D;
  activeCam: Camera3D<AtomLikeOptions<Camera3DFields>>;
  containerElem: HTMLElement;

  // three.js specific fields
  // These will probably be extracted into a separate class, like "Renderer"
  threeScene: THREE.Scene;
  threeCamera: THREE.PerspectiveCamera;
  threeOrbitControls: OrbitControls;
  threeRenderer: THREE.WebGLRenderer;
  frameScheduled: boolean = false;

  threeMeshes: Map<ItemId, ThreeSceneObject> = new Map();

  // Scene snapshots. Initially an empty list, so all items will be added
  lastSceneSnapshot: SceneSnapshot = { itemSnapshots: new Map() };

  sizer: ReturnType<typeof createResponsiveThreeSizer>;

  constructor(scene: Scene3D, activeCamId: ItemId, containerElem: HTMLElement) {
    this.scene = scene;
    this.activeCam = scene.getCamera(activeCamId);

    // Initialize the three.js renderer
    this.containerElem = containerElem;
    this.threeScene = new THREE.Scene();

    const camera = this.activeCam.getItemSnapshot();
    this.threeCamera = new THREE.PerspectiveCamera(
      camera.fov,
      1,
      camera.near,
      camera.far
    );
    this.threeCamera.position.set(...Vec3.asArray(camera.position));
    this.threeCamera.lookAt(...Vec3.asArray(camera.lookAt));
    this.threeCamera.zoom = camera.zoom;

    // Set up renderer
    this.threeRenderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    this.threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.threeRenderer.domElement.style.display = "block";
    this.threeRenderer.domElement.style.width = "100%";
    this.threeRenderer.domElement.style.height = "100%";
    containerElem.appendChild(this.threeRenderer.domElement);

    // TODO: We need a way to sync our camera object in the scene with
    // This three.js camera as it's controlled.
    this.threeOrbitControls = new OrbitControls(
      this.threeCamera,
      this.threeRenderer.domElement
    );
    // TODO: Make damping an option
    this.threeOrbitControls.enableDamping = false;
    this.threeOrbitControls.target.set(0, 0, 0);
    this.threeOrbitControls.addEventListener("change", () =>
      this.requestRender()
    );

    this.sizer = createResponsiveThreeSizer({
      container: containerElem,
      maxDpr: 2,
      renderer: this.threeRenderer,
      camera: this.threeCamera,
      invalidate: () => this.requestRender(),
    });

    // Handle canvas resizing
    // const resizeObserver = new ResizeObserver(() => this.onResize())
    // resizeObserver.observe(containerElem);

    // Connect the scene's invalidate function to update the three.js scene and rerender
    scene.listenForSceneInvalidation(() => {
      this.onSceneChanged();
    });

    // Render the first frame
    this.onSceneChanged();
    this.requestRender();
  }

  changeActiveCam(cameraId: ItemId) {
    this.activeCam = this.scene.getCamera(cameraId);
    // TODO: Update the camera fields of the threeCamera as well
  }

  onSceneChanged() {
    const newSceneSnapshot = this.scene.getSceneSnapshot();

    // Update threeScene data, comparing it to the last snapshot of scene
    // This is kinda like React's reconciliation algorithm.
    const unrenderedItems = new Set(
      this.lastSceneSnapshot.itemSnapshots.keys()
    );
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
      this.threeMeshes.set(item.id, {
        kind: item.kind,
        geometry,
        material,
        mesh,
      });
      this.threeScene.add(mesh);
    } else if (item.kind === "line3d") {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(item.start.x, item.start.y, item.start.z),
        new THREE.Vector3(item.end.x, item.end.y, item.end.z),
      ]);
      // TODO: The line is very thick for some reason, figure out the cause
      const geometry = new THREE.TubeGeometry(
        curve,
        64,
        item.thickness / 20,
        8,
        true
      );
      const material = new THREE.MeshBasicMaterial({ color: item.color });
      const mesh = new THREE.Mesh(geometry, material);
      this.threeMeshes.set(item.id, {
        kind: item.kind,
        curve,
        geometry,
        material,
        mesh,
      });
      this.threeScene.add(mesh);
    } else if (item.kind === "parametricfunction3d") {
      // Calculate all the points based on the sample count
      const points = [];
      for (let i = 0; i < item.samples; i++) {
        const t =
          item.tStart + ((item.tEnd - item.tStart) * i) / (item.samples - 1);
        const point = item.f(t);
        points.push(new THREE.Vector3(point.x, point.y, point.z));
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const geometry = new THREE.TubeGeometry(
        curve,
        item.samples,
        item.thickness / 20,
        8,
        false
      );
      const material = new THREE.MeshBasicMaterial({ color: item.color });
      const mesh = new THREE.Mesh(geometry, material);
      this.threeMeshes.set(item.id, {
        kind: item.kind,
        curve,
        geometry,
        material,
        mesh,
      });
      this.threeScene.add(mesh);
    } else {
      // Ignore the camera
    }
  }

  updateItem(item: ItemSnapshot) {
    // If we call this function, we can assume that the item exists in the scene
    // And also assume its "kind" is the same as the mesh.kind
    const obj = this.threeMeshes.get(item.id);
    if (!obj) return;
    if (obj.kind === "point3d" && item.kind === "point3d") {
      obj.material.color.set(item.color);
      obj.mesh.scale.set(item.radius, item.radius, item.radius);
      obj.mesh.position.set(item.coords.x, item.coords.y, item.coords.z);
    } else if (obj.kind === "line3d" && item.kind === "line3d") {
      obj.material.color.set(item.color);
      obj.curve.points[0].set(item.start.x, item.start.y, item.start.z);
      obj.curve.points[1].set(item.end.x, item.end.y, item.end.z);
      // Unfortunately, we can't really change the radius of the tube geometry after creation. So we recreate it.
      // TODO: Only do this if the position or the thickness changes
      const oldGeometry = obj.geometry;
      const geometry = new THREE.TubeGeometry(
        obj.curve,
        64,
        item.thickness / 20,
        8,
        true
      );
      obj.geometry = geometry;
      obj.mesh.geometry = geometry;
      oldGeometry.dispose();
    } else if (
      obj.kind === "parametricfunction3d" &&
      item.kind === "parametricfunction3d"
    ) {
      // Update stuff that can be updated before recreating the geometry
      obj.material.color.set(item.color);

      // Calculate all the points based on the sample count
      // We need to create a new curve here
      const points = [];
      for (let i = 0; i < item.samples; i++) {
        const t =
          item.tStart + ((item.tEnd - item.tStart) * i) / (item.samples - 1);
        const point = item.f(t);
        points.push(new THREE.Vector3(point.x, point.y, point.z));
      }
      const curve = new THREE.CatmullRomCurve3(points);

      // Update geometry (basically like the Line3D example)
      const oldGeometry = obj.geometry;
      const geometry = new THREE.TubeGeometry(
        curve,
        item.samples,
        item.thickness / 20,
        8,
        false
      );
      obj.curve = curve;
      obj.geometry = geometry;
      obj.mesh.geometry = geometry;
      oldGeometry.dispose();
    }
  }

  requestRender() {
    if (!this.frameScheduled) {
      this.frameScheduled = true;
      requestAnimationFrame(() => this.render());
    }
  }

  render() {
    console.log("rendering");
    this.frameScheduled = false;
    this.sizer.applyIfNeeded();
    const cameraUpdated = this.threeOrbitControls.update();
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

// Resize helper
function createResponsiveThreeSizer({
  container,
  renderer,
  camera,
  invalidate,
  maxDpr = 2,
}: {
  container: HTMLElement;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  invalidate: () => void;
  maxDpr: number;
}) {
  let pending = true;
  let pendingW = 1;
  let pendingH = 1;
  let lastW = 0;
  let lastH = 0;
  let lastDpr = window.devicePixelRatio;

  function measure() {
    const rect = container.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    if (w <= 0 || h <= 0) return false;
    pendingW = w;
    pendingH = h;
    pending = true;
    return true;
  }

  const ro = new ResizeObserver(() => {
    if (measure()) invalidate();
  });
  ro.observe(container);

  function applyIfNeeded() {
    // DPR changes (zoom / different monitor) won’t trigger ResizeObserver reliably
    const dpr = window.devicePixelRatio;
    if (dpr !== lastDpr) {
      lastDpr = dpr;
      renderer.setPixelRatio(Math.min(dpr, maxDpr));
      measure();
      pending = true;
      invalidate();
    }

    if (!pending) return false;
    if (pendingW === lastW && pendingH === lastH) {
      pending = false;
      return false;
    }

    renderer.setSize(pendingW, pendingH, false);

    // Perspective camera
    if (camera && camera.isPerspectiveCamera) {
      camera.aspect = pendingW / pendingH;
      camera.updateProjectionMatrix();
    }

    // TODO: Handle orthographic camera
    // if (camera && camera.isOrthographicCamera) { recompute frustum }

    lastW = pendingW;
    lastH = pendingH;
    pending = false;

    // onSize?.(lastW, lastH);
    return true;
  }

  function dispose() {
    ro.disconnect();
  }

  // Initialize measured size once
  measure();

  return { applyIfNeeded, dispose };
}
