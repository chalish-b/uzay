import * as THREE from "three";
import type { ItemSnapshot } from "../types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./shared";
import { applyOpacityMaterialState } from "./material-transparency";
import { checkedColor } from "../../shared/types/colors";
import type { Vec3 } from "../../shared/types/vec3";
import {
  createGridGeometry,
  sameGridTopology,
  updateGridPositions,
  type GridTopology,
} from "./grid-mesh";

type SurfaceFunc = (u: number, v: number) => Vec3;

function normalizedSamples(
  samples: number | [number, number]
): [number, number] {
  return Array.isArray(samples) ? samples : [samples, samples];
}

function topologyOf(
  item: ItemSnapshot<"parametricsurface3d">
): GridTopology {
  const [su, sv] = normalizedSamples(item.samples);
  return {
    // A wrapped axis needs at least 3 samples to enclose anything.
    nu: Math.max(Math.round(su), item.closedU ? 3 : 2),
    nv: Math.max(Math.round(sv), item.closedV ? 3 : 2),
    wrapU: item.closedU,
    wrapV: item.closedV,
  };
}

// How far the two boundary columns of a closed axis may disagree, relative to
// the extent of the probed points, before the closure counts as a mismatch.
const CLOSURE_TOLERANCE = 1e-3;
const CLOSURE_PROBE_FRACTIONS = [0.25, 0.5, 0.75];

// True when a closed axis's boundaries do not actually meet: f at the range's
// start and end disagree somewhere along the other axis.
function isSeamOpen(
  f: SurfaceFunc,
  axis: "u" | "v",
  uRange: [number, number],
  vRange: [number, number]
): boolean {
  const [seamRange, otherRange] =
    axis === "u" ? [uRange, vRange] : [vRange, uRange];

  const probes: { start: Vec3; end: Vec3 }[] = CLOSURE_PROBE_FRACTIONS.map(
    (fraction) => {
      const t = otherRange[0] + (otherRange[1] - otherRange[0]) * fraction;
      return axis === "u"
        ? { start: f(seamRange[0], t), end: f(seamRange[1], t) }
        : { start: f(t, seamRange[0]), end: f(t, seamRange[1]) };
    }
  );

  const points = probes.flatMap((probe) => [probe.start, probe.end]);
  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (const p of points) {
    cx += p.x;
    cy += p.y;
    cz += p.z;
  }
  cx /= points.length;
  cy /= points.length;
  cz /= points.length;

  let extent = 0;
  for (const p of points) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const dz = p.z - cz;
    extent = Math.max(extent, Math.sqrt(dx * dx + dy * dy + dz * dz));
  }
  if (extent === 0) return false;

  let gap = 0;
  for (const probe of probes) {
    const dx = probe.start.x - probe.end.x;
    const dy = probe.start.y - probe.end.y;
    const dz = probe.start.z - probe.end.z;
    gap = Math.max(gap, Math.sqrt(dx * dx + dy * dy + dz * dz));
  }
  return gap > extent * CLOSURE_TOLERANCE;
}

// Warned when a closed axis crosses from meeting to not meeting, once per
// crossing, so a reactive surface animating while mismatched does not flood
// the console.
function warnSeamOpen(axis: "u" | "v"): void {
  const flag = axis === "u" ? "closedU" : "closedV";
  const range = axis === "u" ? "uRange" : "vRange";
  console.warn(
    `[Uzay] ParametricSurface3D has ${flag} set, but f at the two ends of ` +
      `${range} does not meet. The seam still renders, stitched across the ` +
      `gap. If that is not intended, check the parametrization or set ` +
      `${flag} to false.`
  );
}

function checkSeams(
  item: ItemSnapshot<"parametricsurface3d">,
  obj: { warnedClosedU: boolean; warnedClosedV: boolean }
): void {
  const openU =
    item.closedU && isSeamOpen(item.f, "u", item.uRange, item.vRange);
  if (openU && !obj.warnedClosedU) warnSeamOpen("u");
  obj.warnedClosedU = openU;

  const openV =
    item.closedV && isSeamOpen(item.f, "v", item.uRange, item.vRange);
  if (openV && !obj.warnedClosedV) warnSeamOpen("v");
  obj.warnedClosedV = openV;
}

export const parametricSurface3dRenderer: ItemRenderer<"parametricsurface3d"> =
  {
    create(
      item: ItemSnapshot<"parametricsurface3d">,
      threeScene: THREE.Object3D
    ): ThreeSceneTypes["parametricsurface3d"] {
      const topology = topologyOf(item);
      const geometry = createGridGeometry(
        topology,
        item.uRange,
        item.vRange,
        item.f
      );
      const material = new THREE.MeshPhongMaterial({
        color: checkedColor(item.color, "ParametricSurface3D.color"),
        specular: 0xaaaaaa,
        shininess: 5,
        side: THREE.DoubleSide,
        transparent: item.opacity < 1,
        opacity: item.opacity,
        depthWrite: item.opacity >= 1,
        wireframe: item.wireframe,
      });
      applyOpacityMaterialState(material, item.opacity);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = item.visible;
      mesh.userData.itemId = item.id;
      threeScene.add(mesh);

      const obj: ThreeSceneTypes["parametricsurface3d"] = {
        kind: "parametricsurface3d",
        geometry,
        material,
        mesh,
        topology,
        warnedClosedU: false,
        warnedClosedV: false,
      };
      checkSeams(item, obj);
      return obj;
    },

    update(
      item: ItemSnapshot<"parametricsurface3d">,
      obj: ThreeSceneTypes["parametricsurface3d"]
    ): void {
      obj.material.color.set(
        checkedColor(item.color, "ParametricSurface3D.color")
      );
      applyOpacityMaterialState(obj.material, item.opacity);
      obj.material.wireframe = item.wireframe;

      const topology = topologyOf(item);
      if (!sameGridTopology(topology, obj.topology)) {
        // Vertex count or weld pattern changed, must rebuild geometry
        obj.geometry.dispose();
        const geometry = createGridGeometry(
          topology,
          item.uRange,
          item.vRange,
          item.f
        );
        obj.geometry = geometry;
        obj.mesh.geometry = geometry;
        obj.topology = topology;
      } else {
        // Reuse buffers, just update positions
        updateGridPositions(
          obj.geometry,
          topology,
          item.uRange,
          item.vRange,
          item.f
        );
      }

      checkSeams(item, obj);
      obj.mesh.visible = item.visible;
    },

    dispose(
      obj: ThreeSceneTypes["parametricsurface3d"],
      threeScene: THREE.Object3D
    ): void {
      obj.geometry.dispose();
      obj.material.dispose();
      threeScene.remove(obj.mesh);
    },
  };
