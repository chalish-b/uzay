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
import { getWorldPerPixel, chainOnBeforeRender } from "../screen-space";
import { checkedColor } from "../../../../shared/types/colors";
import type { Viewport2D } from "../../../types/view-context";
import {
  BASE_TICK_HALF_LENGTH_PX,
  BASE_ARROW_LENGTH_PX,
  BASE_ARROW_HALF_WIDTH_PX,
  buildTickPositions,
  getAxisRange,
  getTickStep,
  type AxisKey,
} from "../../../math/axes-math";
import { createAxisTickLabel } from "../../../overlay-dom";

function buildAxisLineGeometry(
  axis: AxisKey,
  range: readonly [number, number]
): LineGeometry {
  const positions =
    axis === "x"
      ? [range[0], 0, Z_DEFAULT, range[1], 0, Z_DEFAULT]
      : [0, range[0], Z_DEFAULT, 0, range[1], Z_DEFAULT];
  const geom = new LineGeometry();
  geom.setPositions(positions);
  return geom;
}

function buildTickGeometry(
  axis: AxisKey,
  range: readonly [number, number],
  step: number,
  halfLength: number = 1
): LineSegmentsGeometry {
  const ticks = buildTickPositions(range, step);
  const positions: number[] = [];
  for (const t of ticks) {
    if (axis === "x") {
      positions.push(t, -halfLength, Z_DEFAULT, t, halfLength, Z_DEFAULT);
    } else {
      positions.push(-halfLength, t, Z_DEFAULT, halfLength, t, Z_DEFAULT);
    }
  }
  const geom = new LineSegmentsGeometry();
  geom.setPositions(positions);
  return geom;
}

// Unit arrow pointing along its axis. Base sits at origin, tip extends one
// unit forward. Mesh position places the BASE at the axis endpoint, so the
// scaled tip lands `arrowLengthPx` pixels beyond the line — keeping ticks at
// integer positions clear of the tip and matching axes3d's conventions.
function buildUnitArrowGeometry(axis: AxisKey): THREE.BufferGeometry {
  const positions =
    axis === "x"
      ? [1, 0, Z_DEFAULT, 0, 0.5, Z_DEFAULT, 0, -0.5, Z_DEFAULT]
      : [0, 1, Z_DEFAULT, 0.5, 0, Z_DEFAULT, -0.5, 0, Z_DEFAULT];
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex([0, 1, 2]);
  return geom;
}

