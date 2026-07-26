import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import type { ItemSnapshot } from "../types/item-registry";
import type { ItemRenderer, Polygon3DStrokeObject, ThreeSceneTypes } from "./shared";
import { applyOpacityMaterialState } from "./material-transparency";
import { checkedColor } from "../../shared/types/colors";
import type { Polygon3DPoints } from "../items/polygon3d";
import type { Vec3 } from "../../shared/types/vec3";

const MIN_POINTS = 3;

function normalizePolygons(points: Polygon3DPoints): readonly Vec3[][] {
  if (points.length === 0) return [];
  return Array.isArray(points[0]) ? (points as Vec3[][]) : [points as Vec3[]];
}

// The polygon's plane normal via Newell's method, which stays robust for
// concave rings and tolerates slightly non-planar input. Returns null when the
// ring is degenerate (collinear or repeated points).
function newellNormal(polygon: readonly Vec3[]): THREE.Vector3 | null {
  const n = new THREE.Vector3(0, 0, 0);
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    n.x += (a.y - b.y) * (a.z + b.z);
    n.y += (a.z - b.z) * (a.x + b.x);
    n.z += (a.x - b.x) * (a.y + b.y);
  }
  if (n.lengthSq() < 1e-12) return null;
  return n.normalize();
}

// Projects the ring into its own plane and triangulates it there, so concave
// polygons at any orientation in space get correct triangles.
function triangulateRing(polygon: readonly Vec3[]): number[] | null {
  const normal = newellNormal(polygon);
  if (!normal) return null;

  // An in-plane orthonormal basis: pick the world axis least aligned with the
  // normal to avoid a near-parallel cross product.
  const ax = Math.abs(normal.x);
  const ay = Math.abs(normal.y);
  const az = Math.abs(normal.z);
  const helper =
    ax <= ay && ax <= az
      ? new THREE.Vector3(1, 0, 0)
      : ay <= az
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(0, 0, 1);
  const u = new THREE.Vector3().crossVectors(normal, helper).normalize();
  const v = new THREE.Vector3().crossVectors(normal, u);

  const origin = polygon[0];
  const projected = polygon.map((p) => {
    const dx = p.x - origin.x;
    const dy = p.y - origin.y;
    const dz = p.z - origin.z;
    return new THREE.Vector2(
      dx * u.x + dy * u.y + dz * u.z,
      dx * v.x + dy * v.y + dz * v.z
    );
  });

  const triangles = THREE.ShapeUtils.triangulateShape(projected, []);
  return triangles.flat();
}

// How far the ring's vertices stray from its best-fit plane, relative to the
// ring's own extent, before it counts as non-planar. Well above numerical
// noise, well below any deliberate warp.
const PLANARITY_TOLERANCE = 1e-3;

function isRingNonPlanar(polygon: readonly Vec3[]): boolean {
  const normal = newellNormal(polygon);
  if (!normal) return false;

  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (const p of polygon) {
    cx += p.x;
    cy += p.y;
    cz += p.z;
  }
  cx /= polygon.length;
  cy /= polygon.length;
  cz /= polygon.length;

  let deviation = 0;
  let extentSq = 0;
  for (const p of polygon) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const dz = p.z - cz;
    deviation = Math.max(
      deviation,
      Math.abs(dx * normal.x + dy * normal.y + dz * normal.z)
    );
    extentSq = Math.max(extentSq, dx * dx + dy * dy + dz * dz);
  }
  return deviation > Math.sqrt(extentSq) * PLANARITY_TOLERANCE;
}

type FillBuildResult = {
  geometry: THREE.BufferGeometry;
  nonPlanar: boolean;
};

