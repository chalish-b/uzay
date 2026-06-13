import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import type { ItemSnapshot } from "../types/item-registry";
import type { ItemRenderer, Region2DStrokeObject, ThreeSceneTypes } from "./shared";
import { Z_REGION, Z_REGION_STROKE } from "./shared";
import { checkedColor } from "../../shared/types/colors";
import type { Region2DPoints } from "../items/region2d";
import type { Vec2 } from "../../shared/types/vec2";

const MIN_POINTS = 3;

function normalizePolygons(points: Region2DPoints): readonly Vec2[][] {
  if (points.length === 0) return [];
  return Array.isArray(points[0]) ? (points as Vec2[][]) : [points as Vec2[]];
}

function buildFillGeometry(points: Region2DPoints): THREE.ShapeGeometry {
  const shapes: THREE.Shape[] = [];

  for (const polygon of normalizePolygons(points)) {
    if (polygon.length < MIN_POINTS) continue;

    const shape = new THREE.Shape();
    shape.moveTo(polygon[0].x, polygon[0].y);
    for (let i = 1; i < polygon.length; i++) {
      shape.lineTo(polygon[i].x, polygon[i].y);
    }
    shape.closePath();
    shapes.push(shape);
  }

  if (shapes.length === 0) return new THREE.ShapeGeometry();
  return new THREE.ShapeGeometry(shapes);
}

function buildStrokeGeometry(polygon: readonly Vec2[]): LineGeometry {
  const positions: number[] = [];
  for (const point of polygon) {
    positions.push(point.x, point.y, Z_REGION_STROKE);
  }
  positions.push(polygon[0].x, polygon[0].y, Z_REGION_STROKE);

  const geometry = new LineGeometry();
  geometry.setPositions(positions);
  return geometry;
}

function shouldShowStroke(item: ItemSnapshot<"region2d">): boolean {
  return item.strokeThickness > 0 && item.strokeOpacity > 0;
}

function createStrokes(item: ItemSnapshot<"region2d">): Region2DStrokeObject[] {
  if (!shouldShowStroke(item)) return [];

  const strokes: Region2DStrokeObject[] = [];
  for (const polygon of normalizePolygons(item.points)) {
    if (polygon.length < 2) continue;

    const geometry = buildStrokeGeometry(polygon);
    const material = new LineMaterial({
      color: checkedColor(item.strokeColor, "Region2D.strokeColor"),
      linewidth: item.strokeThickness,
      transparent: item.strokeOpacity < 1,
      opacity: item.strokeOpacity,
    });
    const mesh = new Line2(geometry, material);
    mesh.visible = item.visible;
    mesh.userData.itemId = item.id;
    strokes.push({ geometry, material, mesh });
  }
  return strokes;
}

function disposeStrokes(strokes: Region2DStrokeObject[], threeScene: THREE.Object3D): void {
  for (const stroke of strokes) {
    threeScene.remove(stroke.mesh);
    stroke.geometry.dispose();
    stroke.material.dispose();
  }
}

export const region2dRenderer: ItemRenderer<"region2d"> = {
  create(
    item: ItemSnapshot<"region2d">,
    threeScene: THREE.Object3D
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

    const strokes = createStrokes(item);
    for (const stroke of strokes) threeScene.add(stroke.mesh);

    return {
      kind: "region2d",
      geometry,
      material,
      mesh,
      strokes,
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

    disposeStrokes(obj.strokes, threeScene);
    obj.strokes = createStrokes(item);
    for (const stroke of obj.strokes) threeScene.add(stroke.mesh);
  },

  dispose(obj: ThreeSceneTypes["region2d"], threeScene: THREE.Object3D): void {
    threeScene.remove(obj.mesh);
    obj.geometry.dispose();
    obj.material.dispose();

    disposeStrokes(obj.strokes, threeScene);
  },
};