function createAxis(
  axis: AxisKey,
  item: ItemSnapshot<"axes2d">,
  threeScene: THREE.Object3D,
  viewport: Viewport2D | null = null
): ThreeSceneTypes["axes2d"]["x"] {
  const enabled = item[axis] !== false;
  const range = getAxisRange(axis, item[axis], viewport);

  const lineMaterial = new LineMaterial({
    color: checkedColor(item.color, "Axes2D.color"),
    linewidth: item.thickness,
  });
  const lineGeometry = buildAxisLineGeometry(axis, range);
  const lineMesh = new Line2(lineGeometry, lineMaterial);
  lineMesh.visible = item.visible && enabled;
  lineMesh.userData.itemId = item.id;
  threeScene.add(lineMesh);

  let ticks: ThreeSceneTypes["axes2d"]["x"]["ticks"] = null;
  if (item.tickmarks && enabled) {
    const tickStep = getTickStep(item.tickStep, viewport);
    const tickHalfLength = viewport
      ? item.thickness * BASE_TICK_HALF_LENGTH_PX * viewport.worldPerPixel
      : 1;
    const tickGeometry = buildTickGeometry(
      axis,
      range,
      tickStep,
      tickHalfLength
    );
    const tickMaterial = new LineMaterial({
      color: checkedColor(item.color, "Axes2D.color"),
      linewidth: item.thickness,
    });
    const tickMesh = new LineSegments2(tickGeometry, tickMaterial);
    tickMesh.visible = item.visible;
    tickMesh.userData.itemId = item.id;
    tickMesh.userData.axis = axis;
    tickMesh.userData.thickness = item.thickness;
    if (!viewport) {
      chainOnBeforeRender(tickMesh, onTickBeforeRender);
    }
    threeScene.add(tickMesh);
    ticks = { geometry: tickGeometry, material: tickMaterial, mesh: tickMesh };
  }

  let arrow: ThreeSceneTypes["axes2d"]["x"]["arrow"] = null;
  if (item.arrows && enabled) {
    const arrowGeometry = buildUnitArrowGeometry(axis);
    const arrowMaterial = new THREE.MeshBasicMaterial({
      color: checkedColor(item.color, "Axes2D.color"),
    });
    const arrowMesh = new THREE.Mesh(arrowGeometry, arrowMaterial);
    if (axis === "x") {
      arrowMesh.position.set(range[1], 0, Z_DEFAULT);
    } else {
      arrowMesh.position.set(0, range[1], Z_DEFAULT);
    }
    arrowMesh.visible = item.visible;
    arrowMesh.userData.itemId = item.id;
    arrowMesh.userData.axis = axis;
    arrowMesh.userData.thickness = item.thickness;
    chainOnBeforeRender(arrowMesh, onArrowBeforeRender);
    threeScene.add(arrowMesh);
    arrow = { geometry: arrowGeometry, material: arrowMaterial, mesh: arrowMesh };
  }

  return {
    line: { geometry: lineGeometry, material: lineMaterial, mesh: lineMesh },
    ticks,
    arrow,
  };
}

function disposeAxis(
  axisObj: ThreeSceneTypes["axes2d"]["x"],
  threeScene: THREE.Object3D
) {
  threeScene.remove(axisObj.line.mesh);
  axisObj.line.geometry.dispose();
  axisObj.line.material.dispose();
  if (axisObj.ticks) {
    threeScene.remove(axisObj.ticks.mesh);
    axisObj.ticks.geometry.dispose();
    axisObj.ticks.material.dispose();
  }
  if (axisObj.arrow) {
    threeScene.remove(axisObj.arrow.mesh);
    axisObj.arrow.geometry.dispose();
    axisObj.arrow.material.dispose();
  }
}

function disposeLabels(
  labels: ThreeSceneTypes["axes2d"]["labels"],
  threeScene: THREE.Object3D
) {
  for (const label of labels) {
    threeScene.remove(label.cssObject);
    label.cssObject.element.remove();
  }
}

function createLabels(
  item: ItemSnapshot<"axes2d">,
  viewport: Viewport2D,
  threeScene: THREE.Object3D
): ThreeSceneTypes["axes2d"]["labels"] {
  if (!item.labels || !item.visible) return [];

  const tickStep = getTickStep(item.tickStep, viewport);
  const labels: ThreeSceneTypes["axes2d"]["labels"] = [];
  const axes: AxisKey[] = ["x", "y"];

  for (const axis of axes) {
    if (item[axis] === false) continue;

    const range = getAxisRange(axis, item[axis], viewport);
    const ticks = buildTickPositions(range, tickStep);
    for (const tick of ticks) {
      const { wrapper, element } = createAxisTickLabel(item, axis, tick, tickStep);

      const cssObject = new CSS2DObject(wrapper);
      if (axis === "x") {
        cssObject.position.set(tick, 0, Z_DEFAULT);
      } else {
        cssObject.position.set(0, tick, Z_DEFAULT);
      }
      threeScene.add(cssObject);
      labels.push({ cssObject, element });
    }
  }

  return labels;
}

