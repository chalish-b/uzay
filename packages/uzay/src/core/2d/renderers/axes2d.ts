import * as THREE from "three";
import type { ItemSnapshot } from "../types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./index";
import { Z_DEFAULT } from "./index";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";

// World-unit base sizes for ticks and arrows. Scaled by item.thickness so a
// thicker axis gets proportionally bigger ornamentation.
const BASE_TICK_HALF_LENGTH = 0.06;
const BASE_ARROW_LENGTH = 0.22;
const BASE_ARROW_HALF_WIDTH = 0.08;
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

function buildTickGeometry(
  axis: AxisKey,
  range: readonly [number, number],
  step: number,
  thickness: number
): LineSegmentsGeometry {
  const half = BASE_TICK_HALF_LENGTH * thickness;
  const ticks = buildTickPositions(range, step);
  const positions: number[] = [];
  for (const t of ticks) {
    if (axis === "x") {
      // Ticks on x axis run vertically (along y).
      positions.push(t, -half, Z_DEFAULT, t, half, Z_DEFAULT);
    } else {
      // Ticks on y axis run horizontally (along x).
      positions.push(-half, t, Z_DEFAULT, half, t, Z_DEFAULT);
    }
  }
  const geom = new LineSegmentsGeometry();
  geom.setPositions(positions);
  return geom;
}

// Arrow base sits AT the axis endpoint and the tip extends BEYOND it. This
// keeps any tickmark drawn at the endpoint from overlapping the tip of the
// arrowhead, matching the layout used by axes3d.
function buildArrowGeometry(
  axis: AxisKey,
  range: readonly [number, number],
  thickness: number
): THREE.BufferGeometry {
  const length = BASE_ARROW_LENGTH * thickness;
  const halfWidth = BASE_ARROW_HALF_WIDTH * thickness;
  const basePos = range[1];
  const tipPos = range[1] + length;

  let v0: [number, number], v1: [number, number], v2: [number, number];
  if (axis === "x") {
    v0 = [tipPos, 0];
    v1 = [basePos, halfWidth];
    v2 = [basePos, -halfWidth];
  } else {
    v0 = [0, tipPos];
    v1 = [halfWidth, basePos];
    v2 = [-halfWidth, basePos];
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [v0[0], v0[1], Z_DEFAULT, v1[0], v1[1], Z_DEFAULT, v2[0], v2[1], Z_DEFAULT],
      3
    )
  );
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
    color: item.color,
    linewidth: item.thickness,
  });
  const lineGeometry = buildAxisLineGeometry(axis, range);
  const lineMesh = new Line2(lineGeometry, lineMaterial);
  lineMesh.visible = item.visible && enabled;
  lineMesh.userData.itemId = item.id;
  threeScene.add(lineMesh);

  let ticks: ThreeSceneTypes["axes2d"]["x"]["ticks"] = null;
  if (item.tickmarks && enabled) {
    const tickGeometry = buildTickGeometry(axis, range, item.tickStep, item.thickness);
    const tickMaterial = new LineMaterial({
      color: item.color,
      linewidth: item.thickness,
    });
    const tickMesh = new LineSegments2(tickGeometry, tickMaterial);
    tickMesh.visible = item.visible;
    tickMesh.userData.itemId = item.id;
    threeScene.add(tickMesh);
    ticks = { geometry: tickGeometry, material: tickMaterial, mesh: tickMesh };
  }

  let arrow: ThreeSceneTypes["axes2d"]["x"]["arrow"] = null;
  if (item.arrows && enabled) {
    const arrowGeometry = buildArrowGeometry(axis, range, item.thickness);
    const arrowMaterial = new THREE.MeshBasicMaterial({ color: item.color });
    const arrowMesh = new THREE.Mesh(arrowGeometry, arrowMaterial);
    arrowMesh.visible = item.visible;
    arrowMesh.userData.itemId = item.id;
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