function buildFillGeometry(points: Polygon3DPoints): FillBuildResult {
  const positions: number[] = [];
  const indices: number[] = [];
  let nonPlanar = false;

  for (const polygon of normalizePolygons(points)) {
    if (polygon.length < MIN_POINTS) continue;

    const ringIndices = triangulateRing(polygon);
    if (!ringIndices) continue;

    nonPlanar = nonPlanar || isRingNonPlanar(polygon);

    const offset = positions.length / 3;
    for (const p of polygon) {
      positions.push(p.x, p.y, p.z);
    }
    for (const index of ringIndices) {
      indices.push(offset + index);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(positions), 3)
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return { geometry, nonPlanar };
}

// Warned when a polygon crosses from planar to non-planar, once per crossing,
// so a reactive polygon animating while warped does not flood the console.
function warnNonPlanar(): void {
  console.warn(
    `[Uzay] Polygon3D received non-planar points. The polygon still renders, ` +
      `triangulated from its flat projection, so it shows up folded across ` +
      `the surface. If that is not intended, keep each polygon's vertices ` +
      `coplanar.`
  );
}

function buildStrokeGeometry(polygon: readonly Vec3[]): LineGeometry {
  const positions: number[] = [];
  for (const point of polygon) {
    positions.push(point.x, point.y, point.z);
  }
  positions.push(polygon[0].x, polygon[0].y, polygon[0].z);

  const geometry = new LineGeometry();
  geometry.setPositions(positions);
  return geometry;
}

function shouldShowStroke(item: ItemSnapshot<"polygon3d">): boolean {
  return item.strokeThickness > 0 && item.strokeOpacity > 0;
}

function createStrokes(item: ItemSnapshot<"polygon3d">): Polygon3DStrokeObject[] {
  if (!shouldShowStroke(item)) return [];

  const strokes: Polygon3DStrokeObject[] = [];
  for (const polygon of normalizePolygons(item.points)) {
    if (polygon.length < 2) continue;

    const geometry = buildStrokeGeometry(polygon);
    const material = new LineMaterial({
      color: checkedColor(item.strokeColor, "Polygon3D.strokeColor"),
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

function disposeStrokes(
  strokes: Polygon3DStrokeObject[],
  threeScene: THREE.Object3D
): void {
  for (const stroke of strokes) {
    threeScene.remove(stroke.mesh);
    stroke.geometry.dispose();
    stroke.material.dispose();
  }
}

export const polygon3dRenderer: ItemRenderer<"polygon3d"> = {
  create(
    item: ItemSnapshot<"polygon3d">,
    threeScene: THREE.Object3D
  ): ThreeSceneTypes["polygon3d"] {
    const { geometry, nonPlanar } = buildFillGeometry(item.points);
    if (nonPlanar) warnNonPlanar();
    const material = new THREE.MeshPhongMaterial({
      color: checkedColor(item.color, "Polygon3D.color"),
      side: THREE.DoubleSide,
      specular: 0xaaaaaa,
      shininess: 5,
    });
    applyOpacityMaterialState(material, item.opacity);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = item.visible;
    mesh.userData.itemId = item.id;
    threeScene.add(mesh);

    const strokes = createStrokes(item);
    for (const stroke of strokes) threeScene.add(stroke.mesh);

    return {
      kind: "polygon3d",
      geometry,
      material,
      mesh,
      strokes,
      warnedNonPlanar: nonPlanar,
    };
  },

  update(
    item: ItemSnapshot<"polygon3d">,
    obj: ThreeSceneTypes["polygon3d"],
    threeScene: THREE.Object3D
  ): void {
    obj.material.color.set(checkedColor(item.color, "Polygon3D.color"));
    applyOpacityMaterialState(obj.material, item.opacity);
    obj.mesh.visible = item.visible;

    obj.geometry.dispose();
    const { geometry, nonPlanar } = buildFillGeometry(item.points);
    if (nonPlanar && !obj.warnedNonPlanar) warnNonPlanar();
    obj.warnedNonPlanar = nonPlanar;
    obj.geometry = geometry;
    obj.mesh.geometry = obj.geometry;

    disposeStrokes(obj.strokes, threeScene);
    obj.strokes = createStrokes(item);
    for (const stroke of obj.strokes) threeScene.add(stroke.mesh);
  },

  dispose(
    obj: ThreeSceneTypes["polygon3d"],
    threeScene: THREE.Object3D
  ): void {
    threeScene.remove(obj.mesh);
    obj.geometry.dispose();
    obj.material.dispose();

    disposeStrokes(obj.strokes, threeScene);
  },
};
