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
  arrowEndSkips,
  buildTickPositions,
  getAxisRange,
  getTickStep,
  type AxisKey,
} from "../../../math/axes-math";
import { hasArrowAt } from "../../../../shared/types/arrows";
import { createAxisTickLabel } from "../../../overlay-dom";

// The axis line sits at `base`, the origin's perpendicular coordinate.
function buildAxisLineGeometry(
  axis: AxisKey,
  range: readonly [number, number],
  base: number
): LineGeometry {
  const positions =
    axis === "x"
      ? [range[0], base, Z_DEFAULT, range[1], base, Z_DEFAULT]
      : [base, range[0], Z_DEFAULT, base, range[1], Z_DEFAULT];
  const geom = new LineGeometry();
  geom.setPositions(positions);
  return geom;
}

// Tick geometry stays centered on its axis; the base offset lives on the
// mesh position, so the before-render pixel scaling (which scales around the
// mesh origin) never distorts it.
function buildTickGeometry(
  axis: AxisKey,
  range: readonly [number, number],
  step: number,
  halfLength: number,
  skip: readonly number[]
): LineSegmentsGeometry {
  const ticks = buildTickPositions(range, step, skip);
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

// Unit arrow pointing along its axis, toward the range's max ("end") or min
// ("start") side. Base sits at origin, tip extends one unit outward. Mesh
// position places the BASE at the axis endpoint, so the scaled tip lands
// `arrowLengthPx` pixels beyond the line — keeping ticks at integer positions
// clear of the tip and matching axes3d's conventions.
function buildUnitArrowGeometry(
  axis: AxisKey,
  which: "start" | "end"
): THREE.BufferGeometry {
  const tip = which === "end" ? 1 : -1;
  const positions =
    axis === "x"
      ? [tip, 0, Z_DEFAULT, 0, 0.5, Z_DEFAULT, 0, -0.5, Z_DEFAULT]
      : [0, tip, Z_DEFAULT, 0.5, 0, Z_DEFAULT, -0.5, 0, Z_DEFAULT];
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
  const base = axis === "x" ? item.origin.y : item.origin.x;
  const crossing = axis === "x" ? item.origin.x : item.origin.y;

  const lineMaterial = new LineMaterial({
    color: checkedColor(item.color, "Axes2D.color"),
    linewidth: item.thickness,
  });
  const lineGeometry = buildAxisLineGeometry(axis, range, base);
  const lineMesh = new Line2(lineGeometry, lineMaterial);
  lineMesh.visible = item.visible && enabled;
  lineMesh.userData.itemId = item.id;
  threeScene.add(lineMesh);

  let ticks: ThreeSceneTypes["axes2d"]["x"]["ticks"] = null;
  if (item.tickmarks && enabled) {
    const tickStep = getTickStep(item.tickStep, viewport);
    const tickHalfLength = viewport
      ? (item.tickLength / 2) * viewport.worldPerPixel
      : 1;
    const tickGeometry = buildTickGeometry(
      axis,
      range,
      tickStep,
      tickHalfLength,
      [crossing, ...arrowEndSkips(range, item.arrows)]
    );
    const tickMaterial = new LineMaterial({
      color: checkedColor(item.color, "Axes2D.color"),
      linewidth: item.thickness,
    });
    const tickMesh = new LineSegments2(tickGeometry, tickMaterial);
    if (axis === "x") {
      tickMesh.position.set(0, base, 0);
    } else {
      tickMesh.position.set(base, 0, 0);
    }
    tickMesh.visible = item.visible;
    tickMesh.userData.itemId = item.id;
    tickMesh.userData.axis = axis;
    tickMesh.userData.tickLength = item.tickLength;
    if (!viewport) {
      chainOnBeforeRender(tickMesh, onTickBeforeRender);
    }
    threeScene.add(tickMesh);
    ticks = { geometry: tickGeometry, material: tickMaterial, mesh: tickMesh };
  }

  const buildArrow = (
    which: "start" | "end"
  ): ThreeSceneTypes["axes2d"]["x"]["arrowEnd"] => {
    if (!enabled || !hasArrowAt(item.arrows, which)) return null;
    const arrowGeometry = buildUnitArrowGeometry(axis, which);
    // DoubleSide like the other 2D fills: the start head's triangle winds the
    // other way and would be back-face culled otherwise.
    const arrowMaterial = new THREE.MeshBasicMaterial({
      color: checkedColor(item.color, "Axes2D.color"),
      side: THREE.DoubleSide,
    });
    const arrowMesh = new THREE.Mesh(arrowGeometry, arrowMaterial);
    const at = which === "end" ? range[1] : range[0];
    if (axis === "x") {
      arrowMesh.position.set(at, base, Z_DEFAULT);
    } else {
      arrowMesh.position.set(base, at, Z_DEFAULT);
    }
    arrowMesh.visible = item.visible;
    arrowMesh.userData.itemId = item.id;
    arrowMesh.userData.axis = axis;
    arrowMesh.userData.headLength = item.headLength;
    arrowMesh.userData.headWidth = item.headWidth;
    chainOnBeforeRender(arrowMesh, onArrowBeforeRender);
    threeScene.add(arrowMesh);
    return { geometry: arrowGeometry, material: arrowMaterial, mesh: arrowMesh };
  };

  return {
    line: { geometry: lineGeometry, material: lineMaterial, mesh: lineMesh },
    ticks,
    arrowStart: buildArrow("start"),
    arrowEnd: buildArrow("end"),
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
  for (const arrow of [axisObj.arrowStart, axisObj.arrowEnd]) {
    if (!arrow) continue;
    threeScene.remove(arrow.mesh);
    arrow.geometry.dispose();
    arrow.material.dispose();
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
    const base = axis === "x" ? item.origin.y : item.origin.x;
    const crossing = axis === "x" ? item.origin.x : item.origin.y;
    const ticks = buildTickPositions(range, tickStep, [
      crossing,
      ...arrowEndSkips(range, item.arrows),
    ]);
    for (const tick of ticks) {
      const { wrapper, element } = createAxisTickLabel(item, axis, tick, tickStep);

      const cssObject = new CSS2DObject(wrapper);
      if (axis === "x") {
        cssObject.position.set(tick, base, Z_DEFAULT);
      } else {
        cssObject.position.set(base, tick, Z_DEFAULT);
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
      origin: { x: item.origin.x, y: item.origin.y },
      arrows: item.arrows,
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
  const half = ((this.userData.tickLength as number) / 2) * wpp;
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
  const lengthWorld = (this.userData.headLength as number) * wpp;
  const halfWidthWorld = ((this.userData.headWidth as number) / 2) * wpp;
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
