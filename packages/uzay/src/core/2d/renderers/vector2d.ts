import * as THREE from "three";
import type { ItemSnapshot } from "../types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./index";
import { Z_DEFAULT } from "./index";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { getWorldPerPixel, chainOnBeforeRender } from "../types/screen-space";
import { checkedColor } from "../../shared/types/colors";

// Layout: shaft and head share a Group whose +x axis points along the vector
// (group.rotation.z = atan2(vector.y, vector.x)). The shaft runs from the
// origin to (length, 0). The head's tip sits at (length, 0) and its base
// extends BACKWARD by `headLength` pixels — so the head's pointy end stays
// at the vector's mathematical tip while the wide base scales in screen
// pixels via onBeforeRender. The shaft passing through the head's base is
// hidden by the filled triangle since the head sits at z=0.001.

// Unit head pointing along +x: tip at origin, base at (-1, ±0.5).
function buildUnitHeadGeometry(): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [0, 0, 0.001, -1, 0.5, 0.001, -1, -0.5, 0.001],
      3
    )
  );
  geom.setIndex([0, 1, 2]);
  return geom;
}

function buildShaftGeometry(length: number): LineGeometry {
  const geom = new LineGeometry();
  geom.setPositions([0, 0, 0, length, 0, 0]);
  return geom;
}

function applyTransform(
  group: THREE.Group,
  headMesh: THREE.Mesh,
  origin: { x: number; y: number },
  vector: { x: number; y: number }
) {
  group.position.set(origin.x, origin.y, Z_DEFAULT);
  const len = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  if (len < 1e-9) {
    group.rotation.z = 0;
    headMesh.visible = false;
    return;
  }
  group.rotation.z = Math.atan2(vector.y, vector.x);
  headMesh.position.x = len;
  headMesh.visible = true;
}

export const vector2dRenderer: ItemRenderer<"vector2d"> = {
  create(
    item: ItemSnapshot<"vector2d">,
    threeScene: THREE.Scene
  ): ThreeSceneTypes["vector2d"] {
    const length = Math.sqrt(item.vector.x * item.vector.x + item.vector.y * item.vector.y);

    const shaftGeometry = buildShaftGeometry(length);
    const shaftMaterial = new LineMaterial({
      color: checkedColor(item.color, "Vector2D.color"),
      linewidth: item.thickness,
    });
    const shaftMesh = new Line2(shaftGeometry, shaftMaterial);

    const headGeometry = buildUnitHeadGeometry();
    const headMaterial = new THREE.MeshBasicMaterial({
      color: checkedColor(item.color, "Vector2D.color"),
    });
    const headMesh = new THREE.Mesh(headGeometry, headMaterial);
    headMesh.userData.itemId = item.id;
    headMesh.userData.headLength = item.headLength;
    headMesh.userData.headWidth = item.headWidth;
    chainOnBeforeRender(headMesh, onHeadBeforeRender);

    const group = new THREE.Group();
    group.add(shaftMesh);
    group.add(headMesh);

    applyTransform(group, headMesh, item.origin, item.vector);
    group.visible = item.visible;
    threeScene.add(group);

    return {
      kind: "vector2d",
      group,
      shaftGeometry,
      shaftMaterial,
      shaftMesh,
      headGeometry,
      headMaterial,
      headMesh,
    };
  },

  update(item: ItemSnapshot<"vector2d">, obj: ThreeSceneTypes["vector2d"]): void {
    obj.shaftMaterial.color.set(checkedColor(item.color, "Vector2D.color"));
    obj.shaftMaterial.linewidth = item.thickness;
    obj.shaftMaterial.needsUpdate = true;
    obj.headMaterial.color.set(checkedColor(item.color, "Vector2D.color"));
    obj.group.visible = item.visible;

    obj.headMesh.userData.headLength = item.headLength;
    obj.headMesh.userData.headWidth = item.headWidth;

    const length = Math.sqrt(item.vector.x * item.vector.x + item.vector.y * item.vector.y);

    // Shaft length depends on the vector magnitude in world units, so we still
    // rebuild geometry on snapshot change. Head is unit-sized and only
    // repositions along the new tip — its scale is updated per-frame.
    obj.shaftGeometry.dispose();
    const shaftGeometry = buildShaftGeometry(length);
    obj.shaftMesh.geometry = shaftGeometry;
    (obj as { shaftGeometry: LineGeometry }).shaftGeometry = shaftGeometry;

    applyTransform(obj.group, obj.headMesh, item.origin, item.vector);
  },

  dispose(obj: ThreeSceneTypes["vector2d"], threeScene: THREE.Scene): void {
    threeScene.remove(obj.group);
    obj.shaftGeometry.dispose();
    obj.shaftMaterial.dispose();
    obj.headGeometry.dispose();
    obj.headMaterial.dispose();
  },
};

function onHeadBeforeRender(
  this: THREE.Object3D,
  renderer: THREE.WebGLRenderer,
  camera: THREE.Camera
) {
  if (!(camera as THREE.OrthographicCamera).isOrthographicCamera) return;
  const wpp = getWorldPerPixel(renderer, camera as THREE.OrthographicCamera);
  const sx = (this.userData.headLength as number) * wpp;
  const sy = (this.userData.headWidth as number) * wpp;
  this.scale.set(sx, sy, 1);
}
