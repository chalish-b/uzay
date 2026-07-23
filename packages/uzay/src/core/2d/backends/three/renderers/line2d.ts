import * as THREE from "three";
import type { ItemSnapshot } from "../../../types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./shared";
import { buildUnitHeadGeometry, onHeadBeforeRender, Z_DEFAULT } from "./shared";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { chainOnBeforeRender } from "../screen-space";
import { checkedColor } from "../../../../shared/types/colors";
import { dashPatternPx } from "../../../../shared/math/dash-pattern";
import {
  ANNOTATION_HEAD_LENGTH,
  ANNOTATION_HEAD_WIDTH,
} from "../../../math/arrow-math";

function buildLineGeometry(
  start: { x: number; y: number },
  end: { x: number; y: number }
): LineGeometry {
  const geom = new LineGeometry();
  geom.setPositions([start.x, start.y, Z_DEFAULT, end.x, end.y, Z_DEFAULT]);
  return geom;
}

// dashSize/gapSize are compared against the line distance scaled by dashScale.
// The distances are world units (computeLineDistances), and layout() sets
// dashScale to pixels-per-world-unit, so the pattern here is CSS pixels: the
// same unit as linewidth, constant on screen at any zoom.
function applyDash(material: LineMaterial, item: ItemSnapshot<"line2d">): void {
  material.dashed = item.dashed;
  if (item.dashed) {
    const { dashPx, gapPx } = dashPatternPx(item.thickness);
    material.dashSize = dashPx;
    material.gapSize = gapPx;
  }
  material.needsUpdate = true;
}

// The end arrowheads: unit meshes at the endpoints, rotated outward along the
// line and scaled to pixel size per frame like vector2d's head. An excluded
// mode or a degenerate segment hides them.
function applyHeads(
  item: ItemSnapshot<"line2d">,
  obj: ThreeSceneTypes["line2d"]
): void {
  const dx = item.end.x - item.start.x;
  const dy = item.end.y - item.start.y;
  const degenerate = Math.hypot(dx, dy) < 1e-9;
  const angle = Math.atan2(dy, dx);

  obj.headEndMesh.visible =
    !degenerate && (item.arrows === "end" || item.arrows === "both");
  obj.headEndMesh.position.set(item.end.x, item.end.y, Z_DEFAULT);
  obj.headEndMesh.rotation.z = angle;

  obj.headStartMesh.visible =
    !degenerate && (item.arrows === "start" || item.arrows === "both");
  obj.headStartMesh.position.set(item.start.x, item.start.y, Z_DEFAULT);
  obj.headStartMesh.rotation.z = angle + Math.PI;
}

export const line2dRenderer: ItemRenderer<"line2d"> = {
  create(
    item: ItemSnapshot<"line2d">,
    threeScene: THREE.Object3D
  ): ThreeSceneTypes["line2d"] {
    const geometry = buildLineGeometry(item.start, item.end);
    const material = new LineMaterial({
      color: checkedColor(item.color, "Line2D.color"),
      linewidth: item.thickness,
      transparent: item.opacity < 1,
      opacity: item.opacity,
    });
    applyDash(material, item);
    const mesh = new Line2(geometry, material);
    if (item.dashed) mesh.computeLineDistances();
    mesh.userData.itemId = item.id;

    const headGeometry = buildUnitHeadGeometry();
    const headMaterial = new THREE.MeshBasicMaterial({
      color: checkedColor(item.color, "Line2D.color"),
      transparent: item.opacity < 1,
      opacity: item.opacity,
    });
    const makeHead = () => {
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.userData.itemId = item.id;
      head.userData.headLength = ANNOTATION_HEAD_LENGTH;
      head.userData.headWidth = ANNOTATION_HEAD_WIDTH;
      chainOnBeforeRender(head, onHeadBeforeRender);
      return head;
    };
    const headStartMesh = makeHead();
    const headEndMesh = makeHead();

    const group = new THREE.Group();
    group.add(mesh);
    group.add(headStartMesh);
    group.add(headEndMesh);
    group.visible = item.visible;
    threeScene.add(group);

    const obj: ThreeSceneTypes["line2d"] = {
      kind: "line2d",
      group,
      geometry,
      material,
      mesh,
      headGeometry,
      headMaterial,
      headStartMesh,
      headEndMesh,
    };
    applyHeads(item, obj);
    return obj;
  },

  update(item: ItemSnapshot<"line2d">, obj: ThreeSceneTypes["line2d"]): void {
    obj.material.color.set(checkedColor(item.color, "Line2D.color"));
    obj.material.linewidth = item.thickness;
    obj.material.opacity = item.opacity;
    obj.material.transparent = item.opacity < 1;
    applyDash(obj.material, item);
    obj.headMaterial.color.set(checkedColor(item.color, "Line2D.color"));
    obj.headMaterial.opacity = item.opacity;
    obj.headMaterial.transparent = item.opacity < 1;
    obj.group.visible = item.visible;

    obj.geometry.dispose();
    const next = buildLineGeometry(item.start, item.end);
    obj.mesh.geometry = next;
    (obj as { geometry: LineGeometry }).geometry = next;
    if (item.dashed) obj.mesh.computeLineDistances();

    applyHeads(item, obj);
  },

  layout(item: ItemSnapshot<"line2d">, obj: ThreeSceneTypes["line2d"], ctx): void {
    if (!item.dashed || ctx.viewport.worldPerPixel <= 0) return;
    obj.material.dashScale = 1 / ctx.viewport.worldPerPixel;
  },

  dispose(obj: ThreeSceneTypes["line2d"], threeScene: THREE.Object3D): void {
    threeScene.remove(obj.group);
    obj.geometry.dispose();
    obj.material.dispose();
    obj.headGeometry.dispose();
    obj.headMaterial.dispose();
  },
};
