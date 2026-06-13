import * as THREE from "three";
import type { ItemSnapshot } from "../types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./shared";
import { lineThicknessScaleDown } from "./shared";
import { checkedColor, type Color } from "../../shared/types/colors";

const TICK_HEIGHT = 0.01; // thin disc along the axis
const TICK_RADIUS_MULTIPLIER = 2.5; // tick radius relative to axis tube radius
const ARROW_LENGTH_MULTIPLIER = 8; // arrow cone height relative to axis radius
const ARROW_WIDTH_MULTIPLIER = 4; // arrow cone base radius relative to axis radius

type AxisKey = "x" | "y" | "z";

function getRange(
  value: boolean | [number, number]
): readonly [number, number] {
  return typeof value !== "boolean" ? value : ([-100, 100] as const);
}

/** Generate integer tick positions within a range, skipping 0 */
function getTickPositions(
  range: readonly [number, number],
  step: number
): number[] {
  const positions: number[] = [];
  const start = Math.ceil(range[0] / step) * step;
  for (let v = start; v <= range[1]; v += step) {
    if (Math.abs(v) < 1e-9) continue; // skip origin
    positions.push(v);
  }
  return positions;
}

/**
 * Create an InstancedMesh of small cylinders for tick marks along one axis.
 * Ticks are perpendicular to the axis direction.
 *
 * Perpendicular directions:
 *   X axis -> ticks along Y
 *   Y axis -> ticks along X
 *   Z axis -> ticks along Y
 */
function createTicksForAxis(
  axis: AxisKey,
  range: readonly [number, number],
  step: number,
  thickness: number,
  color: Color,
  threeScene: THREE.Object3D
): THREE.InstancedMesh | null {
  const positions = getTickPositions(range, step);
  if (positions.length === 0) return null;

  // Tick radius scales with axis thickness so ticks stay proportional
  const axisRadius = thickness / lineThicknessScaleDown;
  const tickRadius = axisRadius * TICK_RADIUS_MULTIPLIER;

  // CylinderGeometry is aligned along Y by default.
  // We create a disc (large radius, tiny height) and rotate it so
  // the disc's height axis is aligned with the axis direction,
  // making it visible as a ring from any viewing angle.
  const geometry = new THREE.CylinderGeometry(
    tickRadius,
    tickRadius,
    TICK_HEIGHT,
    12
  );
  const material = new THREE.MeshBasicMaterial({
    color: checkedColor(color, "Axes3D.color"),
  });
  const mesh = new THREE.InstancedMesh(geometry, material, positions.length);

  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();

  if (axis === "x") {
    // Rotate 90 degrees around Z so cylinder height runs along X
    rotation.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
    for (let i = 0; i < positions.length; i++) {
      matrix.compose(
        new THREE.Vector3(positions[i], 0, 0),
        rotation,
        new THREE.Vector3(1, 1, 1)
      );
      mesh.setMatrixAt(i, matrix);
    }
  } else if (axis === "y") {
    // Default cylinder orientation is along Y, no rotation needed
    for (let i = 0; i < positions.length; i++) {
      matrix.makeTranslation(0, positions[i], 0);
      mesh.setMatrixAt(i, matrix);
    }
  } else {
    // Rotate 90 degrees around X so cylinder height runs along Z
    rotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    for (let i = 0; i < positions.length; i++) {
      matrix.compose(
        new THREE.Vector3(0, 0, positions[i]),
        rotation,
        new THREE.Vector3(1, 1, 1)
      );
      mesh.setMatrixAt(i, matrix);
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  threeScene.add(mesh);
  return mesh;
}

function disposeTickMesh(
  mesh: THREE.InstancedMesh | null,
  threeScene: THREE.Object3D
) {
  if (!mesh) return;
  threeScene.remove(mesh);
  mesh.geometry.dispose();
  (mesh.material as THREE.MeshBasicMaterial).dispose();
  mesh.dispose();
}

function rebuildTicks(
  item: ItemSnapshot<"axes3d">,
  obj: ThreeSceneTypes["axes3d"],
  threeScene: THREE.Object3D
) {
  // Dispose old ticks
  disposeTickMesh(obj.ticks.x, threeScene);
  disposeTickMesh(obj.ticks.y, threeScene);
  disposeTickMesh(obj.ticks.z, threeScene);
  obj.ticks.geometry.dispose();

  const axisRadius = item.thickness / lineThicknessScaleDown;
  const tickRadius = axisRadius * TICK_RADIUS_MULTIPLIER;
  obj.ticks.geometry = new THREE.CylinderGeometry(
    tickRadius,
    tickRadius,
    TICK_HEIGHT,
    12
  );

  const showTicks = item.tickmarks && item.visible;

  const axes: AxisKey[] = ["x", "y", "z"];
  for (const axis of axes) {
    if (showTicks && item[axis] !== false) {
      const range = getRange(item[axis]);
      obj.ticks[axis] = createTicksForAxis(
        axis,
        range,
        item.tickStep,
        item.thickness,
        item.color,
        threeScene
      );
    } else {
      obj.ticks[axis] = null;
    }
  }
}

type ArrowMesh = THREE.Mesh<THREE.ConeGeometry, THREE.MeshBasicMaterial>;

const ARROW_ROTATIONS: Record<AxisKey, THREE.Quaternion> = {
  // ConeGeometry points along +Y by default
  x: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2),
  y: new THREE.Quaternion(), // already along +Y
  z: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2),
};

