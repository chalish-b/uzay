import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import type { ItemSnapshot } from "../types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./shared";
import { Z_DEFAULT } from "./shared";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { getWorldPerPixel, chainOnBeforeRender } from "../types/screen-space";
import { checkedColor } from "../../shared/types/colors";
import type { Viewport2D } from "../types/view-context";
import { getNiceStep } from "../types/nice-step";
import { anchorToTranslate } from "../../shared/types/overlay";

// Pixel-space sizes for ornaments. Multiplied by item.thickness so the same
// dial that controls line width also scales ticks and arrowheads
// proportionally.
const BASE_TICK_HALF_LENGTH_PX = 6;
const BASE_ARROW_LENGTH_PX = 14;
const BASE_ARROW_HALF_WIDTH_PX = 5;
const INFINITE_RANGE: readonly [number, number] = [-100, 100];
// Renderer requirements, always applied regardless of user styling.
const LABEL_BASE_STYLE = [
  "line-height: 1",
  "white-space: nowrap",
  "pointer-events: none",
].join(";");

// The default look, tuned for the library's dark-canvas defaults like every
// other item color. Applied only when the user provides neither labelStyle
// nor labelClassName; either one replaces this block entirely. Inline
// defaults would otherwise outrank any class, making CSS theming impossible.
const LABEL_DEFAULT_STYLE = [
  "color: rgba(255, 255, 255, 0.72)",
  "font-size: 12px",
  "font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  "text-shadow: 0 1px 2px black, 0 0 4px black",
].join(";");

type AxisKey = "x" | "y";

function getRange(
  axis: AxisKey,
  value: boolean | [number, number],
  viewport: Viewport2D | null = null
): readonly [number, number] {
  if (typeof value !== "boolean") return value;
  if (value === true && viewport) {
    const { left, right, bottom, top } = viewport.visibleWorldBounds;
    return axis === "x" ? [left, right] : [bottom, top];
  }
  return INFINITE_RANGE;
}

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

function buildTickPositions(
  range: readonly [number, number],
  step: number
): number[] {
  if (step <= 0) return [];
  const positions: number[] = [];
  const start = Math.ceil(range[0] / step) * step;
  for (let v = start; v <= range[1] + 1e-9; v += step) {
    if (Math.abs(v) < 1e-9) continue;
    positions.push(v);
  }
  return positions;
}

function formatTick(value: number, step: number): string {
  const decimals = Math.max(0, Math.ceil(-Math.log10(Math.abs(step))));
  const rounded = Number(value.toFixed(decimals));
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

function getTickStep(
  tickStep: ItemSnapshot<"axes2d">["tickStep"],
  viewport: Viewport2D | null
): number {
  if (tickStep !== "auto") return tickStep;
  if (!viewport || viewport.worldPerPixel <= 0) return 1;
  return getNiceStep(viewport.worldPerPixel);
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
  const range = getRange(axis, item[axis], viewport);

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

    const range = getRange(axis, item[axis], viewport);
    const ticks = buildTickPositions(range, tickStep);
    for (const tick of ticks) {
      const wrapper = document.createElement("div");
      wrapper.style.width = "max-content";
      wrapper.style.zIndex = "0";

      const element = document.createElement("div");
      element.textContent = formatTick(tick, tickStep);
      element.className = item.labelClassName;
      element.style.cssText =
        item.labelStyle || item.labelClassName
          ? `${LABEL_BASE_STYLE};${item.labelStyle}`
          : `${LABEL_BASE_STYLE};${LABEL_DEFAULT_STYLE}`;
      element.style.transform =
        axis === "x"
          ? `${anchorToTranslate("top")} translate(0px, 10px)`
          : `${anchorToTranslate("right")} translate(-10px, 0px)`;
      wrapper.appendChild(element);

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

    const xRange = getRange("x", item.x, ctx.viewport);
    const yRange = getRange("y", item.y, ctx.viewport);
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

    disposeAxis(obj.x, ctx.threeScene);
    disposeAxis(obj.y, ctx.threeScene);
    disposeLabels(obj.labels, ctx.threeScene);
    obj.x = createAxis("x", item, ctx.threeScene, ctx.viewport);
    obj.y = createAxis("y", item, ctx.threeScene, ctx.viewport);
    obj.labels = createLabels(item, ctx.viewport, ctx.threeScene);
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
