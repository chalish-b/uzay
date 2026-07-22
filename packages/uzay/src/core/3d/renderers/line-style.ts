import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import type {
  FlatStyleObjects,
  LineStyleObjects,
  TubeStyleObjects,
} from "./shared";
import { lineThicknessScaleDown } from "./shared";
import { applyOpacityMaterialState } from "./material-transparency";
import { checkedColor } from "../../shared/types/colors";
import type { Color } from "../../shared/types/colors";
import type { ItemId } from "../types/item-registry";
import type { LineStyle3D } from "../items/line3d";
import { dashPatternPx } from "../../shared/math/dash-pattern";

// The style-relevant fields shared by the line-like items (line3d,
// parametricfunction3d), as their snapshots expose them.
export type LineStyleItem = {
  id: ItemId;
  color: Color;
  thickness: number;
  opacity: number;
  style: LineStyle3D;
  dashed: boolean;
  visible: boolean;
};

// Flat dash lengths are world units along the line, derived from the shared
// pixel pattern with the same scale-down that maps thickness to tube radius,
// so thicker lines get proportionally longer dashes.
function applyFlatDash(material: LineMaterial, item: LineStyleItem): void {
  material.dashed = item.dashed;
  if (item.dashed) {
    const { dashPx, gapPx } = dashPatternPx(item.thickness);
    material.dashSize = dashPx / lineThicknessScaleDown;
    material.gapSize = gapPx / lineThicknessScaleDown;
  }
  material.needsUpdate = true;
}

function toPositions(points: THREE.Vector3[]): number[] {
  const positions: number[] = [];
  for (const point of points) {
    positions.push(point.x, point.y, point.z);
  }
  return positions;
}

function createTube(
  points: THREE.Vector3[],
  tubularSegments: number,
  item: LineStyleItem,
  colorLabel: string
): TubeStyleObjects {
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(
    curve,
    tubularSegments,
    item.thickness / lineThicknessScaleDown
  );
  const material = new THREE.MeshPhongMaterial({
    color: checkedColor(item.color, colorLabel),
    specular: 0xaaaaaa,
    shininess: 5,
  });
  applyOpacityMaterialState(material, item.opacity);
  const mesh = new THREE.Mesh(geometry, material);
  return { style: "tube", curve, geometry, material, mesh };
}

function createFlat(
  points: THREE.Vector3[],
  item: LineStyleItem,
  colorLabel: string
): FlatStyleObjects {
  const geometry = new LineGeometry();
  geometry.setPositions(toPositions(points));
  const material = new LineMaterial({
    color: checkedColor(item.color, colorLabel),
    linewidth: item.thickness,
  });
  applyOpacityMaterialState(material, item.opacity);
  applyFlatDash(material, item);
  const mesh = new Line2(geometry, material);
  if (item.dashed) mesh.computeLineDistances();
  return { style: "flat", geometry, material, mesh };
}

export function createLineStyleObjects(
  points: THREE.Vector3[],
  tubularSegments: number,
  item: LineStyleItem,
  colorLabel: string,
  threeScene: THREE.Object3D
): LineStyleObjects {
  const impl =
    item.style === "flat"
      ? createFlat(points, item, colorLabel)
      : createTube(points, tubularSegments, item, colorLabel);
  impl.mesh.visible = item.visible;
  impl.mesh.userData.itemId = item.id;
  threeScene.add(impl.mesh);
  return impl;
}

// Recreates the scene objects outright when the style flips; otherwise
// updates the existing ones in place.
export function updateLineStyleObjects(
  obj: { impl: LineStyleObjects },
  points: THREE.Vector3[],
  tubularSegments: number,
  item: LineStyleItem,
  colorLabel: string,
  threeScene: THREE.Object3D
): void {
  if (obj.impl.style !== item.style) {
    disposeLineStyleObjects(obj.impl, threeScene);
    obj.impl = createLineStyleObjects(
      points,
      tubularSegments,
      item,
      colorLabel,
      threeScene
    );
    return;
  }

  if (obj.impl.style === "flat") {
    const impl = obj.impl;
    impl.material.color.set(checkedColor(item.color, colorLabel));
    impl.material.linewidth = item.thickness;
    applyOpacityMaterialState(impl.material, item.opacity);
    applyFlatDash(impl.material, item);
    impl.geometry.dispose();
    const geometry = new LineGeometry();
    geometry.setPositions(toPositions(points));
    impl.geometry = geometry;
    impl.mesh.geometry = geometry;
    if (item.dashed) impl.mesh.computeLineDistances();
  } else {
    const impl = obj.impl;
    impl.material.color.set(checkedColor(item.color, colorLabel));
    applyOpacityMaterialState(impl.material, item.opacity);
    // Unfortunately, we can't really change the radius of the tube geometry after creation. So we recreate it.
    // TODO: Only do this if the position or the thickness changes
    const curve = new THREE.CatmullRomCurve3(points);
    const oldGeometry = impl.geometry;
    const geometry = new THREE.TubeGeometry(
      curve,
      tubularSegments,
      item.thickness / lineThicknessScaleDown
    );
    impl.curve = curve;
    impl.geometry = geometry;
    impl.mesh.geometry = geometry;
    oldGeometry.dispose();
  }
  obj.impl.mesh.visible = item.visible;
}

export function disposeLineStyleObjects(
  impl: LineStyleObjects,
  threeScene: THREE.Object3D
): void {
  threeScene.remove(impl.mesh);
  impl.geometry.dispose();
  impl.material.dispose();
}
