import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import type { ItemSnapshot } from "../../../types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./shared";
import { Z_DEFAULT } from "./shared";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { checkedColor } from "../../../../shared/types/colors";
import type { Viewport2D } from "../../../types/view-context";
import type { Vec2 } from "../../../../shared/types/vec2";
import { arrowEndSkips, buildTickPositions } from "../../../math/axes-math";
import {
  NUMBER_LINE_LABEL_OFFSET_PX,
  getNumberLineTickStep,
  numberLineDirection,
  numberLineNormal,
  numberLineValueToWorld,
} from "../../../math/number-line-math";
import { hasArrowAt } from "../../../../shared/types/arrows";
import { createNumberLineTickLabel } from "../../../overlay-dom";

// Everything about the number line (tick spacing, ornament sizes, label
// offsets) depends on the viewport, so all geometry builds in layout() and
// rebuilds when the layout key changes. Geometry is authored in absolute
// world coordinates; no before-render scaling hooks are needed because the
// key includes worldPerPixel.

type Obj = ThreeSceneTypes["numberline2d"];

function valueToWorld(item: ItemSnapshot<"numberline2d">, value: number): Vec2 {
  return numberLineValueToWorld(item.position, item.angle, item.scale, value);
}

function disposeAll(obj: Obj, container: THREE.Object3D): void {
  if (obj.line) {
    container.remove(obj.line.mesh);
    obj.line.geometry.dispose();
    obj.line.material.dispose();
    obj.line = null;
  }
  if (obj.ticks) {
    container.remove(obj.ticks.mesh);
    obj.ticks.geometry.dispose();
    obj.ticks.material.dispose();
    obj.ticks = null;
  }
  for (const key of ["arrowStart", "arrowEnd"] as const) {
    const arrow = obj[key];
    if (!arrow) continue;
    container.remove(arrow.mesh);
    arrow.geometry.dispose();
    arrow.material.dispose();
    obj[key] = null;
  }
  for (const label of obj.labels) {
    container.remove(label.cssObject);
    label.cssObject.element.remove();
  }
  obj.labels = [];
}

function rebuild(
  item: ItemSnapshot<"numberline2d">,
  viewport: Viewport2D,
  obj: Obj,
  container: THREE.Object3D
): void {
  disposeAll(obj, container);
  if (!item.visible) return;

  const wpp = viewport.worldPerPixel;
  const dir = numberLineDirection(item.angle);
  const normal = numberLineNormal(item.angle);
  const start = valueToWorld(item, item.range[0]);
  const end = valueToWorld(item, item.range[1]);
  const step = getNumberLineTickStep(item.tickStep, viewport, item.scale);
  const color = checkedColor(item.color, "NumberLine2D.color");

  const lineGeometry = new LineGeometry();
  lineGeometry.setPositions([start.x, start.y, Z_DEFAULT, end.x, end.y, Z_DEFAULT]);
  const lineMaterial = new LineMaterial({ color, linewidth: item.thickness });
  const lineMesh = new Line2(lineGeometry, lineMaterial);
  lineMesh.userData.itemId = item.id;
  container.add(lineMesh);
  obj.line = { geometry: lineGeometry, material: lineMaterial, mesh: lineMesh };

  const skip = arrowEndSkips(item.range, item.arrows);

  if (item.tickmarks) {
    const half = (item.tickLength / 2) * wpp;
    const positions: number[] = [];
    for (const value of buildTickPositions(item.range, step, skip)) {
      const p = valueToWorld(item, value);
      positions.push(
        p.x + normal.x * half, p.y + normal.y * half, Z_DEFAULT,
        p.x - normal.x * half, p.y - normal.y * half, Z_DEFAULT
      );
    }
    const tickGeometry = new LineSegmentsGeometry();
    tickGeometry.setPositions(positions);
    const tickMaterial = new LineMaterial({ color, linewidth: item.thickness });
    const tickMesh = new LineSegments2(tickGeometry, tickMaterial);
    tickMesh.userData.itemId = item.id;
    container.add(tickMesh);
    obj.ticks = { geometry: tickGeometry, material: tickMaterial, mesh: tickMesh };
  }

  // Arrowheads in absolute world coordinates: base corners at the endpoint,
  // tip extending outward along the line.
  const lengthWorld = item.headLength * wpp;
  const halfWidthWorld = (item.headWidth / 2) * wpp;
  const heads: { key: "arrowStart" | "arrowEnd"; at: Vec2; sign: 1 | -1 }[] = [
    { key: "arrowEnd", at: end, sign: 1 },
    { key: "arrowStart", at: start, sign: -1 },
  ];
  for (const head of heads) {
    const which = head.key === "arrowEnd" ? "end" : "start";
    if (!hasArrowAt(item.arrows, which)) continue;
    const tip = {
      x: head.at.x + dir.x * lengthWorld * head.sign,
      y: head.at.y + dir.y * lengthWorld * head.sign,
    };
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [
          tip.x, tip.y, Z_DEFAULT,
          head.at.x + normal.x * halfWidthWorld, head.at.y + normal.y * halfWidthWorld, Z_DEFAULT,
          head.at.x - normal.x * halfWidthWorld, head.at.y - normal.y * halfWidthWorld, Z_DEFAULT,
        ],
        3
      )
    );
    geometry.setIndex([0, 1, 2]);
    // DoubleSide like the other 2D fills: the start head's triangle winds the
    // other way and would be back-face culled otherwise.
    const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.itemId = item.id;
    container.add(mesh);
    obj[head.key] = { geometry, material, mesh };
  }

  if (!item.labels) return;

  const labelOffset = normal.scale(-NUMBER_LINE_LABEL_OFFSET_PX * wpp);
  for (const value of buildTickPositions(item.range, step, skip)) {
    const world = valueToWorld(item, value).add(labelOffset);
    const { wrapper, element } = createNumberLineTickLabel(item, value, step);
    const cssObject = new CSS2DObject(wrapper);
    cssObject.position.set(world.x, world.y, Z_DEFAULT);
    container.add(cssObject);
    obj.labels.push({ cssObject, element });
  }
}

export const numberLine2dRenderer: ItemRenderer<"numberline2d"> = {
  create(): Obj {
    return {
      kind: "numberline2d",
      line: null,
      ticks: null,
      arrowStart: null,
      arrowEnd: null,
      labels: [],
      layoutKey: null,
    };
  },

  update(_item, obj): void {
    obj.layoutKey = null;
  },

  layout(item, obj, ctx): void {
    const step = getNumberLineTickStep(item.tickStep, ctx.viewport, item.scale);
    const layoutKey = JSON.stringify({
      position: { x: item.position.x, y: item.position.y },
      angle: item.angle,
      scale: item.scale,
      range: item.range,
      step,
      worldPerPixel: ctx.viewport.worldPerPixel,
      labels: item.labels,
      labelClassName: item.labelClassName,
      labelStyle: item.labelStyle,
      visible: item.visible,
    });
    if (layoutKey === obj.layoutKey) return;
    rebuild(item, ctx.viewport, obj, ctx.container);
    obj.layoutKey = layoutKey;
  },

  dispose(obj, container): void {
    disposeAll(obj, container);
  },
};