function createArrowForAxis(
  axis: AxisKey,
  range: readonly [number, number],
  thickness: number,
  color: Color,
  threeScene: THREE.Object3D
): ArrowMesh {
  const axisRadius = thickness / lineThicknessScaleDown;
  const coneHeight = axisRadius * ARROW_LENGTH_MULTIPLIER;
  const coneRadius = axisRadius * ARROW_WIDTH_MULTIPLIER;

  const geometry = new THREE.ConeGeometry(coneRadius, coneHeight, 12);
  const material = new THREE.MeshBasicMaterial({
    color: checkedColor(color, "Axes3D.color"),
  });
  const mesh = new THREE.Mesh(geometry, material) as ArrowMesh;

  // Position at positive end, offset by half cone height so the base sits at the end
  const pos = range[1] + coneHeight / 2;
  if (axis === "x") mesh.position.set(pos, 0, 0);
  else if (axis === "y") mesh.position.set(0, pos, 0);
  else mesh.position.set(0, 0, pos);

  mesh.quaternion.copy(ARROW_ROTATIONS[axis]);
  threeScene.add(mesh);
  return mesh;
}

function disposeArrowMesh(
  mesh: ArrowMesh | null,
  threeScene: THREE.Object3D
) {
  if (!mesh) return;
  threeScene.remove(mesh);
  mesh.geometry.dispose();
  mesh.material.dispose();
}

function rebuildArrows(
  item: ItemSnapshot<"axes3d">,
  obj: ThreeSceneTypes["axes3d"],
  threeScene: THREE.Object3D
) {
  disposeArrowMesh(obj.arrows.x, threeScene);
  disposeArrowMesh(obj.arrows.y, threeScene);
  disposeArrowMesh(obj.arrows.z, threeScene);

  const showArrows = item.arrows && item.visible;
  const axes: AxisKey[] = ["x", "y", "z"];
  for (const axis of axes) {
    if (showArrows && item[axis] !== false) {
      const range = getRange(item[axis]);
      obj.arrows[axis] = createArrowForAxis(
        axis,
        range,
        item.thickness,
        item.color,
        threeScene
      );
    } else {
      obj.arrows[axis] = null;
    }
  }
}

