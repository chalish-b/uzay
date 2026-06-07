import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import type { ItemSnapshot } from "../types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./index";
import { Z_REGION, Z_REGION_STROKE } from "./index";
import { checkedColor } from "../../shared/types/colors";

const MIN_POINTS = 3;

function buildFillGeometry(points: readonly { x: number; y: number }[]): THREE.ShapeGeometry {
  if (points.length < MIN_POINTS) return new THREE.ShapeGeometry();

  const shape = new THREE.Shape();
  shape.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i].x, points[i].y);
  }
  shape.closePath();

  return new THREE.ShapeGeometry(shape);
}

function buildStrokeGeometry(points: readonly { x: number; y: number }[]): LineGeometry {
  const positions: number[] = [];
  if (points.length >= 2) {
    for (const point of points) {
      positions.push(point.x, point.y, Z_REGION_STROKE);
    }
    positions.push(points[0].x, points[0].y, Z_REGION_STROKE);
  }

  const geometry = new LineGeometry();
  geometry.setPositions(positions);
  return geometry;
}

function shouldShowStroke(item: ItemSnapshot<"region2d">): boolean {
  return item.strokeThickness > 0 && item.strokeOpacity > 0;
}

function createStroke(
  item: ItemSnapshot<"region2d">
): {
  geometry: LineGeometry;
  material: LineMaterial;
  mesh: Line2;
} | null {
  if (!shouldShowStroke(item)) return null;

  const geometry = buildStrokeGeometry(item.points);
  const material = new LineMaterial({
    color: checkedColor(item.strokeColor, "Region2D.strokeColor"),
    linewidth: item.strokeThickness,
    transparent: item.strokeOpacity < 1,
    opacity: item.strokeOpacity,
  });
  const mesh = new Line2(geometry, material);
  mesh.visible = item.visible;
  mesh.userData.itemId = item.id;
  return { geometry, material, mesh };
}

export const region2dRenderer: ItemRenderer<"region2d"> = {
  create(
    item: ItemSnapshot<"region2d">,
    threeScene: THREE.Scene
  ): ThreeSceneTypes["region2d"] {
    const geometry = buildFillGeometry(item.points);
    const material = new THREE.MeshBasicMaterial({
      color: checkedColor(item.color, "Region2D.color"),
      opacity: item.opacity,
      transparent: item.opacity < 1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = Z_REGION;
    mesh.visible = item.visible;
    mesh.userData.itemId = item.id;
    threeScene.add(mesh);

    const stroke = createStroke(item);
    if (stroke) threeScene.add(stroke.mesh);

    return {
      kind: "region2d",
      geometry,
      material,
      mesh,
      strokeGeometry: stroke?.geometry ?? null,
      strokeMaterial: stroke?.material ?? null,
      strokeMesh: stroke?.mesh ?? null,
    };
  },

  update(item: ItemSnapshot<"region2d">, obj: ThreeSceneTypes["region2d"], threeScene): void {
    obj.material.color.set(checkedColor(item.color, "Region2D.color"));
    obj.material.opacity = item.opacity;
    obj.material.transparent = item.opacity < 1;
    obj.material.needsUpdate = true;
    obj.mesh.visible = item.visible;

    obj.geometry.dispose();
    obj.geometry = buildFillGeometry(item.points);
    obj.mesh.geometry = obj.geometry;

    if (obj.strokeMesh) threeScene.remove(obj.strokeMesh);
    obj.strokeGeometry?.dispose();
    obj.strokeMaterial?.dispose();

    const stroke = createStroke(item);
    if (stroke) threeScene.add(stroke.mesh);
    obj.strokeGeometry = stroke?.geometry ?? null;
    obj.strokeMaterial = stroke?.material ?? null;
    obj.strokeMesh = stroke?.mesh ?? null;
  },

  dispose(obj: ThreeSceneTypes["region2d"], threeScene: THREE.Scene): void {
    threeScene.remove(obj.mesh);
    obj.geometry.dispose();
    obj.material.dispose();

    if (obj.strokeMesh) threeScene.remove(obj.strokeMesh);
    obj.strokeGeometry?.dispose();
    obj.strokeMaterial?.dispose();
  },
};
