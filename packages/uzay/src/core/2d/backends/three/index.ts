import * as THREE from "three";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import type { ViewBackend2D } from "../../backend";
import type { ItemId } from "../../types/item-registry";
import type { Viewport2D } from "../../types/view-context";
import { rendererRegistry, type ThreeSceneTypes } from "./renderers";

// The WebGL backend: items render as three.js meshes on a canvas, labels as
// DOM elements through a CSS2DRenderer stacked on top.
export const threeBackend: ViewBackend2D<ThreeSceneTypes, THREE.Object3D> = {
  mount(host: HTMLElement) {
    const threeScene = new THREE.Scene();

    // Frustum and position are set by syncCamera before the first present.
    const threeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    threeCamera.position.set(0, 0, 10);
    threeCamera.lookAt(0, 0, 0);

    const threeRenderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    threeRenderer.domElement.style.position = "absolute";
    threeRenderer.domElement.style.inset = "0";
    threeRenderer.domElement.style.width = "100%";
    threeRenderer.domElement.style.height = "100%";
    threeRenderer.domElement.style.display = "block";

    const existingCanvas = host.querySelector("canvas");
    if (existingCanvas) {
      console.warn(
        `[View2D] Container already has a canvas element. This usually means a previous View2D was not disposed properly, which can cause rendering issues like overlapping scenes.\n\n` +
        `To fix this, call view.dispose() in your cleanup function.`
      );
    }

    host.appendChild(threeRenderer.domElement);

    const css2dRenderer = new CSS2DRenderer();
    css2dRenderer.domElement.style.position = "absolute";
    css2dRenderer.domElement.style.inset = "0";
    css2dRenderer.domElement.style.pointerEvents = "none";
    host.appendChild(css2dRenderer.domElement);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let cssSize = { width: 0, height: 0 };

    return {
      eventTarget: threeRenderer.domElement,
      renderers: rendererRegistry,

      createItemContainer(): THREE.Object3D {
        const group = new THREE.Group();
        threeScene.add(group);
        return group;
      },

      removeItemContainer(_id: ItemId, container: THREE.Object3D): void {
        threeScene.remove(container);
      },

      // Toggle the per-item group (which culls its WebGL meshes) and each
      // CSS2D label inside it (CSS2DRenderer ignores an ancestor's
      // visibility, so it needs its own flag set).
      setItemVisible(container: THREE.Object3D, visible: boolean): void {
        container.visible = visible;
        container.traverse((obj) => {
          if ((obj as { isCSS2DObject?: boolean }).isCSS2DObject) {
            obj.visible = visible;
          }
        });
      },

      hitTest(
        event: PointerEvent,
        isHittable: (id: ItemId) => boolean
      ): ItemId | null {
        const rect = threeRenderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(pointer, threeCamera);
        const intersects = raycaster.intersectObjects(threeScene.children, true);

        for (const hit of intersects) {
          let obj: THREE.Object3D | null = hit.object;
          while (obj) {
            if (obj.userData.itemId) {
              const itemId = obj.userData.itemId as ItemId;
              if (!isHittable(itemId)) break;
              return itemId;
            }
            obj = obj.parent;
          }
        }
        return null;
      },

      resize(widthPx: number, heightPx: number): void {
        const currentSize = threeRenderer.getSize(new THREE.Vector2());
        if (currentSize.x !== widthPx || currentSize.y !== heightPx) {
          threeRenderer.setSize(widthPx, heightPx, false);
        }
        if (cssSize.width !== widthPx || cssSize.height !== heightPx) {
          css2dRenderer.setSize(widthPx, heightPx);
          cssSize = { width: widthPx, height: heightPx };
        }
      },

      // The viewport's visible bounds carry the zoom, so the camera keeps
      // zoom = 1 and takes the zoomed half-extents as its frustum. Same
      // projection matrix as a base frustum with camera.zoom applied.
      syncCamera(viewport: Viewport2D): void {
        const { left, right, bottom, top } = viewport.visibleWorldBounds;
        const cx = viewport.center.x;
        const cy = viewport.center.y;
        const halfW = (right - left) / 2;
        const halfH = (top - bottom) / 2;

        if (threeCamera.position.x !== cx || threeCamera.position.y !== cy) {
          threeCamera.position.set(cx, cy, 10);
          threeCamera.lookAt(cx, cy, 0);
        }
        if (
          threeCamera.left !== -halfW ||
          threeCamera.right !== halfW ||
          threeCamera.top !== halfH ||
          threeCamera.bottom !== -halfH
        ) {
          threeCamera.left = -halfW;
          threeCamera.right = halfW;
          threeCamera.top = halfH;
          threeCamera.bottom = -halfH;
          threeCamera.updateProjectionMatrix();
        }
      },

      present(): void {
        threeRenderer.render(threeScene, threeCamera);
        css2dRenderer.render(threeScene, threeCamera);
      },

      dispose(): void {
        threeRenderer.forceContextLoss();
        threeRenderer.dispose();
        if (threeRenderer.domElement.parentNode === host) {
          host.removeChild(threeRenderer.domElement);
        }
        if (css2dRenderer.domElement.parentNode === host) {
          host.removeChild(css2dRenderer.domElement);
        }
      },
    };
  },
};
