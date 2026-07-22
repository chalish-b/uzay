import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import type { ItemSnapshot } from "../../../types/item-registry";
import type { Circle2DStrokeObject, ItemRenderer, ThreeSceneTypes } from "./shared";
import { Z_REGION, Z_REGION_STROKE } from "./shared";
import { checkedColor } from "../../../../shared/types/colors";
import { dashPatternPx } from "../../../../shared/math/dash-pattern";

// Tessellation of a full circle's disk fill and outline polyline. High enough
// that a viewport-filling circle reads as smooth, cheap enough to rebuild on
// drag. An arc uses a slice of this, proportional to its span.
const FULL_SEGMENTS = 128;

function arcSegments(thetaStart: number, thetaEnd: number): number {
  const frac = Math.min(1, Math.abs(thetaEnd - thetaStart) / (Math.PI * 2));
  return Math.max(2, Math.ceil(FULL_SEGMENTS * frac));
}

function buildFillGeometry(
  radius: number,
  thetaStart: number,
  thetaEnd: number
): THREE.CircleGeometry {
  // A full span gives the whole disk; a partial span gives the sector wedge,
  // since CircleGeometry fans out from the center vertex.
  return new THREE.CircleGeometry(
    radius,
    arcSegments(thetaStart, thetaEnd),
    thetaStart,
    thetaEnd - thetaStart
  );
}

function buildStrokeGeometry(
  radius: number,
  thetaStart: number,
  thetaEnd: number
): LineGeometry {
  // Just the arc curve from thetaStart to thetaEnd. A full span closes on
  // itself into the whole ring; a partial span leaves the arc open.
  const segments = arcSegments(thetaStart, thetaEnd);
  const positions: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const theta = thetaStart + (thetaEnd - thetaStart) * (i / segments);
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

  const geometry = buildStrokeGeometry(item.radius, item.thetaStart, item.thetaEnd);
  const material = new LineMaterial({
    color: checkedColor(item.strokeColor, "Circle2D.strokeColor"),
    linewidth: item.strokeThickness,
    transparent: item.strokeOpacity < 1,
    opacity: item.strokeOpacity,
  });
  // Same pixel-unit dash setup as line2d: pattern from the thickness here,
  // dashScale from the zoom in layout().
  material.dashed = item.strokeDashed;
  if (item.strokeDashed) {
    const { dashPx, gapPx } = dashPatternPx(item.strokeThickness);
    material.dashSize = dashPx;
    material.gapSize = gapPx;
  }
  const mesh = new Line2(geometry, material);
  if (item.strokeDashed) mesh.computeLineDistances();
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
    const geometry = buildFillGeometry(item.radius, item.thetaStart, item.thetaEnd);
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
    obj.geometry = buildFillGeometry(item.radius, item.thetaStart, item.thetaEnd);
    obj.mesh.geometry = obj.geometry;

    disposeStroke(obj.stroke, threeScene);
    obj.stroke = createStroke(item);
    if (obj.stroke) threeScene.add(obj.stroke.mesh);
  },

  layout(item: ItemSnapshot<"circle2d">, obj: ThreeSceneTypes["circle2d"], ctx): void {
    if (!item.strokeDashed || !obj.stroke || ctx.viewport.worldPerPixel <= 0) return;
    obj.stroke.material.dashScale = 1 / ctx.viewport.worldPerPixel;
  },

  dispose(obj: ThreeSceneTypes["circle2d"], threeScene: THREE.Object3D): void {
    threeScene.remove(obj.mesh);
    obj.geometry.dispose();
    obj.material.dispose();

    disposeStroke(obj.stroke, threeScene);
  },
};
