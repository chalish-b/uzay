import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import type { ItemSnapshot } from "../types/item-registry";
import type { Circle2DStrokeObject, ItemRenderer, ThreeSceneTypes } from "./shared";
import { Z_REGION, Z_REGION_STROKE } from "./shared";
import { checkedColor } from "../../shared/types/colors";

// Tessellation of both the disk fill and the outline polyline. High enough that
// a viewport-filling circle reads as smooth, cheap enough to rebuild on drag.
const SEGMENTS = 128;

function buildFillGeometry(radius: number): THREE.CircleGeometry {
  return new THREE.CircleGeometry(radius, SEGMENTS);
}

function buildStrokeGeometry(radius: number): LineGeometry {
  const positions: number[] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const theta = (i / SEGMENTS) * Math.PI * 2;
    positions.push(Math.cos(theta) * radius, Math.sin(theta) * radius, 0);
  }
  const geometry = new LineGeometry();
  geometry.setPositions(positions);
  return geometry;
}

function shouldShowStroke(item: ItemSnapshot<"circle2d">): boolean {
  return item.strokeThickness > 0 && item.strokeOpacity > 0;
}

function createStroke(item: ItemSnapshot<"circle2d">): Circle2DStrokeObject | null {
  if (!shouldShowStroke(item)) return null;

  const geometry = buildStrokeGeometry(item.radius);
  const material = new LineMaterial({
    color: checkedColor(item.strokeColor, "Circle2D.strokeColor"),
    linewidth: item.strokeThickness,
    transparent: item.strokeOpacity < 1,
    opacity: item.strokeOpacity,
  });
  const mesh = new Line2(geometry, material);
  mesh.position.set(item.center.x, item.center.y, Z_REGION_STROKE);
  mesh.visible = item.visible;
  mesh.userData.itemId = item.id;
  return { geometry, material, mesh };
}

function disposeStroke(
  stroke: Circle2DStrokeObject | null,
  threeScene: THREE.Object3D
): void {
  if (!stroke) return;
  threeScene.remove(stroke.mesh);
  stroke.geometry.dispose();
  stroke.material.dispose();
}

export const circle2dRenderer: ItemRenderer<"circle2d"> = {
  create(
    item: ItemSnapshot<"circle2d">,
    threeScene: THREE.Object3D
  ): ThreeSceneTypes["circle2d"] {
    const geometry = buildFillGeometry(item.radius);
    const material = new THREE.MeshBasicMaterial({
      color: checkedColor(item.color, "Circle2D.color"),
      opacity: item.opacity,
      transparent: item.opacity < 1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(item.center.x, item.center.y, Z_REGION);
    mesh.visible = item.visible;
    mesh.userData.itemId = item.id;
    threeScene.add(mesh);

    const stroke = createStroke(item);
    if (stroke) threeScene.add(stroke.mesh);

    return { kind: "circle2d", geometry, material, mesh, stroke };
  },

  update(item: ItemSnapshot<"circle2d">, obj: ThreeSceneTypes["circle2d"], threeScene): void {
    obj.material.color.set(checkedColor(item.color, "Circle2D.color"));
    obj.material.opacity = item.opacity;
    obj.material.transparent = item.opacity < 1;
    obj.material.needsUpdate = true;
    obj.mesh.visible = item.visible;
    obj.mesh.position.set(item.center.x, item.center.y, Z_REGION);

    obj.geometry.dispose();
    obj.geometry = buildFillGeometry(item.radius);
    obj.mesh.geometry = obj.geometry;

    disposeStroke(obj.stroke, threeScene);
    obj.stroke = createStroke(item);
    if (obj.stroke) threeScene.add(obj.stroke.mesh);
  },

  dispose(obj: ThreeSceneTypes["circle2d"], threeScene: THREE.Object3D): void {
    threeScene.remove(obj.mesh);
    obj.geometry.dispose();
    obj.material.dispose();

    disposeStroke(obj.stroke, threeScene);
  },
};