export const axes3dRenderer: ItemRenderer<"axes3d"> = {
  create(
    item: ItemSnapshot<"axes3d">,
    threeScene: THREE.Object3D
  ): ThreeSceneTypes["axes3d"] {
    const xRange = getRange(item.x);
    const yRange = getRange(item.y);
    const zRange = getRange(item.z);

    const xCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(xRange[0], 0, 0),
      new THREE.Vector3(xRange[1], 0, 0),
    ]);
    const yCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, yRange[0], 0),
      new THREE.Vector3(0, yRange[1], 0),
    ]);
    const zCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, zRange[0]),
      new THREE.Vector3(0, 0, zRange[1]),
    ]);
    const xGeometry = new THREE.TubeGeometry(
      xCurve,
      64,
      item.thickness / lineThicknessScaleDown
    );
    const yGeometry = new THREE.TubeGeometry(
      yCurve,
      64,
      item.thickness / lineThicknessScaleDown
    );
    const zGeometry = new THREE.TubeGeometry(
      zCurve,
      64,
      item.thickness / lineThicknessScaleDown
    );
    const xMaterial = new THREE.MeshBasicMaterial({
      color: checkedColor(item.color, "Axes3D.color"),
    });
    const yMaterial = new THREE.MeshBasicMaterial({
      color: checkedColor(item.color, "Axes3D.color"),
    });
    const zMaterial = new THREE.MeshBasicMaterial({
      color: checkedColor(item.color, "Axes3D.color"),
    });
    const xMesh = new THREE.Mesh(xGeometry, xMaterial);
    const yMesh = new THREE.Mesh(yGeometry, yMaterial);
    const zMesh = new THREE.Mesh(zGeometry, zMaterial);
    xMesh.userData.itemId = item.id;
    yMesh.userData.itemId = item.id;
    zMesh.userData.itemId = item.id;
    threeScene.add(xMesh);
    threeScene.add(yMesh);
    threeScene.add(zMesh);

    xMesh.visible = item.visible && item.x !== false;
    yMesh.visible = item.visible && item.y !== false;
    zMesh.visible = item.visible && item.z !== false;

    // Create tick marks
    const axisRadius = item.thickness / lineThicknessScaleDown;
    const tickRadius = axisRadius * TICK_RADIUS_MULTIPLIER;
    const tickGeometry = new THREE.CylinderGeometry(
      tickRadius,
      tickRadius,
      TICK_HEIGHT,
      12
    );
    const ticks: ThreeSceneTypes["axes3d"]["ticks"] = {
      geometry: tickGeometry,
      x: null,
      y: null,
      z: null,
    };

    const arrows: ThreeSceneTypes["axes3d"]["arrows"] = {
      x: null,
      y: null,
      z: null,
    };

    const result: ThreeSceneTypes["axes3d"] = {
      kind: "axes3d",
      x: {
        curve: xCurve,
        geometry: xGeometry,
        material: xMaterial,
        mesh: xMesh,
      },
      y: {
        curve: yCurve,
        geometry: yGeometry,
        material: yMaterial,
        mesh: yMesh,
      },
      z: {
        curve: zCurve,
        geometry: zGeometry,
        material: zMaterial,
        mesh: zMesh,
      },
      ticks,
      arrows,
    };

    const allAxes: AxisKey[] = ["x", "y", "z"];
    for (const axis of allAxes) {
      if (item[axis] === false) continue;
      const range = getRange(item[axis]);

      if (item.tickmarks && item.visible) {
        result.ticks[axis] = createTicksForAxis(
          axis,
          range,
          item.tickStep,
          item.thickness,
          item.color,
          threeScene
        );
      }

      if (item.arrows && item.visible) {
        result.arrows[axis] = createArrowForAxis(
          axis,
          range,
          item.thickness,
          item.color,
          threeScene
        );
      }
    }

    return result;
  },

  update(
    item: ItemSnapshot<"axes3d">,
    obj: ThreeSceneTypes["axes3d"],
    threeScene: THREE.Object3D
  ): void {
    // Update material colors
    obj.x.material.color.set(checkedColor(item.color, "Axes3D.color"));
    obj.y.material.color.set(checkedColor(item.color, "Axes3D.color"));
    obj.z.material.color.set(checkedColor(item.color, "Axes3D.color"));

    // Update visibility
    obj.x.mesh.visible = item.visible && item.x !== false;
    obj.y.mesh.visible = item.visible && item.y !== false;
    obj.z.mesh.visible = item.visible && item.z !== false;

    // Recalculate ranges
    const xRange = getRange(item.x);
    const yRange = getRange(item.y);
    const zRange = getRange(item.z);

    // Update X axis
    const xCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(xRange[0], 0, 0),
      new THREE.Vector3(xRange[1], 0, 0),
    ]);
    const oldXGeometry = obj.x.geometry;
    const xGeometry = new THREE.TubeGeometry(
      xCurve,
      64,
      item.thickness / lineThicknessScaleDown
    );
    obj.x.curve = xCurve;
    obj.x.geometry = xGeometry;
    obj.x.mesh.geometry = xGeometry;
    oldXGeometry.dispose();

    // Update Y axis
    const yCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, yRange[0], 0),
      new THREE.Vector3(0, yRange[1], 0),
    ]);
    const oldYGeometry = obj.y.geometry;
    const yGeometry = new THREE.TubeGeometry(
      yCurve,
      64,
      item.thickness / lineThicknessScaleDown
    );
    obj.y.curve = yCurve;
    obj.y.geometry = yGeometry;
    obj.y.mesh.geometry = yGeometry;
    oldYGeometry.dispose();

    // Update Z axis
    const zCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, zRange[0]),
      new THREE.Vector3(0, 0, zRange[1]),
    ]);
    const oldZGeometry = obj.z.geometry;
    const zGeometry = new THREE.TubeGeometry(
      zCurve,
      64,
      item.thickness / lineThicknessScaleDown
    );
    obj.z.curve = zCurve;
    obj.z.geometry = zGeometry;
    obj.z.mesh.geometry = zGeometry;
    oldZGeometry.dispose();

    // Rebuild tick marks and arrows
    rebuildTicks(item, obj, threeScene);
    rebuildArrows(item, obj, threeScene);
  },

  dispose(obj: ThreeSceneTypes["axes3d"], threeScene: THREE.Object3D): void {
    threeScene.remove(obj.x.mesh);
    threeScene.remove(obj.y.mesh);
    threeScene.remove(obj.z.mesh);
    obj.x.geometry.dispose();
    obj.x.material.dispose();
    obj.y.geometry.dispose();
    obj.y.material.dispose();
    obj.z.geometry.dispose();
    obj.z.material.dispose();

    // Dispose tick marks
    disposeTickMesh(obj.ticks.x, threeScene);
    disposeTickMesh(obj.ticks.y, threeScene);
    disposeTickMesh(obj.ticks.z, threeScene);
    obj.ticks.geometry.dispose();

    // Dispose arrows
    disposeArrowMesh(obj.arrows.x, threeScene);
    disposeArrowMesh(obj.arrows.y, threeScene);
    disposeArrowMesh(obj.arrows.z, threeScene);
  },
};
