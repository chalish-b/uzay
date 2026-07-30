import * as THREE from "three";
import type { ItemSnapshot } from "../../../types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./shared";
import { Z_CURVE_MARKER, Z_DEFAULT } from "./shared";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { checkedColor } from "../../../../shared/types/colors";
import { getWorldPerPixel, chainOnBeforeRender } from "../screen-space";
import { dashPatternPx } from "../../../../shared/math/dash-pattern";
import {
  createFunctionSamplingPlan,
  planFitsViewport,
  sampleFunctionGeometry,
  type FunctionEndpointMarker,
  type FunctionGeometry,
  type FunctionSamplingPlan,
} from "../../../math/function-sampling";

// dashSize/gapSize are compared against the line distance scaled by dashScale.
// The distances are world units (computeLineDistances, cumulative along the
// sampled segments), and layout() sets dashScale to pixels-per-world-unit, so
// the pattern here is CSS pixels: the same unit as linewidth, constant on
// screen at any zoom.
function applyDash(
  material: LineMaterial,
  item: ItemSnapshot<"function2d">
): void {
  material.dashed = item.dashed;
  if (item.dashed) {
    const { dashPx, gapPx } = dashPatternPx(item.thickness);
    material.dashSize = dashPx;
    material.gapSize = gapPx;
  }
  material.needsUpdate = true;
}

const MARKER_SEGMENTS = 48;
// Floor for the hollow ring's inner radius, as a fraction of the marker
// radius, so a thick stroke on a small marker can't fill it into a disc.
const MIN_INNER_RATIO = 0.15;

function buildGeometry(
  item: ItemSnapshot<"function2d">,
  plan: FunctionSamplingPlan
): {
  geometry: LineSegmentsGeometry;
  hasSegments: boolean;
  markers: FunctionEndpointMarker[];
} {
  const sampled: FunctionGeometry = sampleFunctionGeometry(item, plan);
  const positions: number[] = [];

  for (const run of sampled.runs) {
    for (let i = 0; i < run.length - 1; i++) {
      positions.push(
        run[i].x,
        run[i].y,
        Z_DEFAULT,
        run[i + 1].x,
        run[i + 1].y,
        Z_DEFAULT
      );
    }
  }

  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(positions);
  return {
    geometry,
    hasSegments: positions.length > 0,
    markers: sampled.markers,
  };
}

// Marker meshes are built at unit outer radius; each frame onBeforeRender
// scales them so the rendered radius is exactly `userData.radius` CSS
// pixels, the same scheme point2d uses.
function buildMarkerMesh(
  item: ItemSnapshot<"function2d">,
  marker: FunctionEndpointMarker
): THREE.Mesh {
  const r = item.markerRadius;
  let geometry: THREE.BufferGeometry;
  if (marker.style === "closed") {
    geometry = new THREE.CircleGeometry(1, MARKER_SEGMENTS);
  } else {
    const half = r > 0 ? item.thickness / 2 / r : 0;
    const inner = Math.max(MIN_INNER_RATIO, 1 - half);
    geometry = new THREE.RingGeometry(inner, 1 + half, MARKER_SEGMENTS);
  }
  const material = new THREE.MeshBasicMaterial({
    color: checkedColor(item.color, "Function2D.color"),
    transparent: item.opacity < 1,
    opacity: item.opacity,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(marker.x, marker.y, Z_CURVE_MARKER);
  mesh.userData.itemId = item.id;
  mesh.userData.radius = r;
  chainOnBeforeRender(mesh, onBeforeRenderMarker);
  return mesh;
}

function disposeMarkers(obj: ThreeSceneTypes["function2d"]): void {
  for (const mesh of obj.markerMeshes) {
    obj.markerGroup.remove(mesh);
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  }
  obj.markerMeshes = [];
}

function applyVisibility(
  item: ItemSnapshot<"function2d">,
  obj: ThreeSceneTypes["function2d"]
): void {
  obj.mesh.visible = item.visible && obj.hasSegments;
  obj.markerGroup.visible = item.visible && obj.markerMeshes.length > 0;
}

// Sampling is viewport-dependent (screen-space tolerance, view-window
// clipping), so geometry and markers are built in layout() rather than
// create()/update(). Those two only reset the stored plan; layout() rebuilds
// whenever the plan is missing or no longer fits the viewport.
export const function2dRenderer: ItemRenderer<"function2d"> = {
  create(
    item: ItemSnapshot<"function2d">,
    threeScene: THREE.Object3D
  ): ThreeSceneTypes["function2d"] {
    const geometry = new LineSegmentsGeometry();
    geometry.setPositions([]);
    const material = new LineMaterial({
      color: checkedColor(item.color, "Function2D.color"),
      linewidth: item.thickness,
      transparent: item.opacity < 1,
      opacity: item.opacity,
    });
    applyDash(material, item);
    const mesh = new LineSegments2(geometry, material);
    mesh.visible = false;
    mesh.userData.itemId = item.id;
    threeScene.add(mesh);
    const markerGroup = new THREE.Group();
    markerGroup.visible = false;
    threeScene.add(markerGroup);
    return {
      kind: "function2d",
      geometry,
      material,
      mesh,
      markerGroup,
      markerMeshes: [],
      plan: null,
      hasSegments: false,
    };
  },

  update(item: ItemSnapshot<"function2d">, obj: ThreeSceneTypes["function2d"]): void {
    obj.material.color.set(checkedColor(item.color, "Function2D.color"));
    obj.material.linewidth = item.thickness;
    obj.material.opacity = item.opacity;
    obj.material.transparent = item.opacity < 1;
    applyDash(obj.material, item);
    applyVisibility(item, obj);
    obj.plan = null;
  },

  layout(item: ItemSnapshot<"function2d">, obj: ThreeSceneTypes["function2d"], ctx): void {
    if (item.dashed && ctx.viewport.worldPerPixel > 0) {
      obj.material.dashScale = 1 / ctx.viewport.worldPerPixel;
    }

    if (obj.plan && planFitsViewport(item, obj.plan, ctx.viewport)) return;

    const plan = createFunctionSamplingPlan(item, ctx.viewport);
    const built = buildGeometry(item, plan);
    obj.geometry.dispose();
    obj.geometry = built.geometry;
    obj.mesh.geometry = built.geometry;
    obj.hasSegments = built.hasSegments;
    if (item.dashed) obj.mesh.computeLineDistances();

    disposeMarkers(obj);
    obj.markerMeshes = built.markers.map((marker) => {
      const mesh = buildMarkerMesh(item, marker);
      obj.markerGroup.add(mesh);
      return mesh;
    });

    obj.plan = plan;
    applyVisibility(item, obj);
  },

  dispose(obj: ThreeSceneTypes["function2d"], threeScene: THREE.Object3D): void {
    disposeMarkers(obj);
    threeScene.remove(obj.markerGroup);
    threeScene.remove(obj.mesh);
    obj.geometry.dispose();
    obj.material.dispose();
  },
};

function onBeforeRenderMarker(
  this: THREE.Object3D,
  renderer: THREE.WebGLRenderer,
  camera: THREE.Camera
) {
  if (!(camera as THREE.OrthographicCamera).isOrthographicCamera) return;
  const wpp = getWorldPerPixel(renderer, camera as THREE.OrthographicCamera);
  const s = (this.userData.radius as number) * wpp;
  this.scale.set(s, s, 1);
}
