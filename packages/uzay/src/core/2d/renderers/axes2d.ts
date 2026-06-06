import * as THREE from "three";
import type { ItemSnapshot } from "../types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./index";
import { Z_DEFAULT } from "./index";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { getWorldPerPixel, chainOnBeforeRender } from "../types/screen-space";
import { checkedColor } from "../../shared/types/colors";

// Pixel-space sizes for ornaments. Multiplied by item.thickness so the same
// dial that controls line width also scales ticks and arrowheads
// proportionally.
const BASE_TICK_HALF_LENGTH_PX = 6;
const BASE_ARROW_LENGTH_PX = 14;
const BASE_ARROW_HALF_WIDTH_PX = 5;
const INFINITE_RANGE: readonly [number, number] = [-100, 100];

type AxisKey = "x" | "y";

function getRange(value: boolean | [number, number]): readonly [number, number] {
  return typeof value !== "boolean" ? value : INFINITE_RANGE;
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

// Tick geometry uses unit perpendicular extent (±1). The mesh's scale on the
// perpendicular axis is then set in onBeforeRender so each tick has a fixed
// pixel length regardless of zoom.
function buildTickGeometry(
  axis: AxisKey,
  range: readonly [number, number],
  step: number
): LineSegmentsGeometry {
  const ticks = buildTickPositions(range, step);
  const positions: number[] = [];
  for (const t of ticks) {
    if (axis === "x") {
      positions.push(t, -1, Z_DEFAULT, t, 1, Z_DEFAULT);
    } else {
      positions.push(-1, t, Z_DEFAULT, 1, t, Z_DEFAULT);
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
  threeScene: THREE.Scene
): ThreeSceneTypes["axes2d"]["x"] {
  const enabled = item[axis] !== false;
  const range = getRange(item[axis]);

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
    const tickGeometry = buildTickGeometry(axis, range, item.tickStep);
    const tickMaterial = new LineMaterial({
      color: checkedColor(item.color, "Axes2D.color"),
      linewidth: item.thickness,
    });
    const tickMesh = new LineSegments2(tickGeometry, tickMaterial);
    tickMesh.visible = item.visible;
    tickMesh.userData.itemId = item.id;
    tickMesh.userData.axis = axis;
    tickMesh.userData.thickness = item.thickness;
    chainOnBeforeRender(tickMesh, onTickBeforeRender);
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
  threeScene: THREE.Scene
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

export const axes2dRenderer: ItemRenderer<"axes2d"> = {
  create(
    item: ItemSnapshot<"axes2d">,
    threeScene: THREE.Scene
  ): ThreeSceneTypes["axes2d"] {
    return {
      kind: "axes2d",
      x: createAxis("x", item, threeScene),
      y: createAxis("y", item, threeScene),
    };
  },

  // Axis layout fields (range, ticks, arrows, thickness) all reshape geometry,
  // so the simplest path is to dispose and rebuild on update. Per-frame work
  // is small (a handful of buffer geometries).
  update(
    item: ItemSnapshot<"axes2d">,
    obj: ThreeSceneTypes["axes2d"],
    threeScene: THREE.Scene
  ): void {
    disposeAxis(obj.x, threeScene);
    disposeAxis(obj.y, threeScene);
    obj.x = createAxis("x", item, threeScene);
    obj.y = createAxis("y", item, threeScene);
  },

  dispose(obj: ThreeSceneTypes["axes2d"], threeScene: THREE.Scene): void {
    disposeAxis(obj.x, threeScene);
    disposeAxis(obj.y, threeScene);
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