export const axes2dRenderer: ItemRenderer<"axes2d"> = {
  create(
    item: ItemSnapshot<"axes2d">,
    threeScene: THREE.Object3D
  ): ThreeSceneTypes["axes2d"] {
    return {
      kind: "axes2d",
      x: createAxis("x", item, threeScene),
      y: createAxis("y", item, threeScene),
      labels: [],
      layoutKey: null,
    };
  },

  // Axis layout fields (range, ticks, arrows, thickness) all reshape geometry,
  // so the simplest path is to dispose and rebuild on update. Per-frame work
  // is small (a handful of buffer geometries).
  update(
    item: ItemSnapshot<"axes2d">,
    obj: ThreeSceneTypes["axes2d"],
    threeScene: THREE.Object3D
  ): void {
    disposeAxis(obj.x, threeScene);
    disposeAxis(obj.y, threeScene);
    disposeLabels(obj.labels, threeScene);
    obj.x = createAxis("x", item, threeScene);
    obj.y = createAxis("y", item, threeScene);
    obj.labels = [];
    obj.layoutKey = null;
  },

  layout(item: ItemSnapshot<"axes2d">, obj: ThreeSceneTypes["axes2d"], ctx): void {
    if (
      item.x !== true &&
      item.y !== true &&
      item.tickStep !== "auto" &&
      !item.labels
    ) return;

    const xRange = getAxisRange("x", item.x, ctx.viewport);
    const yRange = getAxisRange("y", item.y, ctx.viewport);
    const tickStep = getTickStep(item.tickStep, ctx.viewport);
    const layoutKey = JSON.stringify({
      xRange,
      yRange,
      tickStep,
      worldPerPixel: ctx.viewport.worldPerPixel,
      labels: item.labels,
      labelClassName: item.labelClassName,
      labelStyle: item.labelStyle,
      visible: item.visible,
    });
    if (layoutKey === obj.layoutKey) return;

    disposeAxis(obj.x, ctx.container);
    disposeAxis(obj.y, ctx.container);
    disposeLabels(obj.labels, ctx.container);
    obj.x = createAxis("x", item, ctx.container, ctx.viewport);
    obj.y = createAxis("y", item, ctx.container, ctx.viewport);
    obj.labels = createLabels(item, ctx.viewport, ctx.container);
    obj.layoutKey = layoutKey;
  },

  dispose(obj: ThreeSceneTypes["axes2d"], threeScene: THREE.Object3D): void {
    disposeAxis(obj.x, threeScene);
    disposeAxis(obj.y, threeScene);
    disposeLabels(obj.labels, threeScene);
  },
};

function onTickBeforeRender(
  this: THREE.Object3D,
  renderer: THREE.WebGLRenderer,
  camera: THREE.Camera
) {
  if (!(camera as THREE.OrthographicCamera).isOrthographicCamera) return;
  const wpp = getWorldPerPixel(renderer, camera as THREE.OrthographicCamera);
  const half = (this.userData.thickness as number) * BASE_TICK_HALF_LENGTH_PX * wpp;
  if (this.userData.axis === "x") {
    this.scale.set(1, half, 1);
  } else {
    this.scale.set(half, 1, 1);
  }
}

function onArrowBeforeRender(
  this: THREE.Object3D,
  renderer: THREE.WebGLRenderer,
  camera: THREE.Camera
) {
  if (!(camera as THREE.OrthographicCamera).isOrthographicCamera) return;
  const wpp = getWorldPerPixel(renderer, camera as THREE.OrthographicCamera);
  const thickness = this.userData.thickness as number;
  const lengthWorld = thickness * BASE_ARROW_LENGTH_PX * wpp;
  const halfWidthWorld = thickness * BASE_ARROW_HALF_WIDTH_PX * wpp;
  if (this.userData.axis === "x") {
    // Unit geometry: tip (1,0), base (0, ±0.5). Scale x extends tip forward,
    // scale y stretches base width.
    this.scale.set(lengthWorld, halfWidthWorld * 2, 1);
  } else {
    // Unit geometry: tip (0,1), base (±0.5, 0). Scale x stretches base width,
    // scale y extends tip up.
    this.scale.set(halfWidthWorld * 2, lengthWorld, 1);
  }
}
